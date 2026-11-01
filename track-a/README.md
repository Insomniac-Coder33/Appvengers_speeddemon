# Appvengers — Track A (Ingest)

C++20; C++ standard library only; zero direct third-party runtime dependencies.
Licensed under [MIT](../LICENSE). The pinned GCC image supplies the compiler. A pinned Debian13 slim runtime
stage contains the executable and copied GCC libstdc++/libgcc runtime libraries,
plus Debian libc/loader; nothing is downloaded during the offline build.

## Approach and contract

Read `/data/requests.log`, aggregate each exact **(UTC hour, endpoint)** group,
and write only `/out/summary.txt`. A buffered line-span parser uses a 1 MiB input
buffer. Complete LF records and their fields are views into that buffer; split
records carry at most 176 bytes, the maximum valid record length excluding LF.
Timestamp, method and numeric fields are parsed from spans, and each endpoint is
assigned once into a reusable owning string before the unchanged owning-key
aggregation. Views never survive a record call. Owning endpoint strings preserve
full byte identity. Each group stores
uint32 latencies and uint64 request/error counters; latencies are sorted in full.
Nearest-rank p50/p95/p99 use ceil(p*n/100). Errors are statuses 500..599 inclusive;
error_ppm is floor(errors*1000000/count), using overflow-safe integer arithmetic.
Output is hour-first, then unsigned-byte endpoint order, eight single-space
fields with decimal integers and LF endings. Empty input yields an empty file.
Methods do not change grouping; duplicates count separately. No fixed catalogue,
precomputed answers, time-order or bounded-disorder assumptions are used.

Contract: [released Track A specification](https://github.com/hackathon-raptors/speed-demon-2026/blob/ad1f06063a76bf94066f169e133ec0c2e1485b65/specs/a-ingest.md).
Reference/generator/harness revision: `ad1f06063a76bf94066f169e133ec0c2e1485b65`.
Metadata template revision: `430d690ec0959ae15e05f6c643ffc76a9e9bb923` from the official starter.

## Offline build and official invocation

Requirements: Linux/amd64 Docker Server, shell and sha256sum. Run the commands
from this `track-a/` folder. Provisioning the base image uses the network once;
the subsequent build and execution are offline.

```sh
docker pull --platform=linux/amd64 gcc:15@sha256:eb5e64286ad47187b32bda75c6b6916166ecb41da56559b8b09e0001748d2cce
docker pull --platform=linux/amd64 debian:13-slim@sha256:62bd423aeee912639ca8ee681c2b762cb3e25137e0a92b20be455898a9f034ad
docker build --pull=false --no-cache --network=none --platform=linux/amd64 -t appvengers-track-a .
```

Set `TRACK_A_DATA` to an absolute directory containing the input. The commands
below use a new output directory on each invocation, writable by uid 65534.
The input directory and requests.log must also be readable/traversable by that uid.
No dataset or output belongs in this source folder.

```sh
TRACK_A_DATA=/absolute/path/to/input-directory
TRACK_A_OUT=$(mktemp -d /tmp/appvengers-track-a-out.XXXXXX)
chmod 0777 "$TRACK_A_OUT"
docker run --rm --network=none --read-only   --user 65534:65534 --cap-drop=ALL --security-opt=no-new-privileges   --memory=8g --memory-swap=8g --pids-limit=512   --ulimit nofile=8192:8192 --tmpfs /tmp:rw,size=1g,exec   -e TRACK=a -v "$TRACK_A_DATA:/data:ro" -v "$TRACK_A_OUT:/out:rw"   appvengers-track-a
sha256sum "$TRACK_A_OUT/summary.txt"
```

The program takes **no arguments** for the official invocation. Native-only
convenience options are `--data DIR`, `--out DIR`, and `--buffer-size N`
(1..16777216). For local native compilation: `CXX=g++ sh build.sh`, then
`./build/track-a --data /absolute/input-directory --out /absolute/output-directory`.
Native compilation needs a C++20 compiler and its matching runtime; the verified
route uses g++ (GCC) 15.3.0 inside the pinned image. Node/Python are not solver
runtime dependencies.

## Reproduce the public full correctness gate

Obtain the input from the official [board dataset links](https://speeddemon.dev/board/)
and check the input before running. A direct download to a temporary directory:

```sh
TRACK_A_DATA=$(mktemp -d /tmp/appvengers-track-a-data.XXXXXX)
chmod 0755 "$TRACK_A_DATA"
curl -fL --max-time 600 -o "$TRACK_A_DATA/requests.log"   https://s3.amazonaws.com/raptors.dev/speeddemon.dev/2026/data/track-a/full-seed1/requests.log
printf '%s  %s\n' 7ec80ba45bceef51ac7f79d3a14521fc6187b2dcb87b5e5542d08063fe5d962a "$TRACK_A_DATA/requests.log" | sha256sum -c -
```

Run the container command above with this `TRACK_A_DATA`, then verify:

```sh
printf '%s  %s\n' 495ca09682b9673ef836a506496177680bb4a3af54255174befddb1f83481cd3 "$TRACK_A_OUT/summary.txt" | sha256sum -c -
```

For small independently generated data, fetch the exact official source outside
this folder (curl, tar and Python 3.11+ are development tools only):

```sh
TRACK_A_OFFICIAL=$(mktemp -d /tmp/appvengers-official.XXXXXX)
curl -fL --max-time 90 -o "$TRACK_A_OFFICIAL/official.tar.gz" https://codeload.github.com/hackathon-raptors/speed-demon-2026/tar.gz/ad1f06063a76bf94066f169e133ec0c2e1485b65
tar -xzf "$TRACK_A_OFFICIAL/official.tar.gz" --strip-components=1 -C "$TRACK_A_OFFICIAL"
chmod 0755 "$TRACK_A_OFFICIAL"
python3 "$TRACK_A_OFFICIAL/generators/a_ingest.py" --seed 7 --scale tiny --out "$TRACK_A_OFFICIAL/tiny-data"
python3 "$TRACK_A_OFFICIAL/reference/a_ingest.py" --data "$TRACK_A_OFFICIAL/tiny-data" --out "$TRACK_A_OFFICIAL/reference-out"
TRACK_A_DATA="$TRACK_A_OFFICIAL/tiny-data"
```

Run the earlier container command with this `TRACK_A_DATA` into a **new**
`TRACK_A_OUT` (omit its example assignment of `/absolute/path/...`), then compare:

```sh
cmp "$TRACK_A_OFFICIAL/reference-out/summary.txt" "$TRACK_A_OUT/summary.txt"
```

Do not use the public full expected hash for other seeds or scales.

## Verification and limits

The current span source/build recipe passed **138 optimized and 138 ASan+UBSan
checks**, zero skips, with **59 official-reference comparisons per suite**. Public
worked/edge goldens and an independent histogram oracle checked outputs. Coverage
includes the original official seed/fixture cases, additional tiny seeds 3/11/42
and sample seed 7, full 176-byte records spanning read buffers, growing shared-prefix
endpoint sets, numeric/control/final-LF defenses and hardlink/symlink/FIFO aliases.
The integer ppm function is unchanged; its earlier 36 uint64 arithmetic checks
remain applicable. The scalar predecessor separately passed 115+115 checks and
15 upstream Track A tests; those are historical baseline proof, not fresh span tests.

The span source also passed the public full input/output hashes above using a fresh
clean offline image and constrained no-argument run. [PERF.md](PERF.md) records exact
source/binary identities and local results separately from genuine board results.
Only Parser/ingest changed in the solver; aggregation, quantiles, serialization,
CLI, build flags and dependencies remain unchanged. The original verifier and raw
evidence remain preserved locally outside the submission.

Current source SHA-256: `176e94ac440d0fa7c512ccb7221d0b0fe4d90550a6fd080d4be5f95e69b809cf`.
Optimized binary SHA-256: `691f754f912f08337c48c35fe48206e759621c35add4badceacb5e6877f94c6b`.
Sanitizer binary SHA-256: `00a56cff390848121823e64f177958aaeb69434a2110d06e1201cc02ea7113c7`.

The complete build/run/checksum/reference commands above remain valid. The focused
local campaign used six alternating adjacent pairs on warm ext4-staged public input,
pinned to CPU 0 with identical GCC15 flags. Every pair favored span; paired geometric
speed ratio was **1.577961x**, with material VM timing noise.
These local observations are not official runtime, K, memory or hidden-holdout proof.
No speedup is inferred from compiler or storage changes.

Memory grows with requests and populated groups; output replacement is not
transactional after write errors. Malformed input is outside the official guaranteed
domain; overlong invalid records now fail earlier. Parsing remains single-worker,
with no mmap, SIMD, catalogue hardcoding or bounded-disorder assumption.

## Next 24 hours

Complete the authorized scalar-versus-span board comparison on `speed-demon`,
record actual scored run IDs and all gates in PERF.md, and retain the stronger
verified revision through ordinary commits. Keep the complete reproduction
instructions, provenance and existing history. No further optimization or track
is part of this comparison.

## Board image-size repair

The initial scalar commit 3ce1131 failed only the board image-size gate before
execution: 2,176,579,120 bytes versus the 2,147,483,648-byte cap. Local content-store
Size and apparent-root figures underestimated the board's cumulative layer size.
Both scalar and span now use this identical two-stage GCC15/Debian13 slim recipe.
Compiler flags and each revision's solver bytes remain unchanged. Required GCC
standard runtime libraries are copied from the pinned compiler stage with links
dereferenced. No compiler build history/layers are inherited by the runtime stage.
This is a packaging compatibility repair, not a solver optimization or speedup.

## Official scalar baseline result

Scalar commit `ed04287b7273ca4269c574bfc18bb77b5b72ccee`, board run `run-824fe231c4d5`:
all gates passed, 1.704431 s, 40960000 bytes board memory,
canonical S=535, D=1, K=4.357021. This README describes
the span revision being compared; its own board result is pending. See PERF.md
for actual results, local comparison evidence and limitations.
