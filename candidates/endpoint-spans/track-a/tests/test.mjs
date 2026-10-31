#!/usr/bin/env node

// Independent black-box checks for the expressly provisional local-v1 contract.
// This is not an organizer specification or an official benchmark.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { assertNoSanitizerDiagnostic } from '../../scripts/lib/verification.mjs';

const executableArgument = process.argv[2];
const selfCheck = executableArgument === '--self-check';
if (!executableArgument) {
  process.stderr.write('Usage: node track-a/tests/test.mjs <executable> [prefix arguments...]\n'
    + '       node track-a/tests/test.mjs --self-check\n');
  process.exit(2);
}
if (selfCheck && process.argv.length !== 3) {
  process.stderr.write('--self-check takes no additional arguments\n');
  process.exit(2);
}

const executable = selfCheck ? null : path.isAbsolute(executableArgument)
  || executableArgument.includes('/')
  || executableArgument.includes('\\')
  ? path.resolve(executableArgument)
  : executableArgument;
const prefixArguments = process.argv.slice(3);
const temporaryRoot = selfCheck ? null
  : fs.mkdtempSync(path.join(os.tmpdir(), 'speed-demon-a-tests-'));
let serial = 0;
let passed = 0;
let skipped = 0;
let currentCase = selfCheck ? 'oracle self-check' : 'initialization';

function caseDirectory(name) {
  currentCase = name;
  const directory = path.join(temporaryRoot, String(++serial).padStart(4, '0'));
  fs.mkdirSync(directory);
  return directory;
}

function invoke(arguments_, directory) {
  assert.ok(!selfCheck, 'Oracle self-check must never start a child process');
  const result = spawnSync(executable, [...prefixArguments, ...arguments_], {
    cwd: directory,
    encoding: null,
    timeout: 15_000,
    maxBuffer: 2 * 1024 * 1024,
    windowsHide: true,
    env: { ...process.env,
      ASAN_OPTIONS: 'halt_on_error=1:abort_on_error=1:detect_leaks=1',
      UBSAN_OPTIONS: 'halt_on_error=1:print_stacktrace=1' },
  });
  if (result.error) {
    throw new Error(`Process could not complete: ${result.error.message}`);
  }
  if (result.signal) {
    throw new Error(`Process terminated by ${result.signal}`);
  }
  assertNoSanitizerDiagnostic(result.stderr);
  return result;
}

function brief(bytes) {
  return Buffer.from(bytes ?? '').toString('utf8').slice(0, 800);
}

function assertFailure(result) {
  assert.equal(result.status, 1, 'Invalid request did not return the solver error status');
  assert.ok(result.stderr.length > 0, 'Failure did not explain itself on stderr');
  assert.match(result.stderr.toString('utf8'), /^error: /, 'Failure was not a solver diagnostic');
  assert.equal(result.stdout.length, 0, 'Failure wrote to stdout');
}

function contractArguments(inputPath, outputPath, bufferSize) {
  const arguments_ = [
    '--contract', 'local-v1',
    '--input', inputPath,
    '--output', outputPath,
  ];
  if (bufferSize !== undefined) {
    arguments_.push('--buffer-size', String(bufferSize));
  }
  return arguments_;
}

function firstDifference(expected, actual) {
  let index = 0;
  while (index < expected.length && index < actual.length && expected[index] === actual[index]) {
    ++index;
  }
  const start = Math.max(0, index - 50);
  return `First byte difference at ${index}; lengths ${expected.length}/${actual.length}; `
    + `expected ${JSON.stringify(expected.subarray(start, index + 100).toString('utf8'))}; `
    + `actual ${JSON.stringify(actual.subarray(start, index + 100).toString('utf8'))}`;
}

// The oracle intentionally materializes complete lines, records and sorted arrays.
// It is only called with inputs constructed to be legal by the tests. It does not
// duplicate the implementation's bounded parser or attempt malformed-input recovery.
function oracle(input) {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (bytes.length === 0) {
    return Buffer.from('{"contract":"local-v1","endpoints":[],"hours":[]}\n');
  }
  const lines = bytes.toString('latin1').split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();
  const endpoints = new Map();
  const hours = new Map();
  for (const line of lines) {
    const fields = line.split(/ +/);
    assert.equal(fields.length, 5, 'Test oracle received a malformed fixture');
    const [timestamp, , endpoint, statusText, latencyText] = fields;
    const endpointHex = Buffer.from(endpoint, 'latin1').toString('hex');
    if (!endpoints.has(endpointHex)) endpoints.set(endpointHex, []);
    endpoints.get(endpointHex).push(Number(latencyText));
    const hour = `${timestamp.slice(0, 13)}:00:00Z`;
    const key = `${endpointHex}|${hour}`;
    if (!hours.has(key)) {
      hours.set(key, { endpoint_hex: endpointHex, hour_utc: hour, requests: 0, errors: 0 });
    }
    const aggregate = hours.get(key);
    ++aggregate.requests;
    if (Number(statusText) >= 500 && Number(statusText) <= 599) ++aggregate.errors;
  }
  const compareEndpoint = (left, right) => Buffer.compare(
    Buffer.from(left, 'hex'), Buffer.from(right, 'hex'),
  );
  const endpointOutput = [...endpoints.entries()]
    .sort(([left], [right]) => compareEndpoint(left, right))
    .map(([endpointHex, values]) => {
      values.sort((left, right) => left - right);
      return {
        endpoint_hex: endpointHex,
        count: values.length,
        p50_us: values[Math.ceil(values.length * 50 / 100) - 1],
        p95_us: values[Math.ceil(values.length * 95 / 100) - 1],
        p99_us: values[Math.ceil(values.length * 99 / 100) - 1],
      };
    });
  const hourOutput = [...hours.values()]
    .sort((left, right) => compareEndpoint(left.endpoint_hex, right.endpoint_hex)
      || (left.hour_utc < right.hour_utc ? -1 : left.hour_utc > right.hour_utc ? 1 : 0))
    .map(({ endpoint_hex, hour_utc, requests, errors }) => ({
      endpoint_hex, hour_utc, requests, errors,
      rate_numerator: errors,
      rate_denominator: requests,
    }));
  return Buffer.from(`${JSON.stringify({
    contract: 'local-v1', endpoints: endpointOutput, hours: hourOutput,
  })}\n`);
}

function success(name, input, options = {}) {
  const directory = caseDirectory(name);
  const inputPath = path.join(directory, 'input with spaces.log');
  const outputPath = path.join(directory, 'output with spaces.json');
  const inputBytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  fs.writeFileSync(inputPath, inputBytes);
  const expected = options.expected ?? oracle(inputBytes);
  const result = invoke(contractArguments(inputPath, outputPath, options.bufferSize), directory);
  assert.equal(result.status, 0, `Valid input failed: ${brief(result.stderr)}`);
  assert.equal(result.stdout.length, 0, 'Successful run wrote to stdout');
  assert.ok(fs.existsSync(outputPath), 'Required output file was not created');
  const actual = fs.readFileSync(outputPath);
  let parsed;
  try {
    parsed = JSON.parse(actual.toString('utf8'));
  } catch (error) {
    throw new Error(`Output is not JSON: ${error.message}; ${brief(actual)}`);
  }
  if (!isDeepStrictEqual(parsed, JSON.parse(expected.toString('utf8')))) {
    throw new Error(`Parsed output differs. ${firstDifference(expected, actual)}`);
  }
  if (!actual.equals(expected)) {
    throw new Error(`Output bytes differ. ${firstDifference(expected, actual)}`);
  }
  assert.ok(fs.readFileSync(inputPath).equals(inputBytes), 'Run modified its input');
  ++passed;
  return actual;
}

function invalidInput(name, input, bufferSize = 3) {
  const directory = caseDirectory(name);
  const inputPath = path.join(directory, 'input.log');
  const outputPath = path.join(directory, 'output.json');
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  fs.writeFileSync(inputPath, bytes);
  const result = invoke(contractArguments(inputPath, outputPath, bufferSize), directory);
  assertFailure(result);
  assert.ok(fs.readFileSync(inputPath).equals(bytes), 'Rejected input was modified');
  ++passed;
}

function invalidCli(name, makeArguments) {
  const directory = caseDirectory(name);
  const inputPath = path.join(directory, 'input.log');
  const outputPath = path.join(directory, 'output.json');
  fs.writeFileSync(inputPath, baseLine);
  assertFailure(invoke(makeArguments(inputPath, outputPath, directory), directory));
  assert.equal(fs.readFileSync(inputPath, 'utf8'), baseLine, 'CLI failure modified input');
  ++passed;
}

function aliasFailure(name, prepareAlias) {
  const directory = caseDirectory(name);
  const inputPath = path.join(directory, 'input.log');
  fs.writeFileSync(inputPath, baseLine);
  let outputPath;
  try {
    outputPath = prepareAlias(inputPath, directory);
  } catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP', 'ENOSYS'].includes(error.code)) {
      ++skipped;
      process.stdout.write(`SKIP ${name}: filesystem cannot create this alias (${error.code})\n`);
      return;
    }
    throw error;
  }
  assertFailure(invoke(contractArguments(inputPath, outputPath, 1), directory));
  assert.equal(fs.readFileSync(inputPath, 'utf8'), baseLine, 'Alias rejection destroyed input');
  assert.equal(fs.readFileSync(path.resolve(directory, outputPath), 'utf8'), baseLine,
    'Alias rejection modified the same file through another name');
  ++passed;
}

function record(timestamp, method, endpoint, status, latency, spaces = 1) {
  return Buffer.concat([
    Buffer.from(timestamp), Buffer.alloc(spaces, 0x20),
    Buffer.isBuffer(method) ? method : Buffer.from(method), Buffer.alloc(spaces, 0x20),
    Buffer.isBuffer(endpoint) ? endpoint : Buffer.from(endpoint), Buffer.alloc(spaces, 0x20),
    Buffer.from(String(status)), Buffer.alloc(spaces, 0x20), Buffer.from(String(latency)),
  ]);
}

function recordsWithTerminators(records, chooseTerminator, finalTerminated = true) {
  return Buffer.concat(records.flatMap((line, index) => {
    const terminal = index < records.length - 1 || finalTerminated;
    return terminal ? [line, Buffer.from(chooseTerminator(index))] : [line];
  }));
}

const baseTimestamp = '2024-02-29T12:34:56.123456Z';
const baseLine = `${baseTimestamp} GET /ok 200 7\n`;

try {
  const emptyGolden = Buffer.from('{"contract":"local-v1","endpoints":[],"hours":[]}\n');
  const goldenRows = [
    '2024-02-29T23:59:59.999999Z GET /a 499 1',
    '2024-02-29T23:00:00.000000Z POST /a 500 2',
    '2024-03-01T00:00:00.000000Z PATCH /a 599 100',
    '2024-02-29T23:30:00.000000Z GET /a 600 4294967295',
    '2024-02-29T22:00:00.000000Z GET /b 65535 0',
    '2024-02-29T22:59:59.000000Z GET /b 0 7',
  ].map((line) => Buffer.from(line));
  const goldenInput = recordsWithTerminators(goldenRows, (index) => index % 2 ? '\n' : '\r\n', false);
  const goldenOutput = Buffer.from(
    '{"contract":"local-v1","endpoints":['
    + '{"endpoint_hex":"2f61","count":4,"p50_us":2,"p95_us":4294967295,"p99_us":4294967295},'
    + '{"endpoint_hex":"2f62","count":2,"p50_us":0,"p95_us":7,"p99_us":7}],'
    + '"hours":['
    + '{"endpoint_hex":"2f61","hour_utc":"2024-02-29T23:00:00Z","requests":3,"errors":1,"rate_numerator":1,"rate_denominator":3},'
    + '{"endpoint_hex":"2f61","hour_utc":"2024-03-01T00:00:00Z","requests":1,"errors":1,"rate_numerator":1,"rate_denominator":1},'
    + '{"endpoint_hex":"2f62","hour_utc":"2024-02-29T22:00:00Z","requests":2,"errors":0,"rate_numerator":0,"rate_denominator":2}]}\n',
  );
  assert.ok(oracle(goldenInput).equals(goldenOutput), 'Independent oracle failed hand-derived golden');
  assert.ok(oracle(Buffer.alloc(0)).equals(emptyGolden), 'Independent oracle failed empty golden');
  const singletonInput = record('0001-01-01T00:00:00.000000Z', 'M',
    Buffer.from([0x80]), 599, 4_294_967_295);
  const singletonGolden = Buffer.from(
    '{"contract":"local-v1","endpoints":['
    + '{"endpoint_hex":"80","count":1,"p50_us":4294967295,"p95_us":4294967295,"p99_us":4294967295}],'
    + '"hours":['
    + '{"endpoint_hex":"80","hour_utc":"0001-01-01T00:00:00Z","requests":1,"errors":1,"rate_numerator":1,"rate_denominator":1}]}\n',
  );
  assert.ok(oracle(singletonInput).equals(singletonGolden), 'Independent oracle failed singleton golden');
  if (selfCheck) {
    process.stdout.write('PASS 3 hand-derived fixtures; oracle self-check only; solver not tested\n');
  } else {
  success('empty input', Buffer.alloc(0), { expected: emptyGolden });
  success('hand-derived singleton with high-byte key', singletonInput, { expected: singletonGolden });
  success('hand-derived golden with mixed terminators and no final newline', goldenInput, {
    expected: goldenOutput,
  });
  // Size one crosses every byte boundary; all small sizes additionally exercise
  // different combinations of record, field, CR/LF and numeric carry state.
  for (let bufferSize = 1; bufferSize <= 64; ++bufferSize) {
    success(`golden, buffer size ${bufferSize}`, goldenInput, { expected: goldenOutput, bufferSize });
  }
  success('maximum permitted buffer size', goldenInput, {
    expected: goldenOutput, bufferSize: 16_777_216,
  });
  success('identical rerun is deterministic', goldenInput, { expected: goldenOutput, bufferSize: 7 });
  success('record permutation preserves results',
    recordsWithTerminators([...goldenRows].reverse(), () => '\n'), {
      expected: goldenOutput, bufferSize: 11,
    });

  for (const count of [1, 2, 3, 4, 19, 20, 21, 99, 100, 101]) {
    const rows = Array.from({ length: count }, (_, index) =>
      record(baseTimestamp, 'GET', '/rank', 200, count - index));
    success(`nearest-rank transitions, group size ${count}`,
      recordsWithTerminators(rows, () => '\n'), { bufferSize: 5 });
  }
  success('equal latencies and extreme outlier',
    recordsWithTerminators([0, 0, 0, 0, 0, 4_294_967_295].map((latency) =>
      record(baseTimestamp, 'GET', '/equal', 599, latency)), () => '\n'),
    { bufferSize: 2 });
  success('legal Gregorian and hour boundaries',
    recordsWithTerminators([
      '0001-01-01T00:00:00.000000Z',
      '1999-12-31T23:59:59.999999Z',
      '2000-02-29T00:00:00.000000Z',
      '2000-02-29T23:59:59.999999Z',
      '2000-03-01T00:00:00.000000Z',
      '2024-12-31T23:59:59.999999Z',
      '2025-01-01T00:00:00.000000Z',
      '9999-12-31T23:59:59.999999Z',
    ].map((timestamp) => record(timestamp, 'M', '/calendar', 500, 0)), () => '\r\n'),
    { bufferSize: 1 });
  success('multiple separators and decimal leading zeroes',
    record(baseTimestamp, 'GET', '/zeroes', `${'0'.repeat(100)}500`,
      `${'0'.repeat(100)}4294967295`, 4), { bufferSize: 3 });

  // These cases check byte identity; they do not force std::unordered_map hash
  // collisions. Full-key equality after a hash collision remains a review invariant.
  const byteEndpoints = [
    Buffer.from('/a'), Buffer.from('/aa'), Buffer.from('/A'), Buffer.from('/a?x=1'),
    Buffer.from([0x2f, 0x80]), Buffer.from([0x2f, 0xff]),
    Buffer.from([0x2f, 0xc3, 0xa9]), Buffer.from([0x2f, 0xe9]),
    Buffer.from([0x2f, 0xfe, 0x81]), Buffer.from([0x80]),
  ];
  success('raw-byte identity, unsigned sorting and high-byte method',
    recordsWithTerminators(byteEndpoints.map((endpoint, index) =>
      record(baseTimestamp, Buffer.from([0x4d, 0x80]), endpoint, 500, index)), () => '\n'),
    { bufferSize: 1 });
  success('very long endpoint spanning many reads',
    recordsWithTerminators([
      record(baseTimestamp, 'GET', `/${'x'.repeat(65_537)}`, 200, 1),
      record(baseTimestamp, 'GET', `/${'x'.repeat(65_536)}y`, 500, 2),
      record(baseTimestamp, 'GET', `/${'x'.repeat(65_537)}`, 599, 3),
    ], () => '\r\n', false), { bufferSize: 13 });

  let randomState = 0x6d2b79f5;
  function random32() {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return randomState >>> 0;
  }
  const randomBuffers = [1, 2, 3, 5, 7, 13, 27, 64, 4096];
  const randomDates = ['0001-01-01', '2000-02-29', '2024-02-29', '2024-12-31', '9999-12-31'];
  const randomStatuses = [0, 200, 499, 500, 501, 599, 600, 65535];
  for (let trial = 0; trial < 30; ++trial) {
    const rows = [];
    const count = 1 + random32() % 140;
    for (let index = 0; index < count; ++index) {
      const two = (value) => String(value).padStart(2, '0');
      const timestamp = `${randomDates[random32() % randomDates.length]}`
        + `T${two(random32() % 24)}:${two(random32() % 60)}:${two(random32() % 60)}.`
        + `${String(random32() % 1_000_000).padStart(6, '0')}Z`;
      rows.push(record(timestamp, index % 2 ? 'GET' : 'OTHER',
        byteEndpoints[random32() % byteEndpoints.length],
        randomStatuses[random32() % randomStatuses.length],
        random32(), 1 + random32() % 4));
    }
    const input = recordsWithTerminators(rows, () => random32() % 2 ? '\n' : '\r\n',
      random32() % 2 === 0);
    success(`fixed-seed randomized trial ${trial + 1}`, input, {
      bufferSize: randomBuffers[trial % randomBuffers.length],
    });
  }

  // Additional bounded stress shapes missing from the original small, single-
  // seed trials. All compare complete bytes with the materializing sort oracle.
  function seeded32(seed) {
    let state = seed >>> 0;
    return () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return state >>> 0;
    };
  }
  const stressTimestamp = hour => `2024-02-29T${String(hour % 24).padStart(2, '0')}:00:00.000000Z`;
  for (const seed of [1, 0x9e3779b9, 0xffffffff]) {
    const next = seeded32(seed);
    const rows = Array.from({ length: 4096 }, (_, index) => record(
      stressTimestamp(next()), 'GET', `/seed/${next() % 257}`, next() % 65536,
      index === 0 ? 0 : index === 1 ? 0xffffffff : next()));
    success(`multi-seed full-uint32 stress seed ${seed}`,
      recordsWithTerminators(rows, () => '\n'), { bufferSize: 4093 });
  }
  for (const endpoints of [32, 512, 4096]) {
    const next = seeded32(0x12345678);
    const rows = [];
    for (let endpoint = 0; endpoint < endpoints; endpoint++) {
      for (let hour = 0; hour < 4; hour++) {
        rows.push(record(stressTimestamp(hour), 'GET', `/growth/${endpoint}`, hour % 2 ? 599 : 200, next()));
      }
    }
    success(`growing cardinality: ${endpoints} endpoints, ${endpoints * 4} endpoint-hours`,
      recordsWithTerminators(rows, () => '\n'));
  }
  const sharedPrefix = `/${'shared-prefix/'.repeat(320)}`;
  success('128 long shared-prefix endpoint identities, repeated groups',
    recordsWithTerminators(Array.from({ length: 512 }, (_, i) => record(
      stressTimestamp(i % 3), 'GET', `${sharedPrefix}${String(i % 128).padStart(3, '0')}`,
      i % 2 ? 500 : 200, i % 7 ? i * 65537 : 0xffffffff)), () => '\n'), { bufferSize: 211 });
  const skewRandom = seeded32(0xa5a5a5a5);
  success('strongly skewed groups with full-range uint32 latencies',
    recordsWithTerminators(Array.from({ length: 16384 }, (_, i) => record(
      stressTimestamp(i % 24), 'POST', i % 100 ? '/hot' : `/cold/${i}`,
      i % 3 ? 200 : 599, skewRandom())), () => '\n'));
  for (const value of [0, 42, 0xffffffff]) {
    success(`pure equal-value group of 4096, value ${value}`,
      recordsWithTerminators(Array.from({ length: 4096 }, () => record(
        baseTimestamp, 'GET', '/equal-only', 200, value)), () => '\n'));
  }
  const orderedLatencies = Array.from({ length: 4096 }, (_, i) => Math.floor(i * 0xffffffff / 4095));
  for (const [label, values] of [['sorted', orderedLatencies], ['reversed', [...orderedLatencies].reverse()]]) {
    success(`${label} full-range group of 4096`, recordsWithTerminators(values.map(value =>
      record(baseTimestamp, 'GET', '/ordered', 500, value)), () => '\n'));
  }

  // Span ingestion must stop at the exact byte where scalar parsing would stop.
  // Exercise endpoint start/end on either side of read boundaries, not only
  // record boundaries. Keep the independent oracle and original 233 checks.
  for (const bufferSize of [1, 2, 7, 31, 32, 64, 127]) {
    for (const delta of [-1, 0, 1]) {
      const prefixLength = Buffer.byteLength(`${baseTimestamp} GET `);
      const endpointLength = (Math.ceil((prefixLength + 9) / bufferSize) + 1) * bufferSize
        + delta - prefixLength;
      const endpoint = Buffer.concat([Buffer.from('/span/'),
        Buffer.alloc(endpointLength - 8, 0x71), Buffer.from([0x80, 0xff])]);
      success(`endpoint spans, buffer ${bufferSize}, length delta ${delta}`,
        recordsWithTerminators([
          record(baseTimestamp, 'GET', endpoint, 500, 0),
          record(baseTimestamp, 'POST', Buffer.concat([endpoint, Buffer.from('x')]), 599, 0xffffffff),
          record(baseTimestamp, 'GET', endpoint, 200, 42),
        ], () => '\r\n', false), { bufferSize });
    }
  }
  {
    const line = record(baseTimestamp, 'GET', '/span-crlf', 200, 7);
    success('span path with CR at final buffer byte and LF in next read',
      Buffer.concat([line, Buffer.from('\r\n'), line, Buffer.from('\r\n')]),
      { bufferSize: line.length + 1 });
  }
  success('span accepts every high endpoint byte, final record has no newline',
    record(baseTimestamp, 'GET', Buffer.concat([Buffer.from('/high/'),
      Buffer.from(Array.from({ length: 128 }, (_, i) => i + 128))]), 599, 0xffffffff),
    { bufferSize: 17 });
  for (const bufferSize of [3, 4096]) {
    success(`span long shared prefix, buffer ${bufferSize}`,
      recordsWithTerminators([
        record(baseTimestamp, 'GET', `/${'s'.repeat(131071)}a`, 200, 0),
        record(baseTimestamp, 'GET', `/${'s'.repeat(131071)}b`, 599, 1),
        record(baseTimestamp, 'GET', `/${'s'.repeat(131071)}a`, 500, 0xffffffff),
      ], () => '\n', false), { bufferSize });
  }
  for (const byte of [...Array.from({ length: 32 }, (_, i) => i), 127]) {
    // LF/CR also terminate span scanning but must fail through record/CR state.
    for (const alignment of ['inside', 'next-read']) {
      const prefix = Buffer.from(`${baseTimestamp} GET /${'v'.repeat(70)}`);
      const bytes = Buffer.concat([prefix, Buffer.from([byte]), Buffer.from('tail 200 7\n')]);
      invalidInput(`span forbidden byte ${byte}, ${alignment}`, bytes,
        alignment === 'inside' ? bytes.length + 1 : prefix.length);
    }
  }
  invalidInput('span endpoint ending at EOF is still an incomplete record',
    `${baseTimestamp} GET /${'z'.repeat(4000)}`, 127);
  invalidInput('span endpoint CR followed by non-LF in next read',
    `${baseTimestamp} GET /span\rX 200 7\n`, Buffer.byteLength(`${baseTimestamp} GET /span\r`));

  const badTimestamps = [
    '0000-01-01T00:00:00.000000Z',
    '2024-00-01T00:00:00.000000Z',
    '2024-13-01T00:00:00.000000Z',
    '2024-01-00T00:00:00.000000Z',
    '2024-01-32T00:00:00.000000Z',
    '2024-04-31T00:00:00.000000Z',
    '2024-02-30T00:00:00.000000Z',
    '2023-02-29T00:00:00.000000Z',
    '1900-02-29T00:00:00.000000Z',
    '2100-02-29T00:00:00.000000Z',
    '2024-02-29T24:00:00.000000Z',
    '2024-02-29T00:60:00.000000Z',
    '2024-02-29T00:00:60.000000Z',
    '2024-02-29T00:00:00Z',
    '2024-02-29T00:00:00.00000Z',
    '2024-02-29T00:00:00.0000000Z',
    '2024-02-29T00:00:00.000000+00:00',
    '2024-02-29t00:00:00.000000Z',
    '2024-02-29T00:00:00.000000z',
    '2024/02/29T00:00:00.000000Z',
    '2024-02-29T00:00:00,000000Z',
    '10000-02-28T00:00:00.000000Z',
    '2024-02-29T00:00:00.00000xZ',
  ];
  for (const timestamp of badTimestamps) {
    invalidInput(`invalid timestamp ${timestamp}`, `${timestamp} GET /bad 200 1\n`);
  }
  for (const status of ['65536', '4294967295', '18446744073709551616', '-1', '+1', '1.0', '1e1', '0x1', 'NaN']) {
    invalidInput(`invalid status ${status}`, `${baseTimestamp} GET /bad ${status} 1\n`);
  }
  for (const latency of ['4294967296', '18446744073709551616', '9'.repeat(100), '-1', '+1', '1.0', '1e1', '0x1', 'NaN']) {
    invalidInput(`invalid latency ${latency}`, `${baseTimestamp} GET /bad 200 ${latency}\n`);
  }
  const malformedLines = [
    ['blank LF record', '\n'],
    ['blank CRLF record', '\r\n'],
    ['leading blank record', `\n${baseLine}`],
    ['blank record between valid records', `${baseLine}\n${baseLine}`],
    ['additional final newline', `${baseLine}\n`],
    ['leading space', ` ${baseLine}`],
    ['trailing space', `${baseLine.slice(0, -1)} \n`],
    ['four fields', `${baseTimestamp} GET /bad 200\n`],
    ['six fields', `${baseTimestamp} GET /bad 200 1 extra\n`],
    ['missing method', `${baseTimestamp}  /bad 200 1\n`],
    ['missing endpoint', `${baseTimestamp} GET  200 1\n`],
    ['tab separator', `${baseTimestamp}\tGET /bad 200 1\n`],
    ['vertical tab separator', `${baseTimestamp}\vGET /bad 200 1\n`],
    ['form-feed separator', `${baseTimestamp}\fGET /bad 200 1\n`],
    ['bare CR terminator', `${baseLine.slice(0, -1)}\r`],
    ['bare CR between records', `${baseLine.slice(0, -1)}\r${baseLine}`],
    ['double CR before LF', `${baseLine.slice(0, -1)}\r\r\n`],
    ['UTF-8 BOM', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(baseLine)])],
  ];
  for (const [name, input] of malformedLines) invalidInput(name, input, 1);
  {
    const directory = caseDirectory('malformed input preserves an existing output');
    const inputPath = path.join(directory, 'input.log');
    const outputPath = path.join(directory, 'output.json');
    const inputBytes = Buffer.from(`${baseLine}${baseTimestamp} GET /bad 200 overflow\n`);
    const previousOutput = Buffer.from([0x00, 0xff, 0x73, 0x61, 0x76, 0x65, 0x64, 0x0a]);
    fs.writeFileSync(inputPath, inputBytes);
    fs.writeFileSync(outputPath, previousOutput);
    assertFailure(invoke(contractArguments(inputPath, outputPath, 1), directory));
    assert.ok(fs.readFileSync(inputPath).equals(inputBytes), 'Malformed input was modified');
    assert.ok(fs.readFileSync(outputPath).equals(previousOutput),
      'Malformed input overwrote the existing output');
    ++passed;
  }
  for (const byte of [0, 1, 9, 11, 12, 13, 31, 127]) {
    invalidInput(`ASCII control ${byte} in method`,
      record(baseTimestamp, Buffer.from([0x47, byte, 0x54]), '/bad', 200, 1), 1);
    invalidInput(`ASCII control ${byte} in endpoint`,
      record(baseTimestamp, 'GET', Buffer.from([0x2f, byte, 0x78]), 200, 1), 1);
  }

  {
    const directory = caseDirectory('help succeeds without input or output');
    const result = invoke(['--help'], directory);
    assert.equal(result.status, 0, `Help failed: ${brief(result.stderr)}`);
    assert.equal(result.stderr.length, 0, 'Help wrote an error to stderr');
    const usage = result.stdout.toString('utf8');
    for (const required of ['--contract', 'local-v1', '--input', '--output', '--buffer-size']) {
      assert.ok(usage.includes(required), `Help did not explain ${required}`);
    }
    assert.equal(fs.readdirSync(directory).length, 0, 'Help created files');
    ++passed;
  }
  invalidCli('no command arguments', () => []);
  invalidCli('missing explicit contract', (input, output) => ['--input', input, '--output', output]);
  invalidCli('unsupported contract', (input, output) =>
    ['--contract', 'official', '--input', input, '--output', output]);
  invalidCli('missing input option', (_, output) => ['--contract', 'local-v1', '--output', output]);
  invalidCli('missing output option', (input) => ['--contract', 'local-v1', '--input', input]);
  invalidCli('missing final option value', (input, output) =>
    [...contractArguments(input, output), '--buffer-size']);
  invalidCli('unknown option', (input, output) =>
    [...contractArguments(input, output), '--unknown', '1']);
  invalidCli('unexpected positional argument', (input, output) =>
    [...contractArguments(input, output), 'unexpected']);
  invalidCli('duplicate contract option', (input, output) =>
    [...contractArguments(input, output), '--contract', 'local-v1']);
  invalidCli('duplicate input option', (input, output) =>
    [...contractArguments(input, output), '--input', input]);
  invalidCli('duplicate output option', (input, output) =>
    [...contractArguments(input, output), '--output', output]);
  invalidCli('duplicate buffer-size option', (input, output) =>
    [...contractArguments(input, output, 1), '--buffer-size', '2']);
  for (const bufferSize of ['0', '-1', '16777217', '999999999999999999999', 'abc', '1.5']) {
    invalidCli(`invalid buffer size ${bufferSize}`, (input, output) =>
      contractArguments(input, output, bufferSize));
  }
  invalidCli('input path does not exist', (_, output, directory) =>
    contractArguments(path.join(directory, 'absent.log'), output));
  invalidCli('input path is a directory', (_, output, directory) =>
    contractArguments(directory, output));
  invalidCli('output parent does not exist', (input, _, directory) =>
    contractArguments(input, path.join(directory, 'missing', 'output.json')));
  invalidCli('output path is a directory', (input, _, directory) =>
    contractArguments(input, directory));
  if (process.platform !== 'win32' && fs.existsSync('/dev/full')) {
    const deviceBefore = fs.statSync('/dev/full');
    invalidCli('special output device is rejected without removing it', (input) =>
      contractArguments(input, '/dev/full'));
    const deviceAfter = fs.statSync('/dev/full');
    assert.ok(deviceAfter.isCharacterDevice(), 'Special output device was changed');
    assert.equal(deviceAfter.ino, deviceBefore.ino, 'Special output device was replaced');
    assert.equal(deviceAfter.dev, deviceBefore.dev, 'Special output device identity changed');
  }
  {
    const directory = caseDirectory('output parent is an existing regular file');
    const inputPath = path.join(directory, 'input.log');
    const blockedParent = path.join(directory, 'existing-file');
    const parentBytes = Buffer.from('Preserve this regular file.\n');
    fs.writeFileSync(inputPath, baseLine);
    fs.writeFileSync(blockedParent, parentBytes);
    assertFailure(invoke(contractArguments(inputPath, path.join(blockedParent, 'output.json')), directory));
    assert.equal(fs.readFileSync(inputPath, 'utf8'), baseLine, 'Output failure modified the input');
    assert.ok(fs.readFileSync(blockedParent).equals(parentBytes), 'Output failure modified its parent file');
    ++passed;
  }

  aliasFailure('same input and output path', (input) => input);
  aliasFailure('relative path aliases the input', () => 'input.log');
  aliasFailure('hard-link output aliases the input', (input, directory) => {
    const alias = path.join(directory, 'hard-link.log');
    fs.linkSync(input, alias);
    return alias;
  });
  aliasFailure('symbolic-link output aliases the input', (input, directory) => {
    const alias = path.join(directory, 'symbolic-link.log');
    fs.symlinkSync(input, alias, 'file');
    return alias;
  });

  process.stdout.write(`PASS ${passed} sequential local-v1 checks; ${skipped} filesystem alias check(s) skipped.\n`);
  }
} catch (error) {
  process.stderr.write(`FAIL ${currentCase}: ${error.message}\n`);
  process.exitCode = 1;
} finally {
  // Only this invocation's freshly created child of os.tmpdir() is removed.
  if (temporaryRoot !== null) {
  const resolvedRoot = path.resolve(temporaryRoot);
  const resolvedTemp = path.resolve(os.tmpdir());
  if (path.dirname(resolvedRoot) !== resolvedTemp
    || !path.basename(resolvedRoot).startsWith('speed-demon-a-tests-')) {
    process.stderr.write(`Refusing cleanup outside the test temporary directory: ${resolvedRoot}\n`);
    process.exitCode = 1;
  } else {
    fs.rmSync(resolvedRoot, { recursive: true, force: true });
  }
  }
}
