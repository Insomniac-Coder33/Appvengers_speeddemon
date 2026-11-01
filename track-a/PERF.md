# Appvengers Track A — scalar versus buffered span

## Official board results

The scalar revision has an actual scored public-board result. Span's result is
pending this revision's push; no span board ID/score is invented.

| Revision | Run ID | Commit | Runtime s | Board memory bytes | Canonical S | D | K | Gates |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Scalar | `run-824fe231c4d5` | `ed04287b7273ca4269c574bfc18bb77b5b72ccee` | 1.704431 | 40960000 | 535 | 1 | 4.357021 | all passed |

Scalar board completion time: 2026-11-01T15:46:08Z. Source axes are marked measured by the
board; memory is its cache-excluded measure, distinct from local RSS/cgroup peak.
Exact scalar gates: `{"build": true, "check": true, "correctness": true, "sandbox": true, "timeout": true}`.
Public feed snapshot generated 2026-11-01T15:47:04Z; full record retained
in local comparison evidence. This is one public-seed run, not a holdout result.

## Preserved scalar baseline

Source: `e46b40c01364d334716341f713dbb5e035ce7b043ed1d42f7c849eccd026a62d`.
Optimized binary: `d657cea38aef5b76a1a286a3f558ba5006dbec3ec5ed0505faef3ce3a612d40b`.
Its 2026-10-31 verification passed 115 optimized + 115 ASan/UBSan cases, zero skips,
45 official-reference comparisons per suite, 36 sanitized uint64 ppm cases, 15
upstream Track A tests and the published full input/output hashes. The reviewed
14-file scalar package and original verification/checkpoints remain preserved.

## Current span implementation and identities

Single-worker buffered complete-record/field spans replace per-byte Parser state
dispatch and string append. A split record carries at most 176 bytes, derived
from the official grammar. Views do not escape a record call; endpoints still
become owning exact keys. Aggregation, per-(hour,endpoint) latency storage, sorting,
integer error_ppm, deterministic output, CLI and file protections are unchanged.
No mmap/SIMD/parallelism/PGO/catalogue or public-output special case is introduced.

| Identity | Span revision |
| --- | --- |
| Source SHA-256 | `176e94ac440d0fa7c512ccb7221d0b0fe4d90550a6fd080d4be5f95e69b809cf` |
| Optimized binary SHA-256 | `691f754f912f08337c48c35fe48206e759621c35add4badceacb5e6877f94c6b` |
| Sanitizer binary SHA-256 | `00a56cff390848121823e64f177958aaeb69434a2110d06e1201cc02ea7113c7` |
| Compiler | g++ (GCC) 15.3.0, Linux/amd64 |
| Compiler base image | gcc:15@sha256:eb5e64286ad47187b32bda75c6b6916166ecb41da56559b8b09e0001748d2cce |
| Runtime base image | debian:13-slim@sha256:62bd423aeee912639ca8ee681c2b762cb3e25137e0a92b20be455898a9f034ad |
| Optimized flags | -std=c++20 -O2 -DNDEBUG -Wall -Wextra -Wpedantic |
| Sanitizer flags | -std=c++20 -O1 -g -fno-omit-frame-pointer -fsanitize=address,undefined -fno-sanitize-recover=all -Wall -Wextra -Wpedantic |
| Direct third-party runtime dependencies | 0; standard library only |

Fresh changed-revision verification: **138 optimized + 138 ASan/UBSan cases**, zero
skips; **59 official-reference comparisons per suite**, independent histogram
oracle, public worked/edge goldens, maximum-line and buffer boundaries, additional
tiny seeds 3/11/42 and sample 7, growing shared-prefix groups and retained file
alias protections. Fatal sanitizer policies reject signals, captured execution
errors and diagnostics even in expected-invalid cases.

The published full input SHA-256 is
`7ec80ba45bceef51ac7f79d3a14521fc6187b2dcb87b5e5542d08063fe5d962a`
(238,836,234 bytes). Both revisions produced expected summary.txt SHA-256
`495ca09682b9673ef836a506496177680bb4a3af54255174befddb1f83481cd3`
(126,908 rows / 10,113,024 bytes). The span's fresh offline image passed the full
no-argument run with TRACK=a, uid65534, readonly input/root, no network, 8 GiB/no
extra swap, 512 PIDs, capabilities dropped and bounded /tmp.

## Local performance evidence — not board results

2026-11-01 baseline diagnostic profile identified parsing/aggregation as dominant.
Exactly one focused candidate was implemented and six adjacent pairs measured
serially with alternating order, identical GCC15/O2 flags, CPU 0 and warm ext4
staging. Complete-program timing includes normal output flush/close and teardown;
Docker startup, instrumentation and hash verification are outside paired timing.

| Local metric | Scalar | Span |
| --- | ---: | ---: |
| Median complete-program wall seconds | 1.865207 | 1.155213 |
| Individual timing spread (range/median) | 9.92% | 23.71% |
| Median process RSS, KiB | 32678 | 32616 |
| Fresh-container memory.peak bytes | 41594880 | 41996288 |
| Source bytes / physical C++ lines | 20341 / 520 | 19156 / 465 |

All six pairs favored span: geometric paired ratio 1.577961x
(36.63% less elapsed time), range
1.441x..1.696x. No favorable-result reruns or second candidate.
Timings are noisy VM observations; CPU user+system accounting exceeded monotonic
wall time for both versions and was retained as a limitation. RSS and cgroup peak
are separate measures; neither is substituted for board cache-excluded memory.
Canonical source tools were unavailable locally, so raw source counts are not S.
Source/memory-neutral estimated relative K was 1.2562x, not an official score.

No additional local benchmarking is part of the board comparison. Only actual
scored board records can establish the event K difference. See [README.md](README.md)
for complete offline build, official invocation, checksums and reference reproduction.

## Development provenance and limitations

Earlier local-v1 scalar and endpoint-span experiments remain preserved with their
own contracts and noisy/inconclusive timings. They are not official-format proof.
The owner reports organizer permission for early development; its precise exception
scope and submission declaration remain unverified here. Existing history is
preserved and no claim is made that all development began after kickoff.

Each board push is one public-seed run, not a statistically controlled campaign or
hidden-holdout guarantee. Compiler/platform, queue conditions, formatted S and board
memory may differ from local results. No new optimization or track is started.

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

## Assembled span package verification

The complete submission README's six reproduction command blocks were retained.
A fresh final-context offline GCC15 build produced the verified span binary
`691f754f912f08337c48c35fe48206e759621c35add4badceacb5e6877f94c6b` and passed worked-example and empty-input constrained
no-argument smoke tests. Inventory, metadata, relative links and secret-pattern
checks passed. The changed revision's 138+138 tests and full public hash were
reused by exact source/build/binary identity; no local benchmark was rerun.
