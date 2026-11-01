# Appvengers — Track A (Ingest)

C++20; C++ standard library only; zero direct third-party runtime dependencies.
Licensed under [MIT](../LICENSE). The pinned GCC image supplies the compiler. A pinned Debian13 slim runtime
stage contains the executable and copied GCC libstdc++/libgcc runtime libraries,
plus Debian libc/loader; nothing is downloaded during the offline build.

## Approach and contract

Read `/data/requests.log`, aggregate each exact **(UTC hour, endpoint)** group,
and write only `/out/summary.txt`. A scalar streaming parser uses a 1 MiB input
buffer. Owning endpoint strings preserve full byte identity. Each group stores
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

The exact source/build recipe passed 115 optimized and 115 ASan+UBSan checks
(zero skips), with 45 official-reference comparisons per suite, 36 sanitized
uint64 rate-arithmetic cases and 15 upstream Track A tests. Tests covered five
official tiny seeds, the published seed-1 sample, 16 independent random seeds,
rank boundaries, full-range latencies, methods/statuses, shared prefixes, month/hour
boundaries, empty input, malformed-input defenses and buffers from 1 byte to 16 MiB.
The full public input and output hashes above matched in a constrained uid65534
container with an empty filesystem diff. [PERF.md](PERF.md) records dates,
identities and local measurements separately from official board results.

The source and build inputs are unchanged in this submission package; only its
docs, team metadata and MIT license were prepared for delivery. The original
verification machinery and raw logs are preserved locally outside the package.
The shell/container/reference commands above reproduce a focused correctness gate
without those development archives. This package has no scored official board run
or hidden-holdout result. Memory grows with requests and populated groups; output
replacement is not transactional after write errors. Malformed input is outside
the official guaranteed input domain. Buffer parsing is scalar and uses one worker.

## Next 24 hours

Review the final file allowlist and early-development eligibility provenance,
then place the reviewed files on the existing repository's `speed-demon` branch
when authorized. Obtain genuine board results and append their actual run IDs
and measurements to PERF.md. No publication or remote operation is implied by
this local preparation.

## Board image-size repair

The initial scalar commit 3ce1131 failed only the board image-size gate before
execution: 2,176,579,120 bytes versus the 2,147,483,648-byte cap. Local content-store
Size and apparent-root figures underestimated the board's cumulative layer size.
Both scalar and span now use this identical two-stage GCC15/Debian13 slim recipe.
Compiler flags and each revision's solver bytes remain unchanged. Required GCC
standard runtime libraries are copied from the pinned compiler stage with links
dereferenced. No compiler build history/layers are inherited by the runtime stage.
This is a packaging compatibility repair, not a solver optimization or speedup.
