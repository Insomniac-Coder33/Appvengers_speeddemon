"""Independent official-format integration suite; local-v1 tests remain unchanged.

Uses a histogram oracle (not the solver's sort or official datetime reference),
checks public hand-derived goldens and compares actual official generators/reference.
Executable path is a captured container wrapper supplied by the verifier.
"""
from pathlib import Path
from collections import Counter, defaultdict
import datetime, hashlib, importlib.util, json, os, random, re, subprocess, sys
ROOT=Path(__file__).resolve().parents[3]
UP=ROOT/'artifacts/official-integration/upstream/speed-demon-2026-main'
def load(name,p):
 s=importlib.util.spec_from_file_location(name,p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
ref=load('official_reference',UP/'reference/a_ingest.py')
gen=load('official_generator',UP/'generators/a_ingest.py')
public=load('official_fixtures',UP/'tests/test_a_ingest.py')

def oracle(raw):
 groups=defaultdict(lambda:[Counter(),0,0])
 for line in raw.splitlines():
  ts,method,endpoint,status,latency=line.split(b' ')
  hist,n,errs=groups[(ts[:13],endpoint)]
  hist[int(latency)]+=1
  groups[(ts[:13],endpoint)][1:]=[n+1,errs+(500<=int(status)<=599)]
 lines=[]
 for (hour,ep),(hist,n,errs) in sorted(groups.items()):
  picks=[]
  for p in (50,95,99):
   rank=(p*n+99)//100;seen=0
   for v,k in sorted(hist.items()):
    seen+=k
    if seen>=rank:picks.append(v);break
  lines.append(b'%s:00:00Z %s %d %d %d %d %d %d\n'%(hour,ep,n,*picks,errs,errs*1000000//n))
 return b''.join(lines)

def line(hour=0,ep='/a',status=200,latency=1,method='GET',micro=0):
 t=datetime.datetime(2026,10,30,18)+datetime.timedelta(hours=hour,microseconds=micro)
 return (t.strftime('%Y-%m-%dT%H:%M:%S.')+f'{t.microsecond:06d}Z {method} {ep} {status} {latency}\n').encode()

class Suite:
 def __init__(self,exe,work):self.exe=exe;self.work=work;self.results=[]
 def run(self,label,raw,args=(),golden=None,invalid=False,reference=False):
  d=self.work/f'{len(self.results):03d}';d.mkdir(mode=0o777);d.chmod(0o777)
  data=d/'data';data.mkdir(mode=0o777);data.chmod(0o777)
  inp=data/'requests.log';inp.write_bytes(raw);inp.chmod(0o644)
  out=d/'out'
  if invalid:
   out.mkdir(mode=0o777);out.chmod(0o777);(out/'summary.txt').write_bytes(b'preserve existing\n');(out/'summary.txt').chmod(0o666)
  env={**os.environ,'ASAN_OPTIONS':'detect_leaks=1:halt_on_error=1:abort_on_error=1','UBSAN_OPTIONS':'halt_on_error=1:print_stacktrace=1'}
  p=subprocess.run([self.exe,'--data',str(data),'--out',str(out),*args],capture_output=True,timeout=60,env=env,cwd=d)
  # spawn errors raise; signals and sanitizer diagnostics always fail, even invalid cases.
  assert p.returncode>=0,(label,p.returncode,p.stderr)
  assert not re.search(rb'AddressSanitizer|UndefinedBehaviorSanitizer|LeakSanitizer|runtime error:',p.stderr), (label,p.stderr)
  assert not p.stdout,(label,p.stdout)
  assert inp.read_bytes()==raw,label
  if invalid:
   assert p.returncode==1 and p.stderr.startswith(b'error: '),(label,p.returncode,p.stderr)
   assert (out/'summary.txt').read_bytes()==b'preserve existing\n'
   expected=None
  else:
   assert p.returncode==0 and not p.stderr,(label,p.returncode,p.stderr)
   expected=oracle(raw)
   if golden is not None:assert expected==golden,('oracle versus public golden',label)
   assert sorted(x.name for x in out.iterdir())==['summary.txt'],label
   actual=(out/'summary.txt').read_bytes();assert actual==expected,(label,actual[:500],expected[:500])
   if reference:
    ro=d/'reference';ref.main(data,ro)
    assert (ro/'summary.txt').read_bytes()==actual,('official reference differential',label)
  self.results.append({'label':label,'inputSha256':hashlib.sha256(raw).hexdigest(),'outputSha256':hashlib.sha256(expected).hexdigest() if expected is not None else None,'referenceCompared':reference,'invalidDefense':invalid})

def main():
 exe=sys.argv[1];work=Path(os.environ['INTEGRATION_TEST_DIR']);suite=Suite(exe,work)
 suite.run('empty',b'',golden=b'',reference=True)
 suite.run('public worked example',public.WORKED_INPUT.encode(),golden=public.WORKED_OUTPUT.encode(),reference=True)
 suite.run('public all-edge fixture',public.edge_input().encode(),golden=public.EDGE_OUTPUT.encode(),reference=True)
 # A deliberate cross-hour trap: per-endpoint percentiles would be wrong.
 raw=line(1,latency=4000000000)+line(0,latency=0,status=500)+line(0,latency=10)+line(0,latency=20)
 suite.run('per-hour isolation and one-third ppm',raw,reference=True)
 for n in [1,2,3,7,19,20,21,99,100,101,199,200,201,1001]:
  raw=b''.join(line(latency=i,status=500 if i%3==0 else 499) for i in range(n,0,-1))
  suite.run(f'rank transitions {n}',raw,reference=True)
 names=['/','/A','/a','/v2/orders','/v2/orders-export','/v2/orders.csv','/v2/orders/{id}','/v2/orders/{id}/items','/v2/ordersByDate','/v2/orders_legacy','/v2/orderstatus','/v2/rank100','/v2/rank20',gen.LONGEST_ENDPOINT,'/'+'a'*123+'z','/'+'a'*123+'Z']
 boundary=b''.join(line(h,ep,st,v,m) for h in [71,30,29,6,5,1,0] for ep in reversed(names) for st,v,m in [(100,0,'OPTIONS'),(499,1,'HEAD'),(500,4294967295,'DELETE'),(599,2,'PATCH')])
 for size in [*range(1,33),63,64,65,124,125,126,127,128,129,255,256,257,1048576,16777216]:
  suite.run(f'buffer {size}',boundary,['--buffer-size',str(size)])
 suite.run('all statuses and methods',b''.join(line(ep='/status',status=i,latency=i,method=gen.METHODS[i%7]) for i in range(100,600)),reference=True)
 for mode,values in [('equal',[7]*201),('sorted',list(range(201))),('reversed',list(range(200,-1,-1))),('extreme',[0,4294967295]*101)]:
  suite.run(mode,b''.join(line(latency=v,status=599) for v in values),reference=True)
 for seed in range(16):
  rng=random.Random(seed);raw=b''.join(line(rng.randrange(72),rng.choice(names),rng.randrange(100,600),rng.randrange(2**32),rng.choice(gen.METHODS),rng.randrange(3600000000)) for _ in range(1000))
  suite.run(f'independent seed {seed}',raw,reference=True)
 for seed in [1,2,7,19,2026]:
  generated=work/f'generated-{seed}';gen.generate(seed,'tiny',generated)
  raw=(generated/'requests.log').read_bytes()
  if seed==1:assert hashlib.sha256(raw).hexdigest()=='a99dd14856a3e6e408097dabc1b3ad5ac5a3801fb12f388bacb2802c8591339f'
  suite.run(f'official tiny seed {seed}',raw,reference=True)
  if seed==1:assert suite.results[-1]['outputSha256']=='c24fa507c963eaeac9224fd8435019b4f4e8c002ece7e32f316681a3957eb92f'
 generated=work/'generated-sample';gen.generate(1,'sample',generated)
 raw=(generated/'requests.log').read_bytes()
 assert hashlib.sha256(raw).hexdigest()=='7b22c678acceba2b82120394afe27e827ca4083a677a8e51147defa854c86847'
 suite.run('official sample seed 1',raw,reference=True)
 assert suite.results[-1]['outputSha256']=='ca6311bbeb536fa55d85265bf6fd3d24cc9586f13de1ac73bd2a23ac3893aac3'
 good=line()
 malformed=[b'\n',good[:-1],good.replace(b'\n',b'\r\n'),good.replace(b' GET ',b'  GET '),good.replace(b'GET',b'BOGUS'),good.replace(b'/a',b'/\x80'),good.replace(b'/a',b'/\t'),good.replace(b'/a',b'a'),good.replace(b'/a',b'/' + b'a'*125),good.replace(b' 200 ',b' 99 '),good.replace(b' 200 ',b' 600 '),good.replace(b' 200 ',b' 0200 '),good.replace(b' 1\n',b' 01\n'),good.replace(b' 1\n',b' 4294967296\n'),good.replace(b'10-30',b'02-30'),good.replace(b'000000Z',b'00000Z'),good.replace(b'/a',b'/a\x00')]
 for i,raw in enumerate(malformed):suite.run(f'defensive malformed {i}',raw,invalid=True)
 for i,args in enumerate([['--contract','local-v1'],['--input','x'],['--buffer-size','0'],['--buffer-size','16777217'],['--buffer-size','1','--buffer-size','2'],['--unknown','x'],['--data']]):
  suite.run(f'defensive cli {i}',good,args,invalid=True)
 result={'passed':True,'checks':len(suite.results),'skips':0,'officialReferenceComparisons':sum(x['referenceCompared'] for x in suite.results),'cases':suite.results}
 Path(os.environ['INTEGRATION_TEST_RESULT']).write_text(json.dumps(result,indent=2)+'\n')
 print(f"PASS {result['checks']} official integration checks; {result['officialReferenceComparisons']} reference comparisons; 0 skips",flush=True)
if __name__=='__main__':main()
