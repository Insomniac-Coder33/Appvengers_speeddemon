import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceManifest, sha256 } from './lib/evidence.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const lock = JSON.parse(readFileSync(resolve(root, 'toolchain.lock.json'), 'utf8'));
const image = lock.linux_compiler.pinned_image;
const record = { recordedAt: new Date().toISOString(), steps: [], verified: false };
mkdirSync(resolve(root, 'artifacts/container'), { recursive: true });
const runDirectory = mkdtempSync(resolve(root, 'artifacts/container/run-'));
record.runDirectory = runDirectory;
function save() {
  writeFileSync(resolve(runDirectory, 'check.json'), JSON.stringify(record, null, 2) + '\n');
}
function run(args) {
  const result = spawnSync('docker', args, {
    cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024,
    timeout: 10 * 60 * 1000,
  });
  record.steps.push({ arguments: args, status: result.status, error: result.error?.message,
    stdout: result.stdout, stderr: result.stderr });
  save();
  if (result.error || result.signal || result.status !== 0) throw new Error(`Docker step failed: ${args.join(' ')}`);
  return result.stdout;
}
try {
  record.sourceManifest = sourceManifest();
  record.sourceManifestSha256 = sha256(JSON.stringify(record.sourceManifest));
  run(['version']);
  if (!image || !/@sha256:[a-f0-9]{64}$/.test(image))
    throw new Error('Resolve and provision a pinned Linux/amd64 compiler image first; no automatic pull');
  const info = JSON.parse(run(['image', 'inspect', image]))[0];
  if (info.Os !== 'linux' || info.Architecture !== 'amd64')
    throw new Error('Pinned image must be linux/amd64');
  if (!info.RepoDigests?.includes(image))
    throw new Error('Requested digest is not present in local image provenance');
  record.baseImage = { reference: image, id: info.Id, repoDigests: info.RepoDigests };
  record.compilerVersion = run(['run', '--rm', '--network=none', '--read-only',
    '--entrypoint', 'g++', image, '--version']).trim();
  const iidfile = resolve(runDirectory, 'image-id');
  run(['build', '--pull=false', '--no-cache', '--network=none',
    '--platform=linux/amd64', '--iidfile', iidfile, '--build-arg', `BUILD_IMAGE=${image}`, '.']);
  record.imageId = readFileSync(iidfile, 'utf8').trim();
  if (!/^sha256:[a-f0-9]{64}$/.test(record.imageId)) throw new Error('Build did not record an immutable image ID');
  const inputDir = resolve(runDirectory, 'input');
  const outputDir = resolve(runDirectory, 'output');
  mkdirSync(inputDir, { recursive: true });
  mkdirSync(outputDir, { recursive: true });
  const inputText = '2024-02-29T12:00:00.000000Z GET /a 500 7\n';
  writeFileSync(resolve(inputDir, 'local-input.log'), inputText);
  const stdout = run(['run', '--rm', '--network=none', '--read-only', '--memory=8g', '--memory-swap=8g',
    '--pids-limit=512', '--ulimit', 'nofile=8192:8192', '--tmpfs', '/tmp:rw,size=1g,exec',
    '--mount', `type=bind,source=${inputDir},target=/data,readonly`,
    '--mount', `type=bind,source=${outputDir},target=/out`,
    record.imageId, '--contract', 'local-v1',
    '--input', '/data/local-input.log', '--output', '/out/local-output.json']);
  if (stdout !== '' || JSON.stringify(readdirSync(outputDir)) !== '["local-output.json"]')
    throw new Error('Container must produce only its required output file and no stdout');
  if (readFileSync(resolve(inputDir, 'local-input.log'), 'utf8') !== inputText)
    throw new Error('Container input changed');
  const expected = '{"contract":"local-v1","endpoints":[{"endpoint_hex":"2f61","count":1,"p50_us":7,"p95_us":7,"p99_us":7}],"hours":[{"endpoint_hex":"2f61","hour_utc":"2024-02-29T12:00:00Z","requests":1,"errors":1,"rate_numerator":1,"rate_denominator":1}]}\n';
  if (readFileSync(resolve(outputDir, 'local-output.json'), 'utf8') !== expected)
    throw new Error('Container smoke output differs from hand-derived local golden');
  if (sha256(JSON.stringify(sourceManifest())) !== record.sourceManifestSha256)
    throw new Error('Sources changed during container verification');
  record.verified = true;
  record.limitations = 'Local smoke check only; CPU pinning, cgroup measurement, full test suite and official harness remain separate.';
  save();
  console.log('PASS local offline build and constrained container smoke check');
} catch (error) {
  record.failure = error.message;
  save();
  console.error(error.message);
  process.exitCode = 1;
}
