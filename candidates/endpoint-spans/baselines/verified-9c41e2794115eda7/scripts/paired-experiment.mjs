import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { root, fileHash, sha256 } from './lib/evidence.mjs';
import { verificationPassed, assertNoSanitizerDiagnostic } from './lib/verification.mjs';

// One candidate, one balanced comparison, no favorable-result reruns. All
// comparisons anchor both source trees to complete verification + checkpoints.
const directory=path.join(root,'artifacts/experiments/track-a-m3');
fs.mkdirSync(directory,{recursive:true});
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const save=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');
const configPath=path.join(directory,'config.json');
async function hash(p){const h=createHash('sha256');for await(const b of fs.createReadStream(p))h.update(b);return h.digest('hex');}
function run(command,args,options={}) {
  const p=spawnSync(command,args,{encoding:'utf8',timeout:1800000,maxBuffer:16*1024*1024,...options});
  assert.ok(!p.error&&!p.signal&&p.status===0,JSON.stringify({command,args,status:p.status,signal:p.signal,error:p.error?.message,stderr:p.stderr}));
  return p;
}
function preserved() {
  const entries=read(path.join(directory,'preserved-checkpoints.json'));
  for(const e of entries){assert.equal(fileHash(path.join(e.path,'manifest.json')),e.manifestSha256);const m=read(path.join(e.path,'manifest.json'));for(const f of m.files)assert.equal(fileHash(path.join(e.path,f.path)),f.sha256);}
  return entries;
}
async function revision(revisionRoot) {
  const r=read(path.join(revisionRoot,'artifacts/verification/preflight.json'));
  assert.equal(r.state,'finished');assert.ok(r.requiredChecksPassed&&verificationPassed(r.gates));
  const e=await import(pathToFileURL(path.join(revisionRoot,'scripts/lib/evidence.mjs')).href);
  assert.equal(sha256(JSON.stringify(e.sourceManifest())),r.sourceManifestSha256);
  assert.equal(fileHash(path.join(revisionRoot,'track-a/src/main.cpp')),r.build.sourceSha256);
  assert.equal(fileHash(r.build.output),r.build.executableSha256);
  const checkpoint=path.join(revisionRoot,`baselines/verified-${r.sourceManifestSha256.slice(0,16)}`);
  const m=read(path.join(checkpoint,'manifest.json'));
  assert.equal(m.status,'verified-local-contract');assert.equal(m.sourceManifestSha256,r.sourceManifestSha256);
  assert.equal(m.executableSha256,r.build.executableSha256);
  for(const f of m.files)assert.equal(fileHash(path.join(checkpoint,f.path)),f.sha256);
  return {root:revisionRoot,checkpoint,checkpointManifestSha256:fileHash(path.join(checkpoint,'manifest.json')),
    verificationSha256:fileHash(path.join(revisionRoot,'artifacts/verification/preflight.json')),
    sourceManifestSha256:r.sourceManifestSha256,sourceSha256:r.build.sourceSha256,
    build:r.build,binarySha256:r.build.executableSha256};
}
async function verify(c) {
  preserved();
  for(const name of ['baseline','candidate']){const r=await revision(c.revisions[name].root);
    assert.equal(r.sourceManifestSha256,c.revisions[name].sourceManifestSha256);
    assert.equal(r.verificationSha256,c.revisions[name].verificationSha256);
    assert.equal(r.checkpointManifestSha256,c.revisions[name].checkpointManifestSha256);
    assert.equal(fileHash(c.revisions[name].binary),r.binarySha256);}
  assert.equal(run('findmnt',['-T',c.stage,'-n','-o','FSTYPE']).stdout.trim(),'ext4');
}
function stats(values){const mean=values.reduce((a,b)=>a+b,0)/values.length;const s=[...values].sort((a,b)=>a-b);return {mean,minimum:s[0],maximum:s.at(-1),median:(s[2]+s[3])/2,spreadOverMean:(s.at(-1)-s[0])/mean};}
function summarize(pairs) {
  const ratios=pairs.map(p=>p.ratioCandidateOverBaseline);
  const geometricMeanRatio=Math.exp(ratios.reduce((s,x)=>s+Math.log(x),0)/ratios.length);
  const orderGroups={};
  for(const first of ['baseline','candidate']){
    const rs=pairs.filter(p=>p.order[0]===first).map(p=>p.ratioCandidateOverBaseline);
    orderGroups[first+'First']={pairs:rs.length,geometricMeanRatio:Math.exp(rs.reduce((s,x)=>s+Math.log(x),0)/rs.length)};
  }
  const baseline=stats(pairs.map(p=>p.observations.baseline.wallSeconds));
  const candidate=stats(pairs.map(p=>p.observations.candidate.wallSeconds));
  const ratio=stats(ratios),gain=1-geometricMeanRatio;
  const baselineRSS=Math.max(...pairs.map(p=>p.observations.baseline.maximumResidentSetKiB));
  const candidateRSS=Math.max(...pairs.map(p=>p.observations.candidate.maximumResidentSetKiB));
  const everyPairFaster=ratios.every(x=>x<1);
  const repeatableSignal=everyPairFaster&&Object.values(orderGroups).every(x=>x.geometricMeanRatio<0.95)
    &&gain>Math.max(0.05,ratio.spreadOverMean/2);
  return {pairs:pairs.length,baseline,candidate,ratio,geometricMeanRatio,observedFractionalReduction:gain,
    candidateFasterPairs:ratios.filter(x=>x<1).length,orderGroups,baselinePeakRSSKiB:baselineRSS,
    candidatePeakRSSKiB:candidateRSS,processRSSRatio:candidateRSS/baselineRSS,
    repeatableSignal,processMemoryGate:candidateRSS<=baselineRSS*1.05,
    interpretation:'Descriptive paired observations from one batch, not a universal speedup or independent-sample statistical guarantee'};
}

const mode=process.argv[2];
if(mode==='stage') {
  assert.ok(!fs.existsSync(configPath),'Never overwrite staged experiment');
  const anchors=preserved();
  const revisions={baseline:await revision(root),candidate:await revision(path.join(root,'candidates/endpoint-spans'))};
  assert.equal(revisions.baseline.sourceSha256,'58819b871ddbf873731a7d54905ffe4c18477822cb76f7aa4d263b813ce29496');
  assert.equal(revisions.baseline.binarySha256,'24ea3b7d4cf82165e9ee17afc7f6894cb7fb257b680147d8eda05e9fd242de59');
  assert.notEqual(revisions.candidate.sourceSha256,revisions.baseline.sourceSha256);
  assert.equal(revisions.baseline.build.version.stdout,revisions.candidate.build.version.stdout);
  // Only the output path differs: source is at the same relative location.
  assert.deepEqual(revisions.baseline.build.arguments.slice(0,-1),revisions.candidate.build.arguments.slice(0,-1));
  assert.equal(fileHash(path.join(root,'track-a/tests/test.mjs')),fileHash(path.join(revisions.candidate.root,'track-a/tests/test.mjs')));
  const stage=fs.mkdtempSync('/tmp/speed-demon-track-a-m3-');
  const c={recordedAt:new Date().toISOString(),stage,cpu:2,cpuModel:os.cpus()[2].model,kernel:run('uname',['-r']).stdout,
    filesystem:JSON.parse(run('findmnt',['-T',stage,'-J','-o','TARGET,SOURCE,FSTYPE,OPTIONS']).stdout),
    topology:run('lscpu',['-e=CPU,CORE,SOCKET,ONLINE']).stdout,
    affinityProbe:run('taskset',['-c','2','sh','-c','cat /proc/self/status']).stdout,
    revisions,anchors,workloads:{},
    cachePolicy:'Before every warm-up/measured execution: full input hash-read and binary hash outside interval. One warm-up of each binary per workload. Warm page-cache intent; residency not guaranteed. Fresh output per run. No cache drop or fsync; close included, durable flush excluded.',
    design:'Exactly six adjacent measured pairs/workload, order BC CB BC CB BC CB. Three of each order. Warm both revisions first. Normal completes before tenfold. No competing project builds/tests/profiles/generators. No batch reruns.',
    promotionRule:'Each workload: all 6 pairs candidate-faster; both order groups geometric ratio <0.95; geometric fractional gain > max(0.05, half paired-ratio spread/mean); measured peak RSS growth <=5%; full correctness/offline gates and no material stress/cgroup regression. Otherwise do not promote. This is a conservative predeclared descriptive gate, not a statistical proof.'};
  assert.equal(c.filesystem.filesystems[0].fstype,'ext4');
  for(const [name,r] of Object.entries(revisions)){
    r.binary=path.join(stage,name);fs.copyFileSync(r.build.output,r.binary);fs.chmodSync(r.binary,0o755);assert.equal(fileHash(r.binary),r.binarySha256);
  }
  const previousPath=path.join(root,'artifacts/experiments/track-a-m2/config.json');
  const previous=fs.existsSync(previousPath)?read(previousPath):null;
  for(const [name,suffix] of [['normal','3100000'],['tenfold','31000000']]) {
    const from=path.join(root,`artifacts/workload-${name}-${suffix}`),m=read(path.join(from,'manifest.json'));
    const dir=path.join(stage,name);fs.mkdirSync(dir);
    const w={...m};
    for(const key of ['input','expectedOutput']) {
      const original=path.join(from,m[key].file),earlier=previous?.workloads[name]?.[key==='input'?'inputPath':'expectedPath'];
      // Reuse only a fully hash-checked earlier ext4 copy, never an unobserved path.
      const source=earlier&&fs.existsSync(earlier)?earlier:original;
      assert.equal(await hash(source),m[key].sha256);
      const dest=path.join(dir,m[key].file);fs.copyFileSync(source,dest);
      assert.equal(await hash(dest),m[key].sha256);assert.equal(fs.statSync(dest).size,m[key].bytes);
      w[key==='input'?'inputPath':'expectedPath']=dest;
      w[key+'StagedFrom']=source;
    }
    c.workloads[name]=w;
  }
  save(configPath,c);save(path.join(stage,'config.json'),c);console.log(JSON.stringify({stage,revisions,cpu:c.cpu},null,2));
} else if(mode==='pairs') {
  const c=read(configPath);await verify(c);
  const lock=path.join(c.stage,'active-operation'),fd=fs.openSync(lock,'wx');
  try {
    for(const name of ['normal','tenfold']) {
      const dest=path.join(directory,`pairs-${name}.json`);assert.ok(!fs.existsSync(dest),'Batch already attempted; no favorable reruns');
      const dir=path.join(c.stage,`pairs-${name}`);fs.mkdirSync(dir);
      const r={recordedAt:new Date().toISOString(),state:'running',configSha256:fileHash(configPath),workload:name,
        revisions:c.revisions,cpu:c.cpu,filesystem:c.filesystem,cachePolicy:c.cachePolicy,design:c.design,promotionRule:c.promotionRule,
        warmups:[],pairs:[]};save(dest,r);
      const w=c.workloads[name];assert.equal(await hash(w.expectedPath),w.expectedOutput.sha256);
      const execute=async(revision,id)=>{
        assert.equal(await hash(w.inputPath),w.input.sha256);const rev=c.revisions[revision];assert.equal(fileHash(rev.binary),rev.binarySha256);
        const output=path.join(dir,id+'.json'),time=path.join(dir,id+'.time');assert.ok(!fs.existsSync(output));
        const args=['-f','%e %U %S %M','-o',time,'--','taskset','-c',String(c.cpu),rev.binary,'--contract','local-v1','--input',w.inputPath,'--output',output];
        const started=performance.now();const p=spawnSync('/usr/bin/time',args,{encoding:'utf8',timeout:1800000,maxBuffer:1024*1024});
        const observation={revision,id,wallSeconds:(performance.now()-started)/1000,command:'/usr/bin/time',arguments:args,
          exitStatus:p.status,signal:p.signal,error:p.error?.message,stdout:p.stdout,stderr:p.stderr,output,time};
        // Save even failed attempts and preserve their captured diagnostics.
        save(path.join(directory,id+'-'+name+'.json'),observation);
        assert.ok(!p.error&&!p.signal&&p.status===0,'Captured execution failed');assert.equal(p.stdout,'');assertNoSanitizerDiagnostic(p.stderr);
        const text=fs.readFileSync(time,'utf8');const values=text.trim().split(/\s+/).map(Number);
        assert.equal(values.length,4);assert.ok(values.every(Number.isFinite));assert.ok(values[3]>0);
        [observation.gnuElapsedSeconds,observation.userSeconds,observation.systemSeconds,observation.maximumResidentSetKiB]=values;
        observation.outputSha256=await hash(output);assert.equal(observation.outputSha256,w.expectedOutput.sha256);
        save(path.join(directory,id+'-'+name+'.json'),observation);fs.copyFileSync(time,path.join(directory,id+'-'+name+'.time'));
        return observation;
      };
      try {
        for(const rev of ['baseline','candidate']){r.warmups.push(await execute(rev,'warmup-'+rev));save(dest,r);}
        for(let i=0;i<6;i++){
          const order=i%2===0?['baseline','candidate']:['candidate','baseline'];
          const pair={number:i+1,order,observations:{}};r.pairs.push(pair);save(dest,r);
          for(const rev of order){pair.observations[rev]=await execute(rev,`pair-${i+1}-${rev}`);save(dest,r);}
          pair.ratioCandidateOverBaseline=pair.observations.candidate.wallSeconds/pair.observations.baseline.wallSeconds;save(dest,r);
        }
        await verify(c);assert.equal(await hash(w.inputPath),w.input.sha256);
        r.summary=summarize(r.pairs);r.completed=true;r.state='finished';
      }catch(e){r.completed=false;r.state='failed';r.failure=e.stack;throw e;}
      finally{r.finishedAt=new Date().toISOString();save(dest,r);save(path.join(dir,'measurements.json'),r);}
      console.log('PAIRS '+name+' '+JSON.stringify(r.summary));
    }
  }finally{fs.closeSync(fd);fs.unlinkSync(lock);}
} else if(mode==='memory') {
  const c=read(configPath);await verify(c);
  for(const name of ['normal','tenfold'])assert.ok(read(path.join(directory,`pairs-${name}.json`)).completed);
  const dest=path.join(directory,'memory.json');assert.ok(!fs.existsSync(dest));
  const lock=path.join(c.stage,'active-operation'),fd=fs.openSync(lock,'wx');
  const r={recordedAt:new Date().toISOString(),state:'running',revisions:c.revisions,runs:[],
    policy:'Separate fresh cgroup per revision/workload, identical pinned-image runtime/CPU2/8GiB limit, warm input hash-read. Container peak includes shell, runtime, kernel and charged cache; shared pages may be charged elsewhere. Not RSS or official harness memory.'};save(dest,r);
  try {
    const image=read(path.join(root,'toolchain.lock.json')).linux_compiler.pinned_image;
    for(const name of ['normal','tenfold'])for(const rev of ['baseline','candidate']) {
      const out=path.join(c.stage,`memory-${name}-${rev}`);fs.mkdirSync(out);
      assert.equal(await hash(c.workloads[name].inputPath),c.workloads[name].input.sha256);
      const shell=`set -eu; /data/${rev} --contract local-v1 --input /data/${name}/input.log --output /out/output.json; cat /sys/fs/cgroup/memory.peak > /out/peak.txt; cat /sys/fs/cgroup/memory.events > /out/events.txt; cat /sys/fs/cgroup/cpuset.cpus.effective > /out/cpus.txt; cat /sys/fs/cgroup/memory.max > /out/max.txt`;
      const args=['run','--rm','--pull=never','--network=none','--read-only','--cpuset-cpus=2','--memory=8g','--memory-swap=8g','--pids-limit=512',
        '--mount',`type=bind,source=${c.stage},target=/data,readonly`,'--mount',`type=bind,source=${out},target=/out`,'--entrypoint','/bin/sh',image,'-c',shell];
      const result=run('docker',args);assert.equal(result.stdout,'');assertNoSanitizerDiagnostic(result.stderr);
      const outputSha256=await hash(path.join(out,'output.json'));assert.equal(outputSha256,c.workloads[name].expectedOutput.sha256);
      const peak=fs.readFileSync(path.join(out,'peak.txt'),'utf8').trim();assert.match(peak,/^[1-9]\d*$/);
      const observation={workload:name,revision:rev,command:'docker',arguments:args,result,outputSha256,
        cgroupMemoryPeakBytes:Number(peak),memoryEvents:fs.readFileSync(path.join(out,'events.txt'),'utf8'),
        cpuPlacement:fs.readFileSync(path.join(out,'cpus.txt'),'utf8').trim(),memoryMax:fs.readFileSync(path.join(out,'max.txt'),'utf8').trim()};
      assert.equal(observation.cpuPlacement,'2');r.runs.push(observation);save(dest,r);
      for(const f of ['peak.txt','events.txt','cpus.txt','max.txt'])fs.copyFileSync(path.join(out,f),path.join(directory,`memory-${name}-${rev}-${f}`));
      console.log('MEMORY '+name+' '+rev+' '+observation.cgroupMemoryPeakBytes);
    }
    await verify(c);r.state='finished';r.completed=true;
  }catch(e){r.state='failed';r.completed=false;r.failure=e.stack;throw e;}
  finally{r.finishedAt=new Date().toISOString();save(dest,r);fs.closeSync(fd);fs.unlinkSync(lock);}
} else {throw new Error('Usage: node scripts/paired-experiment.mjs stage|pairs|memory');}
