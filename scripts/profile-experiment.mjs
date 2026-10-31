import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { root, fileHash } from './lib/evidence.mjs';
import { assertNoSanitizerDiagnostic, verificationPassed } from './lib/verification.mjs';

const evidence=path.join(root,'artifacts/experiments/track-a-m2');
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const save=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const c=json(path.join(evidence,'config.json'));
const a=json(path.join(c.anchor,'manifest.json'));
assert.equal(fileHash(path.join(c.anchor,'manifest.json')),c.anchorManifestSha256);
for (const f of a.files) assert.equal(fileHash(path.join(c.anchor,f.path)),f.sha256);
const preflight=json(path.join(c.anchor,'evidence/preflight.json'));
assert.ok(preflight.requiredChecksPassed&&verificationPassed(preflight.gates));
assert.equal(a.executableSha256,fileHash(c.binary));
assert.equal(fileHash(path.join(root,'track-a/src/main.cpp')),preflight.build.sourceSha256);
for (const name of ['normal','tenfold']) for (let i=1;i<=2;i++)
  assert.ok(json(path.join(evidence,`baseline-${name}-${i}.json`)).completed,'Profiling/memory must follow all baseline batches');
async function hash(p) {
  const h=createHash('sha256');for await(const b of fs.createReadStream(p))h.update(b);return h.digest('hex');
}
function run(cmd,args,options={}) {
  const r=spawnSync(cmd,args,{encoding:'utf8',timeout:1800000,maxBuffer:16*1024*1024,...options});
  if(r.error||r.signal||r.status!==0)throw new Error(`${cmd}: ${JSON.stringify({status:r.status,signal:r.signal,error:r.error?.message,stderr:r.stderr})}`);
  return r;
}
const mode=process.argv[2];
assert.ok(['profile','memory'].includes(mode),'Usage: node scripts/profile-experiment.mjs profile|memory');
const outputEvidence=path.join(evidence,mode+'.json');
assert.ok(!fs.existsSync(outputEvidence),'Never overwrite an experiment');
const lock=path.join(c.stage,'active-operation'),fd=fs.openSync(lock,'wx');
const record={recordedAt:new Date().toISOString(),state:'running',kind:mode,
  benchmark:false,baselineSourceSha256:preflight.build.sourceSha256,
  baselineBinarySha256:c.binarySha256,anchorManifestSha256:c.anchorManifestSha256,
  configSha256:fileHash(path.join(evidence,'config.json')),runs:[]};
save(outputEvidence,record);
try {
  const dir=path.join(c.stage,mode);fs.mkdirSync(dir);
  if(mode==='profile') {
    record.profilingPolicy='Separate instrumented -pg build plus coarse phase wall timers; never used for benchmark or solver speedup claims. gprof sampling/call instrumentation can distort inlining and relative cost.';
    record.perfAvailable=spawnSync('which',['perf'],{encoding:'utf8'}).stdout?.trim()||null;
    record.gprofVersion=run('gprof',['--version']).stdout;
    record.compiler=run('g++',['--version']).stdout;
    assert.equal(record.compiler,c.compiler,'Profile compiler must match original baseline compiler');
    let source=fs.readFileSync(path.join(c.anchor,'track-a/src/main.cpp'),'utf8');
    const before='        ingest(options, aggregates);\n        const auto order = prepare_output(aggregates);\n        write_output(options, aggregates, order);';
    assert.equal(source.split(before).length,2,'Instrumentation insertion must match exactly once');
    const after=`        const auto phase0 = std::chrono::steady_clock::now();
        ingest(options, aggregates);
        const auto phase1 = std::chrono::steady_clock::now();
        const auto order = prepare_output(aggregates);
        const auto phase2 = std::chrono::steady_clock::now();
        write_output(options, aggregates, order);
        const auto phase3 = std::chrono::steady_clock::now();
        const auto ms = [](auto begin, auto end) { return std::chrono::duration<double, std::milli>(end-begin).count(); };
        std::cerr << "PHASES " << ms(phase0,phase1) << ' ' << ms(phase1,phase2) << ' ' << ms(phase2,phase3) << '\\n';`;
    source='#include <chrono>\n'+source.replace(before,after);
    const sourcePath=path.join(dir,'instrumented.cpp'),binary=path.join(dir,'track-a-pg');
    fs.writeFileSync(sourcePath,source);record.instrumentedSourceSha256=fileHash(sourcePath);
    const flags=['-std=c++20','-O2','-DNDEBUG','-Wall','-Wextra','-Wpedantic','-pg','-g','-fno-omit-frame-pointer',sourcePath,'-o',binary];
    record.build={compiler:'g++',arguments:flags,result:run('g++',flags)};
    record.instrumentedBinarySha256=fileHash(binary);
    // Store generated source in persistent workspace evidence as well as ext4.
    fs.copyFileSync(sourcePath,path.join(evidence,'profile-instrumented.cpp'));
    for(const name of ['normal','tenfold']) {
      const w=c.workloads[name],runDir=path.join(dir,name);fs.mkdirSync(runDir);
      assert.equal(await hash(w.inputPath),w.input.sha256);
      const output=path.join(runDir,'output.json');
      const args=['-c',String(c.cpu),binary,'--contract','local-v1','--input',w.inputPath,'--output',output];
      const result=run('taskset',args,{cwd:runDir});assert.equal(result.stdout,'');assertNoSanitizerDiagnostic(result.stderr);
      const match=result.stderr.match(/^PHASES ([\d.e+-]+) ([\d.e+-]+) ([\d.e+-]+)\n$/);assert.ok(match,result.stderr);
      const phases={ingestMs:Number(match[1]),orderAndSortMs:Number(match[2]),serializationMs:Number(match[3])};
      const actual=await hash(output);assert.equal(actual,w.expectedOutput.sha256);
      const profile=run('gprof',['-b',binary,path.join(runDir,'gmon.out')]);
      const rawPath=path.join(evidence,`gprof-${name}.txt`);fs.writeFileSync(rawPath,profile.stdout);
      fs.copyFileSync(path.join(runDir,'gmon.out'),path.join(evidence,`gmon-${name}.out`));
      record.runs.push({workload:name,command:'taskset',arguments:args,result,phases,outputSha256:actual,
        inputSha256:w.input.sha256,gprof:rawPath,gprofSha256:fileHash(rawPath)});save(outputEvidence,record);
      console.log('PROFILE '+name+' '+JSON.stringify(phases));
    }
  } else {
    record.policy='Fresh constrained cgroup per workload, warm staged input, unchanged native baseline binary. Container-wide peak includes shell/runtime/kernel/cache charges; shared cached pages may be charged elsewhere. Not official harness accounting and not process RSS.';
    record.hostCgroup=fs.readFileSync('/proc/self/cgroup','utf8');
    record.hostCgroupMount=run('findmnt',['-T','/sys/fs/cgroup','-J']).stdout;
    const image=json(path.join(root,'toolchain.lock.json')).linux_compiler.pinned_image;
    record.image=image;
    for(const name of ['normal','tenfold']) {
      const w=c.workloads[name],out=path.join(dir,name);fs.mkdirSync(out);
      assert.equal(await hash(w.inputPath),w.input.sha256);
      const shell='set -eu; /data/baseline --contract local-v1 --input /data/'+name+'/input.log --output /out/output.json; cat /sys/fs/cgroup/memory.peak > /out/memory-peak.txt; cat /sys/fs/cgroup/memory.max > /out/memory-max.txt; cat /sys/fs/cgroup/memory.events > /out/memory-events.txt; cat /sys/fs/cgroup/cpuset.cpus.effective > /out/cpus.txt';
      const args=['run','--rm','--pull=never','--network=none','--read-only','--cpuset-cpus='+c.cpu,
        '--memory=8g','--memory-swap=8g','--pids-limit=512','--mount',`type=bind,source=${c.stage},target=/data,readonly`,
        '--mount',`type=bind,source=${out},target=/out`,'--entrypoint','/bin/sh',image,'-c',shell];
      const result=run('docker',args);assert.equal(result.stdout,'');assertNoSanitizerDiagnostic(result.stderr);
      const outputSha256=await hash(path.join(out,'output.json'));assert.equal(outputSha256,w.expectedOutput.sha256);
      const peak=fs.readFileSync(path.join(out,'memory-peak.txt'),'utf8').trim();assert.match(peak,/^[1-9]\d*$/);
      const observation={workload:name,command:'docker',arguments:args,result,outputSha256,
        cgroupMemoryPeakBytes:Number(peak),memoryMax:fs.readFileSync(path.join(out,'memory-max.txt'),'utf8').trim(),
        memoryEvents:fs.readFileSync(path.join(out,'memory-events.txt'),'utf8'),
        cpuPlacement:fs.readFileSync(path.join(out,'cpus.txt'),'utf8').trim()};
      assert.equal(observation.cpuPlacement,String(c.cpu));record.runs.push(observation);save(outputEvidence,record);
      console.log('CGROUP '+name+' '+JSON.stringify(observation));
    }
  }
  assert.equal(fileHash(c.binary),c.binarySha256);
  for(const f of a.files)assert.equal(fileHash(path.join(c.anchor,f.path)),f.sha256);
  record.state='finished';record.completed=true;
} catch(e) {record.state='failed';record.completed=false;record.failure=e.stack;throw e;}
finally {record.finishedAt=new Date().toISOString();save(outputEvidence,record);fs.closeSync(fd);fs.unlinkSync(lock);}
