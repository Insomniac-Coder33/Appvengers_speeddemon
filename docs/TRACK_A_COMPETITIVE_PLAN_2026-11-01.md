# Appvengers: Track A competitive plan

Prepared 1 November 2026 from the current solver, preserved verification records
and the public board snapshot at 2026-11-01T14:31:27Z. This is a proposed execution
plan, not a record of completed optimizations or a prediction of a prize.

## Current position

- The official-format scalar C++20 solver has 115 optimized and 115 sanitizer
  checks, public full-output hash verification and final-package smoke evidence.
- Team Appvengers and MIT licensing are confirmed. The Board app is installed.
- The public feed confirms Appvengers is registered for Track A, but its watcher
  reports `no speed-demon branch yet`; best/latest runs are absent.
- A separate local `speed-demon` worktree is prepared at
  `.tools/speed-demon-worktree/`, based on the existing Git history. Its reviewed
  working snapshot has 14 files. It is not staged, committed or pushed.
- The feed snapshot contains 120 scored Track A teams. The highest reported K is
  56.901008, with 0.016091 seconds and 16.46 MiB measured memory. This is a public
  board observation, not a holdout result, an inferred implementation technique,
  or our own performance. There is no measured gap for our current solver yet.
- The old M2 ingestion profile and M3/M4 timing noise concern local-v1. They are
  hypotheses and measurement warnings; they do not profile the official revision.

Snapshot and summary: `artifacts/competitive-review-2026-11-01/board.json` and
`summary.json` in the preserved workspace.

## Prize strategy and deadline

Keep Track A as the implementation focus. A-only cannot enter the overall podium,
which needs three tracks. The directly relevant opportunities are highest K on A
($50) and a separate public optimization write-up ($100 for each of two winners).
No probability of winning can be established from correctness checks alone.
Adding two competitive tracks now is a major scope increase for one developer.

Freeze: **2 November 2026, 20:30 IST** (15:00 UTC). Stop structural experiments by
18:30 IST; aim for the final reviewed push by 19:30 IST, allowing build/queue
recovery. Make the licensed repository public by freeze as the conservative
delivery target. The published rules allow a one-hour visibility grace period.
The separate write-up deadline is 10 November; collect evidence before freeze.

## Highest-priority backlog

1. Publish the already reviewed baseline on the remote `speed-demon` branch after
   commit/push authorization. Capture the real run ID, commit, runtime, measured
   memory, formatted source count, D, K and every gate result. Fix any gate failure
   before performance work is promoted. App installation and registration are done.
2. Profile the current official revision in Linux on the public full input.
   Separate parsing/aggregation, quantile/order work and serialization; phase
   instrumentation belongs only in a diagnostic build. Profile end-to-end too.
3. Build and compare changes one at a time, preserving the verified fallback.
   Use current official-format tests. Never treat passing local-v1 tests as proof
   that a changed official solver is correct.
4. Replace the current provisional PERF narrative with real board-linked steps
   as results arrive. Include unsuccessful changes, reasons for rollback and
   limitations, without turning local observations into official measurements.

## Implementation experiments, in order

The source locations below describe the unchanged official baseline. Priorities
are code-review hypotheses; the fresh profile can reorder them.

### A. Compiler and output costs: small controlled experiments

- Measure GCC15 `-O3` against the current `-O2`; keep flags identical otherwise.
  Do not bundle PGO, CPU flags and code changes into that comparison. Do not assume
  `-flto` helps a single translation unit, or that native flags are portable.
- In `serialize_summary`, batch rows into a bounded output buffer and use
  `to_chars` into that buffer. The current code performs numerous stream calls
  per row for a roughly 10 MB output. Flush a block at a time and retain all
  output-error checks, exact bytes and normal file close inside the measured run.
- In `error_ppm`, consider ordinary multiplication/division when
  `errors <= UINT64_MAX / 1000000`, retaining the verified overflow-safe fallback
  otherwise. Recheck uint64 boundary arithmetic. Measure this separately; it runs
  per group, not per input byte, so its possible overall benefit is limited.

### B. Parsing: primary architectural opportunity

The current loop calls `Parser::consume` for every byte, branches on field/state,
copies timestamp bytes, and appends endpoint and method bytes individually.

Implement a separate contiguous-span parser: find delimiters in blocks, exploit
the published fixed timestamp layout, parse numbers directly, and pass endpoint
spans to aggregation. Test read-only mmap plus a portable buffered fallback, or a
buffered line-span implementation first. Mmap itself is an experiment, not an
assumed speedup. Avoid copying a repeated endpoint merely to look it up.

Preserve the exact valid-input contract and existing documented failure behavior
where tests require it. Bound every load; no vector read past a mapping or buffer.
Handle a record spanning buffers, first/last records and the final LF explicitly.
Never encode known endpoints, exact public-file contents or precomputed answers.

### C. Aggregation layout and allocation

The current `Aggregates::add` performs endpoint lookup plus group lookup per
request; every populated group owns a separately growing latency vector.

Measure transparent endpoint lookup, intern-once names, suitable reserves and a
compact group layout. Consider a dense endpoint/hour index or flat table if the
profile justifies it. Derive keys from input and the published schema, not a
public-dataset endpoint catalogue. Retain uint32 latencies, uint64 counts and
overflow-safe rates. Reserve based on measured runtime information or defensible
general bounds; document excessive-memory tradeoffs.

For view-based keys, the backing mapping/storage must remain alive until sorting
and serialization finish. Hash collisions must still compare exact endpoint
bytes. Do not keep a reference into a vector whose reallocation invalidates it.

### D. Parallelism, conditional on the measured serial result

If parsing/aggregation remains dominant, test 2/4/6 workers, then additional
hardware threads only if useful. Split read-only input at complete-record
boundaries. Use private worker state or partition group ownership; avoid a shared
locked hash map in the hot loop. Include all merging and output in elapsed time.

Retain each original latency for an exact group quantile; per-worker percentile
averages cannot be merged into correct global percentiles. Count duplicated
records separately. Account for worker tables, duplicated names, temporary merge
storage and allocator peaks. Promote based on K, not thread count or speed alone.

### E. Quantiles and advanced tuning, only where justified

There are 126,908 groups for 3.1 million public records: the average group has only
about 24 records, with a skewed distribution. Replacing every sort with repeated
selection can lose on the many small groups. Measure a hybrid small-group sort
and large-group exact multi-selection approach if quantile work is material.

Hand-written AVX2, radix selection, custom allocation and PGO are late options
with specific hypotheses. PGO may use permitted generator output, requires both
offline training and final build within the build cap, and must generalize across
seeds. Keep CPU dispatch/fallback appropriate to the published target. Do not add
several complex techniques merely because competitors use many techniques.

## Correctness and robustness gates for changed code

- Fresh official-format optimized and ASan/UBSan suites against independent oracle
  and official reference; public full expected hash on changed solver revisions.
- Several independent generated seeds, endpoints absent from the public full
  dataset, long/prefix/collision-heavy names and different frequency distributions.
- All 72 hours, cross-month boundaries, shuffled records, identical duplicates,
  nearest-rank boundaries, zero/UINT32_MAX latencies and integer-rate boundaries.
- Empty input and tiny files; existing malformed-input/buffer/alias regressions.
- Span/SIMD: delimiter and number boundaries at the end of each buffer, maximum
  legal line lengths and mapping/page boundaries, without over-read.
- Parallel: fewer records than workers, splits exactly on LF and inside a record,
  no missed or double-counted boundary rows, correct merging and deterministic
  ordering regardless of scheduling. Validate input preservation and sandbox use.
- Fresh offline image/build and constrained invocation when build/runtime context
  changes. Reuse applicable unchanged evidence by identity; do not blindly rerun
  the archived verifier, which hardcodes its original path and placeholder team.
- Keep source/runtime dependency accounting honest. New developer harnesses stay
  outside the track folder unless needed for the actual build or runtime.

## Comparison and promotion rule

For every candidate, record exactly one hypothesis and its changed files. Use
identical data, compiler/image, worker limits and cache policy. Run a small fixed
serial paired baseline/candidate comparison with alternating order; retain every
run and verify outputs outside the timed interval. Use a bounded A/A noise check
when needed. Do not repeat noisy comparisons indefinitely or cherry-pick minima.

Measure complete program elapsed time and comparable peak-memory definitions.
RSS, cgroup peaks and the board's memory excluding cache are distinct measures.
Calculate K with current source counts, reference axes and caps. A faster candidate
can still lose through memory or source growth. With memory/source/D unchanged,
a 2x time improvement multiplies K by sqrt(2); it is not a 2x K improvement.

Preserve the best verified fallback. If local evidence is noisy, call a candidate
performance-unproven until stronger evidence exists. Official board runs are the
event measurement, but one public-seed run is not a holdout guarantee. Respect the
five-minute team interval and queue; publish meaningful revisions with honest
run-linked PERF entries. No remote action is implied by this local plan.

## How to stand out in the write-up and review

Explain two or three measured decisions deeply: observed bottleneck, hypothesis,
exact implementation, correctness risks, result and rollback/promotion decision.
Include a clearly sourced before/after table, a profile chart and one readable
data-flow diagram if useful. Tie claims to actual commits and board run IDs.
Explain why the solution generalizes to unknown seeds and how its memory scales.
Keep the code readable and comments focused on non-obvious invariants.

The current implementation is a single worker with scalar parsing. Describe that
truthfully until it changes. Optional demo polish comes after performance evidence.
The side-prize article must be a qualifying public blog post, not just a README.

## Next bounded implementation task

Run the following in the working Ubuntu development session. First preserve the
current official baseline and hash its small build context. Continue independent
local work while the baseline push is awaiting owner authorization.

1. Establish one current official-format full-data baseline and a separate phase
   profile. Inspect this plan and M2/M4 warnings; do not reuse their timings as
   current results. Do not launch another unrelated workload/audit campaign.
2. Select the highest-impact measured bottleneck. Implement at most two controlled
   candidates, prioritizing span parsing if ingestion dominates or bounded output
   batching if serialization dominates. Isolate each change and compare to the
   unchanged official baseline; simple compiler experiments are separate variants.
3. Run revision-appropriate oracle/reference/sanitizer and full-output checks,
   collect bounded paired measurements, and report runtime, memory, source growth,
   estimated K change and uncertainty. Do not claim a speedup below measurement
   resolution or copy unproven changes into the submission automatically.
4. Write results to a fresh experiment directory, preserving previous evidence.
   Report the best next candidate and its exact promotion or rejection rationale.
   If the environment prevents measurement, record the specific blocker once and
   do useful independent analysis; avoid repeated no-progress audit loops.

Stop this bounded task after that report. Do not start new tracks, stage, commit,
push, alter visibility or submit forms without the existing owner's authorization.
Do not edit the archived integration report to describe new revisions as old proof.

## Sources

- Rules, scoring, judging, prizes and timeline: https://speeddemon.dev/
- Live board and public feed: https://speeddemon.dev/board/ and
  https://s3.amazonaws.com/raptors.dev/speeddemon.dev/2026/board/board.json
- Official contract: https://github.com/hackathon-raptors/speed-demon-2026/blob/ad1f06063a76bf94066f169e133ec0c2e1485b65/specs/a-ingest.md
- Local integration and final package evidence: `artifacts/official-integration/`
  and `artifacts/submission-prep-2026-10-31/` in the original workspace.
