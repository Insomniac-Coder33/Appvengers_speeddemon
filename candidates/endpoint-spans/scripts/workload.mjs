import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Local synthetic data only. The histogram oracle is independent of the C++
// implementation's full latency vectors and sort; it covers this finite alphabet.
const endpointCount = 1842;
const hourCount = 48;
const bins = 1024;
const values = Array.from({ length: bins }, (_, i) => i === 0 ? 0 : i === 1 ? 1
  : i === bins - 1 ? 4294967295 : i * 997);
const names = Array.from({ length: endpointCount }, (_, i) => i === 0 ? '/hot'
  : `/route/${String(i).padStart(4, '0')}/item`);
const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const statuses = [200, 201, 204, 400, 404, 429, 499, 500, 503, 599, 600, 65535];
const hourText = h => `2024-02-${h < 24 ? '28' : '29'}T${String(h % 24).padStart(2, '0')}:00:00Z`;

export function rankFromHistogram(histogram, count, percent) {
  if (!Number.isSafeInteger(count) || count < 1 || percent < 1 || percent > 100)
    throw new Error('Invalid local nearest-rank request');
  const rank = Math.ceil(count * percent / 100);
  let cumulative = 0;
  for (let bin = 0; bin < histogram.length; bin++) {
    cumulative += histogram[bin];
    if (cumulative >= rank) return bin;
  }
  throw new Error('Histogram does not contain its claimed count');
}

function sink(file) {
  const fd = fs.openSync(file, 'wx');
  const hash = createHash('sha256');
  let parts = [], pending = 0, bytes = 0;
  function flush() {
    if (!pending) return;
    const data = Buffer.from(parts.join(''));
    let offset = 0;
    while (offset < data.length) {
      const written = fs.writeSync(fd, data, offset, data.length - offset);
      if (written <= 0) throw new Error('Workload file write did not advance');
      offset += written;
    }
    hash.update(data);
    bytes += data.length;
    parts = []; pending = 0;
  }
  return {
    write(text) { parts.push(text); pending += text.length; if (pending >= 262144) flush(); },
    finish() { flush(); fs.closeSync(fd); return { bytes, sha256: hash.digest('hex') }; },
  };
}

export function createWorkload(directory, records) {
  if (!Number.isSafeInteger(records) || records < 1 || records > 100000000)
    throw new Error('Records must be an integer in 1..100000000');
  fs.mkdirSync(directory); // New directory required; never overwrite prior evidence.
  const counts = new Uint32Array(endpointCount);
  const histograms = new Uint32Array(endpointCount * bins);
  const requests = new Uint32Array(endpointCount * hourCount);
  const errors = new Uint32Array(endpointCount * hourCount);
  const input = sink(path.join(directory, 'input.log'));
  for (let i = 0; i < records; i++) {
    const endpoint = i % 10 < 6 ? 0 : 1 + ((i * 97 + 17) % (endpointCount - 1));
    const hour = (i * 13 + Math.floor(i / hourCount)) % hourCount;
    const bin = ((Math.imul(i, 73) ^ Math.imul(Math.floor(i / bins), 19)) >>> 0) & (bins - 1);
    const status = statuses[i % statuses.length];
    const timestamp = hourText(hour).slice(0, -1) + `.${String(i % 1000000).padStart(6, '0')}Z`;
    input.write(`${timestamp} ${methods[i % methods.length]} ${names[endpoint]} ${status} ${values[bin]}\n`);
    counts[endpoint]++;
    histograms[endpoint * bins + bin]++;
    requests[endpoint * hourCount + hour]++;
    if (status >= 500 && status < 600) errors[endpoint * hourCount + hour]++;
  }
  const inputIdentity = input.finish();
  const output = sink(path.join(directory, 'expected-output.json'));
  output.write('{"contract":"local-v1","endpoints":[');
  let endpointGroups = 0;
  for (let id = 0; id < endpointCount; id++) {
    if (!counts[id]) continue;
    const histogram = histograms.subarray(id * bins, (id + 1) * bins);
    if (endpointGroups++) output.write(',');
    output.write(JSON.stringify({ endpoint_hex: Buffer.from(names[id]).toString('hex'), count: counts[id],
      p50_us: values[rankFromHistogram(histogram, counts[id], 50)],
      p95_us: values[rankFromHistogram(histogram, counts[id], 95)],
      p99_us: values[rankFromHistogram(histogram, counts[id], 99)] }));
  }
  output.write('],"hours":[');
  let hourGroups = 0;
  for (let id = 0; id < endpointCount; id++) {
    for (let hour = 0; hour < hourCount; hour++) {
      const key = id * hourCount + hour;
      if (!requests[key]) continue;
      if (hourGroups++) output.write(',');
      output.write(JSON.stringify({ endpoint_hex: Buffer.from(names[id]).toString('hex'),
        hour_utc: hourText(hour), requests: requests[key], errors: errors[key],
        rate_numerator: errors[key], rate_denominator: requests[key] }));
    }
  }
  output.write(']}\n');
  const outputIdentity = output.finish();
  const manifest = {
    recordedAt: new Date().toISOString(), contract: 'local-v1', officialDataset: false,
    generator: 'local-mixed-v1 deterministic integer formulas; no random or external state',
    generatorSha256: createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex'),
    records, endpointGroups, hourGroups, configuredEndpoints: endpointCount, configuredHours: hourCount,
    configuredLatencyBins: bins, hotEndpointFraction: 'six of every ten records',
    timeDomain: '48 interleaved UTC hours across 2024-02-28 and leap day; six fractional digits',
    latencyDomain: '0, 1, 997*i for bins2..1022, and UINT32_MAX; bounded synthetic alphabet',
    lineEndings: 'LF, including final record',
    scaling: '10x extends the deterministic prefix; endpoint/hour/latency domains remain fixed',
    limitations: 'Not official distributions; does not model growing cardinality, arbitrary latency density, or all long-token cases',
    oracle: 'Exact cumulative histogram ranks and independently accumulated endpoint-hour counters; no solver execution',
    aggregateTypedArrayBytes: counts.byteLength + histograms.byteLength + requests.byteLength + errors.byteLength,
    input: { file: 'input.log', ...inputIdentity }, expectedOutput: { file: 'expected-output.json', ...outputIdentity },
  };
  fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [directory, records, ...extra] = process.argv.slice(2);
    if (!directory || !/^\d+$/.test(records || '') || extra.length)
      throw new Error('Usage: node scripts/workload.mjs NEW_DIRECTORY RECORD_COUNT');
    console.log(JSON.stringify(createWorkload(path.resolve(directory), Number(records)), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
