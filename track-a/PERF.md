# Track A — Appvengers verification and performance record

## Official board results

**No scored scalar baseline is available yet.** The actual initial board run
`run-c3de49dcc0ea` failed image-size before execution; no runtime, memory, S, D or K
was produced. Its failure and the common runtime repair are recorded below.
Local checks remain separate from scored board results.

## Local development history

Earlier scalar C++20 work used owning endpoint identity, compact uint32 latency
storage and independent correctness checks under a provisional local-v1 contract.
An isolated endpoint-span parser experiment was correctness-verified for that
contract, but noisy paired timings and an identical-binary A/A control did not
establish a repeatable improvement. It was not selected for this delivery revision.
Early development dates/provenance are preserved in local archives; organizer
eligibility resolution remains pending. None of those old timings establishes
performance for the official-format package.

On 2026-10-31, the scalar baseline was integrated with the released specification:
all statistics now belong to (hour, endpoint), summary.txt uses exact hour/endpoint
ordering and integer error_ppm, and the official invocation needs no arguments.
No solver optimization or timing campaign was run for this integration.

## Applicable verified revision — 2026-10-31

| Identity | Value |
| --- | --- |
| Compiler | g++ (GCC) 15.3.0, Linux/amd64 |
| Base image | gcc:15@sha256:eb5e64286ad47187b32bda75c6b6916166ecb41da56559b8b09e0001748d2cce |
| Source SHA-256 | `e46b40c01364d334716341f713dbb5e035ce7b043ed1d42f7c849eccd026a62d` |
| Optimized binary SHA-256 | `d657cea38aef5b76a1a286a3f558ba5006dbec3ec5ed0505faef3ce3a612d40b` |
| Sanitizer binary SHA-256 | `c92e2559c405720124e72e06fd00b0e7a9ff587c315f94d084d50c27ad933afc` |
| Integration image ID | `sha256:481a350a96fc0d6d6cc7bc9296f6056b745267cb9b29654f24c4ab22b5a446c5` |
| Optimized flags | -std=c++20 -O2 -DNDEBUG -Wall -Wextra -Wpedantic |
| Sanitizer flags | -std=c++20 -O1 -g -fno-omit-frame-pointer -fsanitize=address,undefined -fno-sanitize-recover=all -Wall -Wextra -Wpedantic |

Fresh integration evidence: **115 optimized + 115 ASan/UBSan checks**, zero skips;
**45 official-reference differentials per suite**; **36 sanitized uint64 rate
arithmetic comparisons**; **15 unmodified upstream Track A tests**. An independent
histogram oracle and public hand-derived goldens checked the reference comparisons.
Fatal sanitizer options were enabled; signals, captured-process errors and
sanitizer diagnostics were failures, including expected-invalid cases.

The public full input contained 238,836,234 bytes; its SHA-256 was
`7ec80ba45bceef51ac7f79d3a14521fc6187b2dcb87b5e5542d08063fe5d962a`.
The output contained 126,908 lines / 10,113,024 bytes; its SHA-256 was
`495ca09682b9673ef836a506496177680bb4a3af54255174befddb1f83481cd3`.
Both matched the published checksums. The run used no program arguments, TRACK=a,
uid/gid65534, readonly root and input, no network, all capabilities dropped,
no-new-privileges, 8 GiB memory/equal memory-swap, 512 PIDs and 1 GiB /tmp.
It exited zero without OOM or stdout/stderr and had an exactly empty filesystem diff.

Local clean offline integration build: **10.809629 seconds**,
within the 600-second cap. Docker reported image size **552,659,174 bytes**;
unpacked apparent root size **1,535,424,675 bytes**. These are
packaging observations, not runtime speedups or standardized board measurements.
Process RSS and fresh cgroup memory.peak were not measured for this revision.

## Submission packaging validation

Only README/PERF, team metadata and licensing differ from the verified candidate.
The source, Dockerfile, build.sh and .dockerignore are identical. A fresh result
path is used for a clean offline build and focused official-invocation correctness
smoke test of this final context. Its completed packaging results appear below. Existing optimized/sanitizer/reference/full-hash
results are reused only after their source/build/binary identities are checked.

Reproduction: see [README.md](README.md) for build, constrained execution,
public checksums and independent reference comparison commands. The original
verifier and raw results remain in local development archives and are excluded
from the submission payload. No fabricated board ID is used in their place.

### Completed local final-package check — 2026-10-31T09:22:25.218375+00:00

Clean offline rebuild from a fresh isolated track context: **9.468287
seconds**; Docker reported size **552,659,169 bytes**. Fresh final-package
image: `sha256:81a7c01ef7f17ef36a8b8f965bf3ce88e08abcd74aebeb2960276aa50691bc0b`. The optimized binary SHA-256 was
`d657cea38aef5b76a1a286a3f558ba5006dbec3ec5ed0505faef3ce3a612d40b`, **identical to the verified integration executable**.
The current allowlist check, runtime-library resolution, metadata and exact
file-inventory audit passed. The public worked-example and empty-input smoke
tests each passed in a separate fresh constrained uid65534 container, using the
official no-argument entrypoint. Each exited 0, produced only the exact expected
summary.txt, preserved its readonly input, and had an empty filesystem diff.

This final packaging check reuses the unchanged revision's correctness,
sanitizer and full-public-hash results above. It does not claim a new full-suite
or full-dataset execution, board runtime, memory measurement or speedup.
After these checks, this documentation paragraph was added; build inputs and
binary identity did not change. Raw validation results are preserved locally
outside the publish inventory. No official board run ID is available.

## Initial scalar board failure and common runtime repair

Actual run `run-c3de49dcc0ea`, commit
`3ce1131c9d4729771b907b0a0da28aca0a7adfa9`, failed stage `image-size`.
Dockerfile check passed; image was 2,176,579,120 bytes, above 2,147,483,648.
No correctness execution, runtime, memory, source count, D or K was produced.
This failure is preserved and is not treated as a scored scalar baseline.
Both compared revisions use the same new pinned Debian13 slim runtime stage,
copying the executable and exact GCC15 libstdc++/libgcc dependencies from the
compiler stage. Compiler flags and solver source bytes do not change. New runtime
verification is required; old GCC-container passes alone do not prove this runtime.

Runtime repair validation: unchanged scalar binary `d657cea38aef5b76a1a286a3f558ba5006dbec3ec5ed0505faef3ce3a612d40b`; all five production runtime library hashes match the verified GCC image. Exported final-layer total 84786688 bytes. Fresh constrained full public hash passed in the new runtime. The original source/sanitizer checks remain applicable by exact executable and production-library identities; no old image-size estimate is substituted for the board's accounting.
