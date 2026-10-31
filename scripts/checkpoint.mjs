import fs from 'node:fs';
import path from 'node:path';
import { root, sourceManifest, sha256, assertBuildIdentity, fileHash } from './lib/evidence.mjs';
import { verificationPassed } from './lib/verification.mjs';

// A verified snapshot is permitted only from unchanged, passing executable evidence.
try {
  const evidencePath = path.join(root, 'artifacts/verification/preflight.json');
  const report = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  const manifest = sourceManifest();
  const identity = sha256(JSON.stringify(manifest));
  if (report.state !== 'finished' || report.requiredChecksPassed !== true ||
      !verificationPassed(report.gates) || identity !== report.sourceManifestSha256)
    throw new Error('Cannot preserve a verified baseline: required current executable evidence is absent or failed');
  assertBuildIdentity(report.build, report.build.output);
  const directory = path.join(root, 'baselines', `verified-${identity.slice(0, 16)}`);
  fs.mkdirSync(directory); // Never overwrite a previous snapshot.
  const files = [...manifest.map(entry => entry.path), 'PLAN.md', 'README.md', 'PERF.md'];
  const saved = [];
  function copy(source, relative) {
    const target = path.join(directory, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
    const expected = fileHash(source);
    if (fileHash(target) !== expected) throw new Error(`Snapshot copy mismatch: ${relative}`);
    saved.push({ path: relative, sha256: expected });
  }
  for (const file of files) copy(path.join(root, file), file);
  copy(evidencePath, 'evidence/preflight.json');
  copy(report.build.output, `executable/${path.basename(report.build.output)}`);
  if (saved.at(-1).sha256 !== report.build.executableSha256)
    throw new Error('Executable changed during snapshot');
  if (sha256(JSON.stringify(sourceManifest())) !== identity)
    throw new Error('Sources changed during snapshot');
  fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify({
    recordedAt: new Date().toISOString(), status: 'verified-local-contract',
    officialCorrectnessVerified: false, sourceManifestSha256: identity,
    executableSha256: report.build.executableSha256, files: saved,
  }, null, 2) + '\n', { flag: 'wx' });
  console.log(directory);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
