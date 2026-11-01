# Official line-span experiment — local results, 2026-11-01

No official board run ID or score exists for this revision. The scalar official
baseline remains preserved and is not overwritten. The only solver change is
buffered contiguous-record/span parsing with a <=176-byte split-record carry;
aggregation, quantiles, output and O2 flags are unchanged.

Fresh verification: 138 optimized + 138 ASan/UBSan checks, zero skips, 59 official
reference comparisons per suite, additional generator seeds, maximum record and
buffer boundaries, shared prefixes and file aliases. The candidate's full public
summary.txt SHA-256 matched 495ca09682b9673ef836a506496177680bb4a3af54255174befddb1f83481cd3,
including a new clean offline GCC15 image's no-argument constrained full run.

Exactly six alternating adjacent complete-program pairs on the same warm full
input, GCC15 flags, ext4 staging and CPU 0: paired geometric speed ratio
1.577961x; wall-time reduction 36.63%. Every pair favored this
candidate, ranging 1.441x..1.696x. Baseline/candidate individual
wall spreads were 9.92%/23.71%.
These are noisy local VM observations, not standardized board measurements.
No favorable reruns, second candidate or repeated A/A campaign occurred.

Median process peak RSS: 32678/32616 KiB
(baseline/candidate). Separate fresh-container cgroup memory.peak:
41594880/41996288 bytes.
Cgroup peak includes runtime/kernel/charged cache; it is not process RSS or the
board's cache-excluded memory. Neither run had cgroup memory limit/OOM events.

Source bytes: 20341 -> 19156; physical C++ lines:
520 -> 465. Canonical formatter/scc image was
unavailable. Source-neutral and memory-neutral estimated relative K is 1.2562x;
this is not an official score, and no unformatted-count credit is taken.
CPU user+system accounting exceeded monotonic wall time on this VM, including
baseline runs; raw telemetry and this limitation are retained in the local report.

Source SHA-256: 176e94ac440d0fa7c512ccb7221d0b0fe4d90550a6fd080d4be5f95e69b809cf
Optimized binary SHA-256: 691f754f912f08337c48c35fe48206e759621c35add4badceacb5e6877f94c6b
Sanitizer binary SHA-256: 00a56cff390848121823e64f177958aaeb69434a2110d06e1201cc02ea7113c7

Decision: recommend this correctness-verified candidate for the next authorized
board comparison. Preserve the scalar default until official gates/accounting.
Detailed frozen evidence and reproduction commands are in the local experiment
artifacts/experiments/official-a-perf-2026-11-01/REPORT.md outside this build context.
