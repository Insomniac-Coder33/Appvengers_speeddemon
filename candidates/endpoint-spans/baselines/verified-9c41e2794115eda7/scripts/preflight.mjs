import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requiredGates, verificationPassed, successfulProcess } from './lib/verification.mjs';
import { sourceFiles, sourceManifest, sha256, fileHash } from './lib/evidence.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const reportDir = path.join(root, 'artifacts/verification');
const toolingOnly = process.argv.length === 3 && process.argv[2] === '--tooling-only';
if (process.argv.length > 2 && !toolingOnly) throw new Error('Usage: node scripts/preflight.mjs [--tooling-only]');
fs.mkdirSync(reportDir, { recursive: true });
const report = {
  recordedAt: new Date().toISOString(),
  platform: process.platform, arch: process.arch, node: process.version,
  cpu: os.cpus()[0]?.model, logicalCpuCount: os.cpus().length,
  totalMemoryBytes: os.totalmem(),
  checks: [], cppExecutableVerified: false, officialCorrectnessVerified: false,
  scope: 'Local build, executable suite, native Linux sanitizers and offline packaging; not goal completion or official correctness',
  gates: Object.fromEntries(requiredGates.map(name => [name, false])),
  requiredChecksPassed: false, state: 'running',
  toolingOnly,
};
function save() {
  fs.writeFileSync(path.join(reportDir, 'preflight.json'), JSON.stringify(report, null, 2) + '\n');
}
save(); // Invalidate any previous success before starting work.
function run(name, command, args) {
  const result = spawnSync(command, args, {
    cwd: root, encoding: 'utf8', windowsHide: true, timeout: 20 * 60 * 1000,
    maxBuffer: 8 * 1024 * 1024,
  });
  const record = { name, command, arguments: args, exitStatus: result.status,
    signal: result.signal, error: result.error?.message,
    stdout: result.stdout, stderr: result.stderr };
  report.checks.push(record);
  save();
  console.log(`${successfulProcess(result) ? 'PASS' : 'FAILED/BLOCKED'} ${name}`);
  return successfulProcess(result);
}
try {
report.sourceManifest = sourceManifest();
report.sourceManifestSha256 = sha256(JSON.stringify(report.sourceManifest));
let toolingPassed = true;
for (const file of sourceFiles().filter(name => name.endsWith('.mjs')))
  toolingPassed = run(`JavaScript syntax: ${file}`, process.execPath, ['--check', file]) && toolingPassed;
toolingPassed = run('Independent oracle self-check (not solver tests)', process.execPath,
  ['track-a/tests/test.mjs', '--self-check']) && toolingPassed;
toolingPassed = run('Verification tooling regressions (not solver tests)', process.execPath,
  ['--test', '--test-concurrency=1', ...sourceFiles().filter(name => name.startsWith('scripts/tests/') && name.endsWith('.test.mjs'))]) && toolingPassed;
const shell = process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : 'sh';
toolingPassed = run('Build shell syntax', shell, ['-n', 'build.sh']) && toolingPassed;
const shellBytes = fs.readFileSync(path.join(root, 'build.sh'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'toolchain.lock.json'), 'utf8'));
const shellEncodingPassed = !shellBytes.includes(13) &&
  !(shellBytes[0] === 0xef && shellBytes[1] === 0xbb && shellBytes[2] === 0xbf);
report.checks.push({ name: 'Build script LF and UTF-8 without BOM', passed: shellEncodingPassed });
toolingPassed = shellEncodingPassed && toolingPassed;
report.pinnedContainerImage = lock.linux_compiler.pinned_image;
const buildPassed = !toolingOnly && run('Native C++ build attempt', process.execPath, ['scripts/build.mjs']);
if (toolingOnly) report.checks.push({ name: 'Executable/environment gates',
  status: 'NOT RUN: tooling-only cannot satisfy compilation, executable, sanitizer, Linux or container requirements' });
report.gates.nativeBuild = buildPassed;
if (buildPassed) {
  const build = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/build/native.json'), 'utf8'));
  const exe = build.output;
  report.build = build;
  report.cppExecutableVerified = run('Complete local-v1 executable suite', process.execPath,
    ['track-a/tests/test.mjs', exe]);
  report.gates.localContract = report.cppExecutableVerified && fileHash(exe) === build.executableSha256;
  report.gates.linuxExecution = process.platform === 'linux' && process.arch === 'x64' && report.gates.localContract;
} else {
  report.checks.push({ name: 'Complete local-v1 executable suite',
    status: 'BLOCKED: native build did not produce a verified executable; suite not run' });
}
if (buildPassed && process.platform === 'linux' && process.arch === 'x64') {
  report.gates.sanitizerBuild = run('Native Linux ASan+UBSan build', process.execPath,
    ['scripts/build.mjs', '--sanitize']);
  if (report.gates.sanitizerBuild) {
    const build = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/build/native-san.json'), 'utf8'));
    report.sanitizerBuild = build;
    report.gates.sanitizerContract = run('ASan+UBSan complete local-v1 suite', process.execPath,
      ['track-a/tests/test.mjs', build.output]) && fileHash(build.output) === build.executableSha256;
  }
} else {
  report.checks.push({ name: 'Native Linux ASan+UBSan suite',
    status: 'BLOCKED: requires successful native Linux x64 compilation; no substitute checks counted' });
}
report.gates.offlineContainer = !toolingOnly && run('Offline container check attempt', process.execPath, ['scripts/container-check.mjs']);
report.developmentToolingPassed = toolingPassed;
report.gates.developmentTooling = toolingPassed;
report.gates.unchangedSources = sha256(JSON.stringify(sourceManifest())) === report.sourceManifestSha256;
report.requiredChecksPassed = verificationPassed(report.gates);
} catch (error) {
  report.failure = error.message;
  report.requiredChecksPassed = false;
  console.error(error.message);
} finally {
report.state = 'finished';
report.checkpointStatus = report.requiredChecksPassed
  ? 'Required local verification passed; preserve the exact source/build/test set before optimization'
  : 'Unverified source candidate; not a known-good baseline';
save();
fs.copyFileSync(path.join(reportDir, 'preflight.json'),
  path.join(reportDir, `preflight-${report.recordedAt.replace(/[:.]/g, '-')}.json`));
console.log(`Evidence: ${path.join(reportDir, 'preflight.json')}`);
console.log(report.checkpointStatus);
if (!report.requiredChecksPassed) process.exitCode = 1;
}
