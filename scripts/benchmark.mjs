import { spawnSync } from 'node:child_process';
import { createReadStream, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import os from 'node:os';
import { sourceManifest, sha256, assertBuildIdentity } from './lib/evidence.mjs';
import { verificationPassed, assertNoSanitizerDiagnostic } from './lib/verification.mjs';

// Development tool only. Inputs and their independently verified expected output
// hash must exist beforehand. No input generation or compilation happens here.
const [executableArg, inputArg, expected, directoryArg] = process.argv.slice(2);
if (!executableArg || !inputArg || !/^[a-f0-9]{64}$/i.test(expected || '') || !directoryArg) {
  console.error('Usage: node scripts/benchmark.mjs EXE INPUT EXPECTED_OUTPUT_SHA256 NEW_OUTPUT_DIRECTORY');
  process.exit(2);
}
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const executable = resolve(executableArg);
const input = resolve(inputArg);
const directory = resolve(directoryArg);
// Refuse reuse so earlier measurements cannot be silently overwritten.
mkdirSync(directory, { recursive: false });
const output = resolve(directory, 'local-output.json');
async function hash(path) {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest('hex');
}
const record = {
  recordedAt: new Date().toISOString(),
  contract: 'local-v1', executable, input, expectedOutputSha256: expected.toLowerCase(),
  platform: process.platform, architecture: process.arch, node: process.version,
  cpu: os.cpus()[0]?.model, logicalCpuCount: os.cpus().length, totalMemory: os.totalmem(),
  note: 'Local whole-process wall time includes spawn-to-exit. Not official harness scoring.',
  workloadIsolation: 'Caller must stop competing builds, generators, profilers and benchmark jobs.',
  cgroupMemoryPeakBytes: null, memoryStatus: 'Not measured by this portable runner.',
  runs: [],
};
function save() {
  writeFileSync(resolve(directory, 'measurements.json'), JSON.stringify(record, null, 2) + '\n');
}
try {
  const verification = JSON.parse(readFileSync(resolve(root, 'artifacts/verification/preflight.json'), 'utf8'));
  const sourceIdentity = sha256(JSON.stringify(sourceManifest()));
  if (verification.state !== 'finished' || verification.requiredChecksPassed !== true ||
      !verificationPassed(verification.gates) || sourceIdentity !== verification.sourceManifestSha256)
    throw new Error('Current required executable verification is missing or failed; refusing measurement');
  assertBuildIdentity(verification.build, executable);
  const checkpoint = resolve(root, `baselines/verified-${sourceIdentity.slice(0, 16)}/manifest.json`);
  const baseline = JSON.parse(readFileSync(checkpoint, 'utf8'));
  if (baseline.status !== 'verified-local-contract' || baseline.sourceManifestSha256 !== sourceIdentity ||
      baseline.executableSha256 !== verification.build.executableSha256)
    throw new Error('Preserve the verified baseline before measurement');
  record.sourceManifestSha256 = sourceIdentity;
  record.build = verification.build;
  record.checkpoint = checkpoint;
  record.executableSha256 = await hash(executable);
  record.inputSha256 = await hash(input);
  record.sourceSha256 = await hash(resolve(root, 'track-a/src/main.cpp'));
  record.toolchainLock = JSON.parse(readFileSync(resolve(root, 'toolchain.lock.json'), 'utf8'));
  const linuxMemory = process.platform === 'linux';
  if (linuxMemory) {
    const probe = spawnSync('/usr/bin/time', ['--version'], {
      encoding: 'utf8', windowsHide: true, timeout: 10000,
    });
    if (probe.error || probe.signal || probe.status !== 0 || !/GNU/.test(probe.stdout))
      throw new Error('Linux measurement requires provisioned GNU /usr/bin/time');
    record.memoryTool = { path: '/usr/bin/time', version: probe.stdout.trim() };
    record.memoryStatus = 'Per-run GNU time maximum process RSS in KiB; not cgroup memory.peak';
  }
  for (let i = 0; i < 6; i++) {
    // Only this runner's output in its freshly created directory is removed.
    // A process that exits without writing cannot reuse a previous correct file.
    rmSync(output, { force: true });
    const rssFile = resolve(directory, `rss-${i}.txt`);
    const solverArgs = ['--contract', 'local-v1', '--input', input, '--output', output];
    const command = linuxMemory ? '/usr/bin/time' : executable;
    const arguments_ = linuxMemory ? ['-f', '%M', '-o', rssFile, '--', executable, ...solverArgs] : solverArgs;
    const started = performance.now();
    const child = spawnSync(command, arguments_, {
      encoding: 'utf8', windowsHide: true, timeout: 30 * 60 * 1000, maxBuffer: 1024 * 1024,
    });
    const wallSeconds = (performance.now() - started) / 1000;
    const observation = { kind: i === 0 ? 'warmup' : 'measured', wallSeconds,
      exitStatus: child.status, signal: child.signal, error: child.error?.message,
      stderr: child.stderr, stdout: child.stdout };
    record.runs.push(observation);
    save();
    if (child.error || child.status !== 0 || child.stdout !== '')
      throw new Error('Process failed or wrote unexpected stdout; measurement batch rejected');
    assertNoSanitizerDiagnostic(child.stderr);
    if (linuxMemory) {
      const value = readFileSync(rssFile, 'utf8').trim();
      if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)))
        throw new Error('GNU time did not report a positive numeric maximum RSS');
      observation.maximumResidentSetKiB = Number(value);
    }
    if (!lstatSync(output).isFile()) throw new Error('Required regular output file was not created');
    observation.outputSha256 = await hash(output);
    observation.correctOutput = observation.outputSha256 === expected.toLowerCase();
    if (!observation.correctOutput) throw new Error('Expected local output hash did not match');
    save();
  }
  if (sha256(JSON.stringify(sourceManifest())) !== sourceIdentity ||
      await hash(resolve(root, 'track-a/src/main.cpp')) !== record.sourceSha256 ||
      await hash(executable) !== record.executableSha256 ||
      await hash(input) !== record.inputSha256)
    throw new Error('Source, executable or input changed during measurement');
  const times = record.runs.filter(run => run.kind === 'measured').map(run => run.wallSeconds).sort((a, b) => a - b);
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  record.summary = { measuredRuns: times.length, minimumSeconds: times[0], maximumSeconds: times.at(-1),
    trimmedMeanSeconds: (times[1] + times[2] + times[3]) / 3,
    spreadOverMean: (times.at(-1) - times[0]) / mean };
  record.summary.memoryPeakKiB = linuxMemory
    ? Math.max(...record.runs.filter(run => run.kind === 'measured').map(run => run.maximumResidentSetKiB))
    : null;
  record.summary.stabilityReview = record.summary.spreadOverMean > 0.10
    ? 'Spread exceeds local 10% review threshold; investigate competing load before comparison'
    : 'Below local 10% review threshold; not a statistical or official stability guarantee';
  record.completed = true;
  save();
  console.log(JSON.stringify(record.summary, null, 2));
} catch (error) {
  record.completed = false;
  record.failure = error.message;
  save();
  console.error(error.message);
  process.exitCode = 1;
}
