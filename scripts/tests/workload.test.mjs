import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createWorkload, rankFromHistogram } from '../workload.mjs';

test('histogram ranks cross gaps and ties correctly (tooling, not C++)', () => {
  const histogram = Uint32Array.from([1, 0, 18, 1]);
  assert.equal(rankFromHistogram(histogram, 20, 50), 2);
  assert.equal(rankFromHistogram(histogram, 20, 95), 2);
  assert.equal(rankFromHistogram(histogram, 20, 99), 3);
  assert.equal(rankFromHistogram([1, 1], 2, 50), 0);
  assert.throws(() => rankFromHistogram([], 1, 50));
});

test('small hand-derived golden, determinism and tenfold prefix (no solver)', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'speed-demon-workload-test-'));
  try {
    const small = path.join(temporary, 'small');
    const manifest = createWorkload(small, 2);
    const bytes = fs.readFileSync(path.join(small, 'input.log'));
    assert.equal(bytes.toString(), '2024-02-28T00:00:00.000000Z GET /hot 200 0\n'
      + '2024-02-28T13:00:00.000001Z POST /hot 201 72781\n');
    const golden = { contract: 'local-v1', endpoints: [{ endpoint_hex: '2f686f74', count: 2,
      p50_us: 0, p95_us: 72781, p99_us: 72781 }], hours: [0, 13].map(hour => ({
      endpoint_hex: '2f686f74', hour_utc: `2024-02-28T${String(hour).padStart(2, '0')}:00:00Z`,
      requests: 1, errors: 0, rate_numerator: 0, rate_denominator: 1,
    })) };
    assert.equal(fs.readFileSync(path.join(small, 'expected-output.json'), 'utf8'), JSON.stringify(golden) + '\n');
    assert.equal(manifest.input.bytes, bytes.length);
    assert.equal(manifest.input.sha256, createHash('sha256').update(bytes).digest('hex'));
    assert.throws(() => createWorkload(small, 2));
    const normal = createWorkload(path.join(temporary, 'normal'), 200);
    const repeat = createWorkload(path.join(temporary, 'repeat'), 200);
    const tenfold = createWorkload(path.join(temporary, 'tenfold'), 2000);
    assert.deepEqual(normal.input, repeat.input);
    assert.deepEqual(normal.expectedOutput, repeat.expectedOutput);
    assert.equal(tenfold.records, normal.records * 10);
    assert.equal(tenfold.aggregateTypedArrayBytes, normal.aggregateTypedArrayBytes);
    const first = fs.readFileSync(path.join(temporary, 'normal/input.log'));
    const extended = fs.readFileSync(path.join(temporary, 'tenfold/input.log'));
    assert.ok(extended.subarray(0, first.length).equals(first));
    assert.equal(extended.toString().trimEnd().split('\n').length, 2000);
    const output = JSON.parse(fs.readFileSync(path.join(temporary, 'tenfold/expected-output.json')));
    assert.equal(output.endpoints.reduce((n, group) => n + group.count, 0), 2000);
    assert.equal(output.hours.reduce((n, group) => n + group.requests, 0), 2000);
    // Independent materializing oracle for the small generated input: no bins,
    // formulas or generator aggregation state participate in this comparison.
    const groups = new Map(), hours = new Map();
    for (const line of extended.toString().trimEnd().split('\n')) {
      const [timestamp, , name, status, latency] = line.split(' ');
      const endpoint_hex = Buffer.from(name).toString('hex');
      if (!groups.has(endpoint_hex)) groups.set(endpoint_hex, []);
      groups.get(endpoint_hex).push(Number(latency));
      const hour_utc = timestamp.slice(0, 13) + ':00:00Z';
      const key = `${endpoint_hex}|${hour_utc}`;
      if (!hours.has(key)) hours.set(key, { endpoint_hex, hour_utc, requests: 0, errors: 0 });
      const group = hours.get(key);
      group.requests++;
      group.errors += Number(status) >= 500 && Number(status) <= 599 ? 1 : 0;
    }
    const expectedEndpoints = [...groups].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([endpoint_hex, values]) => {
        values.sort((a, b) => a - b);
        return { endpoint_hex, count: values.length,
          p50_us: values[Math.ceil(0.50 * values.length) - 1],
          p95_us: values[Math.ceil(0.95 * values.length) - 1],
          p99_us: values[Math.ceil(0.99 * values.length) - 1] };
      });
    const expectedHours = [...hours].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([, group]) => ({ ...group, rate_numerator: group.errors, rate_denominator: group.requests }));
    assert.deepEqual(output, { contract: 'local-v1', endpoints: expectedEndpoints, hours: expectedHours });
  } finally {
    assert.equal(path.dirname(temporary), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temporary).startsWith('speed-demon-workload-test-'));
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
