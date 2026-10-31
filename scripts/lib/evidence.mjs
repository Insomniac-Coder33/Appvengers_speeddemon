import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const fileHash = file => sha256(fs.readFileSync(file));
export function sourceFiles() {
  return ['track-a/src/main.cpp', 'track-a/tests/test.mjs', 'track-a/LOCAL_CONTRACT.md',
    ...fs.readdirSync(path.join(root, 'scripts'), { recursive: true })
      .filter(name => name.endsWith('.mjs')).map(name => `scripts/${name.replaceAll('\\', '/')}`),
    'build.sh', 'Dockerfile', '.dockerignore', 'toolchain.lock.json'].sort();
}
export function sourceManifest() {
  return sourceFiles().map(file => {
    const bytes = fs.readFileSync(path.join(root, file));
    return { path: file, bytes: bytes.length, sha256: sha256(bytes) };
  });
}
export function assertBuildIdentity(build, executable) {
  if (build.verified !== true || build.sanitize !== false ||
      path.resolve(build.output) !== path.resolve(executable) ||
      build.sourceSha256 !== fileHash(path.join(root, 'track-a/src/main.cpp')) ||
      build.executableSha256 !== fileHash(executable))
    throw new Error('Executable/source do not match a successful unsanitized build record');
}
