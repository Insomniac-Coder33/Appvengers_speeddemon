import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, lstatSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { successfulProcess } from './lib/verification.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
let compiler = process.env.CXX || 'g++';
let target = 'native';
let sanitize = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--compiler' && args[i + 1]) compiler = args[++i];
  else if (args[i] === '--target' && args[i + 1]) target = args[++i];
  else if (args[i] === '--sanitize') sanitize = true;
  else throw new Error(`Unknown or incomplete option: ${args[i]}`);
}
if (!['native', 'linux'].includes(target)) throw new Error('Target must be native or linux');
const zig = /^zig(?:\.exe)?$/i.test(basename(compiler));
if (target === 'linux' && (process.platform !== 'linux' || process.arch !== 'x64') && !zig)
  throw new Error('Linux cross compilation requires the provisioned Zig driver');
if (sanitize && (target !== 'native' || process.platform !== 'linux'))
  throw new Error('The verified sanitizer route requires native Linux GCC/Clang');
mkdirSync(resolve(root, 'build'), { recursive: true });
mkdirSync(resolve(root, 'artifacts/build'), { recursive: true });
const runDirectory = mkdtempSync(resolve(root, 'build/run-'));
const suffix = target === 'native' && process.platform === 'win32' ? '.exe' : '';
const output = resolve(runDirectory, `track-a${sanitize ? '-san' : ''}${suffix}`);
const source = resolve(root, 'track-a/src/main.cpp');
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const flags = [
  ...(zig ? ['c++'] : []), '-std=c++20',
  ...(sanitize ? ['-O1', '-g', '-fno-omit-frame-pointer', '-fsanitize=address,undefined',
    '-fno-sanitize-recover=all'] : ['-O2', '-DNDEBUG']),
  '-Wall', '-Wextra', '-Wpedantic',
  ...(target === 'linux' && zig ? ['-target', 'x86_64-linux-musl'] : []),
  'track-a/src/main.cpp', '-o', output,
];
const record = { recordedAt: new Date().toISOString(), compiler, arguments: flags,
  platform: process.platform, architecture: process.arch, target, sanitize,
  output, sourceSha256: hash(source), verified: false };
function run(arguments_) {
  const result = spawnSync(compiler, arguments_, {
    cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    windowsHide: true, timeout: 120000,
  });
  return { status: result.status, signal: result.signal, error: result.error?.message,
    stdout: result.stdout, stderr: result.stderr };
}
try {
  record.version = run(zig ? ['version'] : ['--version']);
  if (!successfulProcess(record.version)) throw new Error('Compiler version probe failed');
  record.compilation = run(flags);
  if (!successfulProcess(record.compilation)) throw new Error('Compilation failed');
  // A new directory prevents an old binary from satisfying this check.
  if (!lstatSync(output).isFile() || lstatSync(output).size === 0)
    throw new Error('Compiler did not produce a nonempty regular executable');
  if (hash(source) !== record.sourceSha256) throw new Error('Source changed during compilation');
  record.executableSha256 = hash(output);
  record.verified = true; // Compilation only, NOT correctness.
  console.log(output);
} catch (error) {
  record.failure = error.message;
  console.error(error.message);
  for (const step of [record.version, record.compilation]) {
    if (step?.error) console.error(step.error);
    if (step?.stderr) process.stderr.write(step.stderr);
  }
  process.exitCode = 1;
} finally {
  const evidence = resolve(runDirectory, 'build.json');
  writeFileSync(evidence, JSON.stringify(record, null, 2) + '\n');
  // Replace the latest pointer even on failure; preserve per-run history.
  copyFileSync(evidence, resolve(root, `artifacts/build/${target}${sanitize ? '-san' : ''}.json`));
}
