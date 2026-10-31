import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { root, fileHash } from './lib/evidence.mjs';
import { verificationPassed, assertNoSanitizerDiagnostic } from './lib/verification.mjs';

// Local experiment driver. The original checkpoint is the immutable baseline
// authority; editing development tooling cannot silently relabel a solver build.
const anchor = path.join(root, 'baselines/verified-d9c5e3828341492a');
const evidence = path.join(root, 'artifacts/experiments/track-a-m2');
fs.mkdirSync(evidence, { recursive: true });
const configPath = path.join(evidence, 'config.json');
const json = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const save = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
function run(command, args, options = {}) {
  const r = spawnSync(command, args, { encoding: 'utf8', timeout: 1800000,
    maxBuffer: 16 * 1024 * 1024, ...options });
  if (r.error || r.signal || r.status !== 0)
    throw new Error(`${command}: ${JSON.stringify({status:r.status,signal:r.signal,error:r.error?.message,stderr:r.stderr})}`);
  return r;
}
async function hash(p) {
  const h = createHash('sha256');
  for await (const b of fs.createReadStream(p)) h.update(b);
  return h.digest('hex');
}
function verifyAnchor() {
  const m = json(path.join(anchor, 'manifest.json'));
  assert.equal(m.status, 'verified-local-contract');
  for (const f of m.files) assert.equal(fileHash(path.join(anchor, f.path)), f.sha256, f.path);
  const p = json(path.join(anchor, 'evidence/preflight.json'));
  assert.ok(p.requiredChecksPassed && verificationPassed(p.gates));
  assert.equal(p.sourceManifestSha256, m.sourceManifestSha256);
  assert.equal(p.build.executableSha256, m.executableSha256);
  assert.equal(fileHash(path.join(root, 'track-a/src/main.cpp')), p.build.sourceSha256,
    'Baseline measurement requires unchanged solver source');
  return { manifest: m, preflight: p, manifestSha256: fileHash(path.join(anchor, 'manifest.json')) };
}
async function verifyStage(c) {
  const a = verifyAnchor();
  assert.equal(a.manifestSha256, c.anchorManifestSha256);
  assert.equal(fileHash(c.binary), a.manifest.executableSha256);
  assert.equal(run('findmnt', ['-T', c.stage, '-n', '-o', 'FSTYPE']).stdout.trim(), 'ext4');
  return a;
}
function summary(runs) {
  const ts = runs.filter(r => r.kind === 'measured').map(r => r.wallSeconds).sort((a,b) => a-b);
  const mean = ts.reduce((a,b) => a+b,0) / ts.length;
  return { measuredRuns:ts.length, minimumSeconds:ts[0], maximumSeconds:ts.at(-1),
    trimmedMeanSeconds:(ts[1]+ts[2]+ts[3])/3, spreadOverMean:(ts.at(-1)-ts[0])/mean,
    targetSpread:0.05, stable:(ts.at(-1)-ts[0])/mean<=0.05,
    maximumResidentSetKiB:Math.max(...runs.filter(r=>r.kind==='measured').map(r=>r.maximumResidentSetKiB)) };
}

const mode = process.argv[2];
if (mode === 'stage') {
  assert.ok(!fs.existsSync(configPath), 'Stage already exists; never overwrite experiment evidence');
  const a = verifyAnchor();
  const stage = fs.mkdtempSync('/tmp/speed-demon-track-a-m2-');
  const filesystem = run('findmnt', ['-T', stage, '-J', '-o', 'TARGET,SOURCE,FSTYPE,OPTIONS']).stdout;
  assert.equal(run('findmnt', ['-T', stage, '-n', '-o', 'FSTYPE']).stdout.trim(), 'ext4');
  const c = { recordedAt:new Date().toISOString(), stage, filesystem:JSON.parse(filesystem),
    workspaceFilesystem:run('findmnt',['-T',root,'-J','-o','TARGET,SOURCE,FSTYPE,OPTIONS']).stdout,
    cpu:2, cpuModel:os.cpus()[2].model,
    topology:run('lscpu',['-e=CPU,CORE,SOCKET,ONLINE']).stdout,
    affinityProbe:run('taskset',['-c','2','sh','-c','cat /proc/self/status']).stdout,
    placement:'taskset -c 2 for each solver; virtual CPU only, no exclusive host core reservation',
    cachePolicy:'Hash-read entire input before every execution, binary verified before batch; one untimed warm-up, five measured processes. Warm page cache; no global drop_caches, no fsync; output close included, durability not timed.',
    compiler:a.preflight.build.version.stdout, flags:a.preflight.build.arguments,
    binary:path.join(stage,'baseline'), binarySha256:a.manifest.executableSha256,
    anchor, anchorManifestSha256:a.manifestSha256, anchorSourceIdentity:a.manifest.sourceManifestSha256,
    baselineBatchLimitPerWorkload:2, workloads:{} };
  fs.copyFileSync(path.join(anchor,'executable/track-a'),c.binary); fs.chmodSync(c.binary,0o755);
  assert.equal(fileHash(c.binary),c.binarySha256);
  for (const [name,dir] of [['normal','normal-3100000'],['tenfold','tenfold-31000000']]) {
    const from=path.join(root,`artifacts/workload-${dir}`), m=json(path.join(from,'manifest.json'));
    const to=path.join(stage,name); fs.mkdirSync(to);
    for (const part of ['input','expectedOutput']) {
      const src=path.join(from,m[part].file), dst=path.join(to,m[part].file);
      assert.equal(await hash(src),m[part].sha256);
      fs.copyFileSync(src,dst); assert.equal(await hash(dst),m[part].sha256);
      assert.equal(fs.statSync(dst).size,m[part].bytes);
    }
    c.workloads[name]={...m,inputPath:path.join(to,m.input.file),expectedPath:path.join(to,m.expectedOutput.file)};
  }
  save(configPath,c); save(path.join(stage,'config.json'),c);
  console.log(JSON.stringify({stage,filesystem:JSON.parse(filesystem),cpu:c.cpu,binarySha256:c.binarySha256}));
} else if (mode === 'baseline-batches') {
  const c=json(configPath); await verifyStage(c);
  const lock=path.join(c.stage,'active-operation'); const fd=fs.openSync(lock,'wx');
  try {
    for (let batch=1;batch<=2;batch++) for (const name of ['normal','tenfold']) {
      const id=`baseline-${name}-${batch}`, dest=path.join(evidence,id+'.json');
      assert.ok(!fs.existsSync(dest),'Batch already attempted; refuses extra/replacement batches');
      const w=c.workloads[name], dir=path.join(c.stage,id); fs.mkdirSync(dir);
      const rec={recordedAt:new Date().toISOString(),state:'running',baseline:true,
        configSha256:fileHash(configPath),sourceIdentity:c.anchorSourceIdentity,
        binary:c.binary,binarySha256:c.binarySha256,compiler:c.compiler,flags:c.flags,
        cpu:c.cpu,cachePolicy:c.cachePolicy,filesystem:c.filesystem,input:w.inputPath,
        inputSha256:w.input.sha256,expectedOutputSha256:w.expectedOutput.sha256,runs:[]};
      save(dest,rec);
      try {
        await verifyStage(c); assert.equal(await hash(w.expectedPath),w.expectedOutput.sha256);
        for (let i=0;i<6;i++) {
          // Full read both checks integrity and deliberately warms this input.
          assert.equal(await hash(w.inputPath),w.input.sha256);
          assert.equal(fileHash(c.binary),c.binarySha256);
          const output=path.join(dir,`output-${i}.json`), time=path.join(dir,`time-${i}.txt`);
          assert.ok(!fs.existsSync(output));
          const args=['-f','%e %U %S %M','-o',time,'--','taskset','-c',String(c.cpu),c.binary,
            '--contract','local-v1','--input',w.inputPath,'--output',output];
          const start=performance.now();
          const p=spawnSync('/usr/bin/time',args,{encoding:'utf8',timeout:1800000,maxBuffer:1024*1024});
          const observation={kind:i===0?'warmup':'measured',wallSeconds:(performance.now()-start)/1000,
            command:'/usr/bin/time',arguments:args,exitStatus:p.status,signal:p.signal,error:p.error?.message,
            stdout:p.stdout,stderr:p.stderr,output};
          rec.runs.push(observation);save(dest,rec);
          assert.ok(!p.error&&!p.signal&&p.status===0,'Captured execution failure');
          assert.equal(p.stdout,'');assertNoSanitizerDiagnostic(p.stderr);
          const values=fs.readFileSync(time,'utf8').trim().split(/\s+/).map(Number);
          assert.equal(values.length,4);assert.ok(values.every(Number.isFinite));assert.ok(values[3]>0);
          [observation.gnuElapsedSeconds,observation.userSeconds,observation.systemSeconds,observation.maximumResidentSetKiB]=values;
          observation.outputSha256=await hash(output);assert.equal(observation.outputSha256,w.expectedOutput.sha256);
          save(dest,rec);
        }
        await verifyStage(c);assert.equal(await hash(w.inputPath),w.input.sha256);
        rec.summary=summary(rec.runs);rec.state='finished';rec.completed=true;
      } catch(e) {rec.state='failed';rec.completed=false;rec.failure=e.stack;throw e;}
      finally {rec.finishedAt=new Date().toISOString();save(dest,rec);save(path.join(dir,'measurements.json'),rec);}
      console.log(id+' '+JSON.stringify(rec.summary));
    }
  } finally {fs.closeSync(fd);fs.unlinkSync(lock);}
} else {
  throw new Error('Usage: node scripts/controlled-experiment.mjs stage|baseline-batches');
}
