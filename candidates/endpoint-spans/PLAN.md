# Track A execution plan

## Endpoint-span experiment M3 — inconclusive, baseline remains default

One isolated candidate is preserved at `candidates/endpoint-spans/track-a/src/main.cpp`: endpoint payload bytes are scanned as contiguous spans and appended once per span. The original scalar path still handles all other bytes and transitions. Root `track-a/src/main.cpp` and both earlier verified checkpoints remain unchanged. No candidate was promoted.

Both revisions passed 326 optimized and 326 ASan+UBSan checks, zero skips, plus full preflight and clean pinned offline-container checks. This retains all existing 233 cases and adds 93 focused endpoint-span boundary/control/CRLF/high-byte/long-prefix/EOF checks using the existing independent oracle. Native builds use the same GCC 13.3 flags.

Exactly six measured pairs per workload were run once, order BC CB BC CB BC CB after warming both binaries, on ext4/CPU 2 with the same cache policy. All 28 measured/warm-up output hashes matched. No favorable batch reruns occurred.

| Workload | Candidate-faster pairs | Geometric C/B ratio | Paired-ratio spread | Peak RSS B/C (KiB) |
| --- | ---: | ---: | ---: | ---: |
| normal | 4/6 | 0.956104 | 34.99% | 25,512 / 25,508 |
| tenfold | 5/6 | 0.935521 | 13.32% | 196,968 / 196,968 |

**Decision: inconclusive; candidate correctness-verified, performance-unproven.** Neither workload met the predeclared repeatability gate. Ratios are descriptive observations, not supported speedup claims. No material process-RSS regression was observed on these workloads, but bounded tests and warm-cache cgroup readings do not prove general memory/stress headroom.

Separate cgroup memory.peak, baseline/candidate: normal **37,269,504 / 37,416,960 bytes**, tenfold **199,413,760 / 199,475,200 bytes**, no OOM/limit events. Those container-wide metrics are separate from process RSS and official harness accounting.

New comparison baseline checkpoint: `baselines/verified-ac513ecb51d4ee4c/`; candidate checkpoint: `candidates/endpoint-spans/baselines/verified-9c41e2794115eda7/`. Both source/binary/preflight/checkpoint identities are recorded in `artifacts/experiments/track-a-m3/config.json`.

Reproducible report, exact solver diff, complete paired timings/raw GNU time files, per-revision verification/offline records and decision: `artifacts/experiments/track-a-m3/REPORT.md`. Keep normal root builds on scalar baseline; candidate builds require explicitly entering its isolated directory. Future experiments require a new plan, not repeating this batch until favorable. Everything stayed local; official requirements remain pending.

## Completed robustness/profile milestone — 22 October 2026

Preserved `baselines/verified-d9c5e3828341492a/` unchanged. The solver remains byte-for-byte unchanged. Hash-verified inputs, expected outputs and the original GCC 13.3 binary were staged on WSL ext4, with solver processes pinned to virtual CPU 2 and warm-input-cache policy. Exactly two serial baseline batches per workload were retained. All 24 output hashes matched; no project builds, generators or profiles overlapped benchmark runs.

| Controlled baseline | Trimmed mean (s) | Timing spread |
| --- | ---: | ---: |
| normal-1 | 1.211453 | 12.73% |
| normal-2 | 1.611716 | 11.15% |
| tenfold-1 | 17.212961 | 18.55% |
| tenfold-2 | 16.150215 | 43.23% |

**Performance conclusions remain unresolved:** every batch missed the 5% spread target, and normal batch means shifted materially. No solver optimization was attempted/retained, no third baseline batch was run, and storage/CPU placement changes are not counted as solver improvements. Separate gprof/phase runs identify ingestion (parsing, lookup, aggregation) as dominant: approximately 77% normal and 87% tenfold phase wall time, with instrumentation/inlining limitations.

Added 13 bounded independent-oracle stress cases: three new deterministic seeds, growing endpoint/hour cardinality, long shared-prefix identities, skew, pure equal values, sorted/reversed full-range uint32 values. Final full preflight passed all gates: 233 optimized checks and 233 ASan+UBSan checks, zero skips, plus clean pinned offline container verification.

New verified checkpoint: `baselines/verified-7dee32a851a647e0/`. Final source/test/tooling identity: `7dee32a851a647e0112a583549e1e8a31ecee9449cb5ef332974ad827c50f980`.

Separate constrained-container cgroup `memory.peak`: **41,971,712 bytes normal**, **199,454,720 bytes tenfold**, no OOM/limit events. Maximum measured process RSS: **25,512 KiB normal**, **196,964 KiB tenfold**. These are distinct scopes/executions; warm shared page charges and the lack of official harness accounting limit interpretation.

Reproducible report and all raw measurements: `artifacts/experiments/track-a-m2/REPORT.md`, `config.json`, four `baseline-*.json` records, `raw-times/`, gprof files and `memory.json`. The report includes fresh-copy reproduction commands, CPU/filesystem/cache/compiler policies and the failed optimization admission decision. Original assets and evidence remain intact. Official requirements remain pending; no remote mutation occurred.

Next performance work requires improved host/CPU/cache control and new authorized measurement planning. Do not infer a solver improvement or accept an optimization from these noisy batches.

## Completed local verification and measurement — 22 October 2026

Approved execution outside the sandbox resolved Docker and captured-subprocess access. No verification checks or production implementation were changed. Final `CXX=g++ node scripts/preflight.mjs` at `2026-10-22T09:41:41.127Z` passed all eight required gates: development tooling, optimized native build, local correctness, Linux x64 execution, sanitizer build, sanitizer correctness, offline container build/run, and unchanged sources. Both optimized and ASan+UBSan suites passed 220 checks with zero skips. Native compiler: GCC 13.3.0; container compiler: GCC 14.4.0. The clean container build used no cache, no pull and no build networking; its constrained offline smoke output matched the hand-derived golden.

The inspected `gcc:14` image is Linux/amd64, pinned to `gcc@sha256:336f0bc6ca54b6bd8abe0bfad3e5f2d292258b18f0a6c6adf784f61e5a892267`. Source manifest: `d9c5e3828341492a277f509fbbf06035f33dc843d3aa4448cea9a0d764fbdcff`. Verified baseline: `baselines/verified-d9c5e3828341492a/` (source/build/test snapshot, binary and passing evidence). The older candidate remains preserved. Evidence: `artifacts/verification/preflight.json` and timestamped report, plus per-run container records.

The existing normal batch completed before the tenfold batch began, with no concurrent project builds, generators or other benchmark jobs. Each batch contains one warm-up and five measured complete executions; all twelve outputs matched their independent expected hashes. The runner also rechecked source, binary and input identities. Measurements use the native GCC 13.3 optimized binary, not the GCC 14 container smoke executable.

| Workload | Records | Input bytes | Trimmed mean (s) | Measured range (s) | Peak process RSS (KiB) | Spread/mean |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Normal | 3,100,000 | 168,780,508 | 5.346065 | 5.037326–6.122418 | 25,500 | 19.9% |
| Tenfold | 31,000,000 | 1,687,804,970 | 57.612816 | 50.976861–70.464125 | 196,744 | 33.1% |

Trimmed mean is the mean of the middle three of five measured wall times; wall time includes process launch and GNU time. Both batches exceed the local 10% spread review threshold. Results are recorded observations, not stable optimization comparisons or official scores. A read-only host process CPU snapshot taken after the batches showed no active benchmark/build competitor; it cannot identify prior load or rule out host/Windows/storage interference. Inputs and outputs reside under `/mnt/c`; CPU affinity was not pinned. No optimization or speedup is claimed. Repeating measurements should follow improved control of host load/storage and CPU placement, rather than selectively discarding slower runs.

GNU time reports maximum process RSS, not cgroup `memory.peak`. Fixed endpoint/hour cardinality and a bounded synthetic latency alphabet limit the tenfold claim to this workload; growing cardinality and official memory headroom remain unproven. Official contract/reference/harness, cgroup accounting, metadata and eligibility remain pending. No pushing, publishing, deployment or submission occurred.

Raw records: `artifacts/benchmark-normal-2026-10-22/measurements.json` and `artifacts/benchmark-tenfold-2026-10-22/measurements.json`.

## Historical execution records

The following access failures and incomplete statuses describe earlier runs and are superseded by the verified results above.

## Current execution audit — 22 October 2026

This agent now executes in Linux x86-64 (`node`: linux x64, v20.20.2) with GCC 13.3.0 and GNU time present. Docker client 29.5.3 runs, but the Server is inaccessible: permission denied connecting to `/var/run/docker.sock`. The actual `gcc:14` image digest/platform could not be inspected; its pin remains null. Earlier Windows-only diagnoses below are historical.

`CXX=g++ node scripts/preflight.mjs` was attempted and failed. Captured Node subprocesses return `EPERM`, including `/bin/true`, so even JavaScript syntax subprocess results are rejected despite reported status 0. No checks were weakened. Direct shell compilation of the existing source succeeded with optimized C++20 flags and separately with ASan+UBSan flags. The independent oracle self-check passed three fixtures and shell syntax passed. The complete solver suite was attempted directly and stopped on its first invocation with subprocess `EPERM`; these compilation diagnostics do not establish solver correctness or sanitizer execution.

Evidence: `artifacts/toolchain/resume-environment-2026-10-22.json` and the latest `artifacts/verification/preflight.json`. The local compiler observations are now in `toolchain.lock.json`; the production source and existing candidate are preserved. No verified baseline, benchmark, measured memory or optimization is claimed. Official requirements remain pending. Next prerequisite: an execution context permitting Docker Server access and the existing Node captured-subprocess checks. Then rerun full preflight, preserve the verified checkpoint, and benchmark normal/tenfold workloads serially. No security settings or permissions were changed.

Historical status before approved Linux execution: source implemented; executable verification was blocked. Language: C++20. Scope: Track A only, local work only.

## Resumed access audit — 21 October 2026, 13:47 UTC

The user confirmed Linux x64, Node 20, GCC 13, GNU time, a working Docker Desktop server from Ubuntu and a downloaded `gcc:14` image. This session still runs as `CodexSandboxOffline` on Windows. Direct Ubuntu invocation failed with `Wsl/Service/E_ACCESSDENIED`; Docker version and image inspection failed with permission denied at the engine pipe. The earlier claim that the engine was absent is historical, not the current diagnosis. User provisioning and agent access are distinct.

Full preflight was attempted with `CXX=g++` using PowerShell environment syntax. At `2026-10-21T13:47:26.769Z`, all 11 JavaScript syntax checks, six tooling regressions, three oracle fixtures and shell/encoding checks passed. Native compilation failed (`spawnSync g++ ENOENT`) and the container gate failed at Docker access; overall exit was 1. The source manifest remains `67598c42d0deb1eb23a7a381ad0181669ccb2f294f82b2220f05079810de1611`. No implementation or check was weakened, and no verified baseline, optimization or benchmark was produced.

Evidence: `artifacts/toolchain/resume-environment-2026-10-21.json` and `artifacts/verification/preflight-2026-10-21T13-47-26-769Z.json`. The old goal audit below records the previous blocked run. This resumed run starts a fresh blocker audit. Next prerequisite: run the agent with this workspace inside the user's accessible Ubuntu environment. Then inspect the actual image digest/platform, update the lock from observations, and execute the existing preflight/checkpoint/serial benchmark sequence. The image pin remains null because inspection did not succeed. Official requirements remain pending.

## Previous run history

Goal audit on 21 October 2026: the same inaccessible compiler/Linux/Docker environment persisted across three consecutive goal turns. Available independent preparation and tooling checks are complete; the goal is blocked pending an external environment change, not complete. The requirement-by-requirement audit is `artifacts/verification/goal-audit.json`. No further retries of unchanged denied commands are scheduled.

## Authorization and provenance

The user explicitly authorized early local development in this conversation, superseding the preparation-only restriction in the three original planning documents. Those documents remain unchanged as historical records. Do not conceal early authorship. No organizer exception or official eligibility has been verified.

Do not push, publish, deploy, register, or submit. No remote repository is configured by this task.

## Preserved decisions

- A-first; specialist plus a separate write-up remains the default prize route.
- No other track during this milestone.
- C++20, standard library, one parser/aggregation worker, full sorting as baseline.
- Exact uint32 latencies, owning endpoint names, uint64 endpoint/hour counts.
- Explicit local-v1 policies; no guessed official metadata.
- Preserve a verified source checkpoint before optimization.
- Measure complete executions without competing builds, generators, or benchmark jobs.

The local contract is in track-a/LOCAL_CONTRACT.md. Timestamp interpretation, percentile policy, and serialization must remain independently replaceable.

## Milestones

| Milestone | Acceptance | Status |
| --- | --- | --- |
| Toolchain | Working C++20 compiler and recorded provenance | Complete locally: native GCC 13.3; pinned Linux/amd64 GCC 14.4 container |
| Baseline | Streaming parser, exact aggregation, deterministic local output | Verified against local-v1; preserved before measurement |
| Verification | Hand-derived goldens, independent oracle, boundary/failure cases | Passed: optimized and ASan+UBSan suites, 220 checks each, zero skips |
| Packaging | Reproducible Linux build and offline container recipe | Passed: clean pinned offline build and constrained smoke run |
| Checkpoint | Verified source/build/test snapshot and SHA-256 manifest | Complete: `baselines/verified-d9c5e3828341492a/` |
| Measurement | Serial whole-process runs with input/source identities | Complete locally: normal/tenfold, five measured runs each plus warm-ups; timing variability flagged |
| Official reconciliation | Released specification/reference/harness and official hashes | Pending unavailable assets |

The full local completion goal additionally requires ASan+UBSan, successful Linux x86-64 execution, a genuine provisioned image pin, a clean offline container build/run, a verified preserved baseline, and repeated serial normal/tenfold benchmarks with observed memory. Source implementation, tooling self-checks and workload generation do not satisfy those requirements.

## Invariants and memory

Every accepted record contributes once to its endpoint latency vector and endpoint-hour request count; errors are statuses 500 through 599. Hashes never replace full endpoint identity. Global rates sum numerators and denominators; never average rates or worker percentiles.

Raw latencies cost 4N bytes: 12.4 MB for 3.1M records and 124 MB for 31M. Explicit doubling and overlapping allocation can require approximately 12N latency bytes during growth. Endpoint strings, dictionaries, endpoint-hour cardinality, rehashes, buffers, runtime, and charged cache/kernel memory are additional. These are estimates, not observations.

## Ownership

- Integrator: shared contract, documentation, build/container files, checkpoints and measurement.
- Implementation agent: track-a/src/ only.
- Independent verifier: track-a/tests/ only.
- Toolchain agent: .tools/ and artifacts/toolchain/ only.

Only the integrator schedules builds and measurements. No agent expands scope or performs remote mutations.

The later bounded script audit was read-only. Agents subsequently hit their service usage limit; the integrator owns the follow-up script fixes and workload files. No competing builds or benchmarks were started.

## Recorded evidence

The initial preflight at 2026-10-20T17:25:35.582Z passed five JavaScript syntax checks, three oracle fixtures and shell/encoding checks. Its evidence is preserved in the unverified candidate. `artifacts/verification/preflight.json` is the current report; timestamped reports retain later runs. The current source manifest differs because verification scripts changed.

The native build failed with `spawnSync g++ ENOENT`. The container check failed at Docker engine access. No executable test suite, sanitizer run, Linux execution, benchmark, memory measurement, or official correctness check ran.

The candidate checkpoint is `baselines/candidate-0a6827e48573/`. Its source manifest SHA-256 is `0a6827e485738cb41a0203e1285f40a3e4934e602f740008d0268a821eae37b9`. It is explicitly unverified. No optimization was performed.

Independent review prompted two baseline fixes before any execution: reject special-file/symlink output targets, and require fresh container/benchmark outputs so stale files cannot pass verification. These are code-review findings, not measured experiments.

The subsequent verification audit found and fixed ignored container failure, absent sanitizer gates, stale build-output acceptance, missing build/source linkage, and sanitizer diagnostics potentially passing expected-error cases. Preflight now records explicit required gates, rejects changed sources and replaces prior success with an in-progress report before execution. Fresh build outputs include compiler/source/binary identities. Checkpoint and benchmark commands refuse incomplete or mismatched verification evidence. No optimization or verified baseline has been claimed.

Local normal/tenfold workloads are prepared under `artifacts/workload-normal-3100000/` and `artifacts/workload-tenfold-31000000/`, with independent histogram-oracle outputs and actual identities. Both hold endpoint/hour cardinality fixed. They test record-volume scaling; they are not official datasets or a proof of growing-cardinality headroom.

Latest tooling-only preflight: `2026-10-21T02:05:20.282Z`, source manifest `67598c42d0deb1eb23a7a381ad0181669ccb2f294f82b2220f05079810de1611`. Eleven JavaScript syntax checks, six tooling regressions, three oracle fixtures and shell/encoding checks passed. Required executable gates remain false; overall exit was 1. Both direct negative guard checks passed: checkpoint creation and measurements were refused without successful executable evidence. Dataset integrity passed with reread hashes and exact LF record counts. See `PERF.md` and `artifacts/verification/`.

## Environment prerequisite and stop condition

`artifacts/toolchain/goal-environment.json` records the permission and process investigation. The session identity is `codexsandboxoffline`, without administrator membership. No usable compiler was found. Existing NDK execution, Docker configuration/context access, WSL enumeration and process-parent/command-line inspection were denied. A normal hidden Docker Desktop launch did not persist; its service remained stopped and its engine pipe absent. No denied executable was copied, no ACL/security configuration changed, and no unrelated terminal closed. Current policy rejects sandbox/rules escalation, so an administrator/authorized execution context is required for the inaccessible environment work.

The minimum prerequisite is an authorized local Linux x86-64 context for this workspace with C++20 compiler plus sanitizer runtimes, Node 20+, GNU time, usable Docker access and a provisioned genuine compiler-image digest. A Windows compiler alone is insufficient. Further attempts at unchanged denied commands must wait for that concrete state change. Flashing-window attribution separately needs an authorized process snapshot during the event; the readable Codex helper-launch log is only partial evidence.

First action after that state change: inspect compiler version, engine/context and image provenance once, record them in the lock/evidence, then run `CXX=g++ node scripts/preflight.mjs`. Investigate every failure, preserve the passing revision with `node scripts/checkpoint.mjs`, and run both prepared workloads serially with no builds/generators/profilers competing. Record process RSS separately from pending official cgroup measurement. Do not expand tracks.

## Unresolved official requirements

Percentile ranks/interpolation; timestamp offsets/fractional widths/leap seconds; hourly grouping; output filenames/schema/order/rounding; legal and malformed input policy; paths/entrypoint; build context/base-image provisioning; metadata; source/dependency accounting; 10x generator dimensions; memory measurement; speed-floor applicability; early-development eligibility.

Inspected public material scheduled specifications, references and harness for 28 October 2026. They were not found in inspected public sources; private community availability was not verified.

## Subsequent work

Establish runnable compilation and verification first. Reconcile local policies with official assets when released, preserve the passing revision, then profile one coherent optimization. Do not optimize an unverified baseline.

Expansion requires resolved mandatory semantics, exact official output checks, clean offline builds, measured 1x execution, credible 10x headroom and protected validation/documentation/delivery time. The earlier 40-focused-hour competition envelope remains an unconfirmed availability assumption.

## Resumed goal blocked audit

Three consecutive resumed goal turns confirmed the same session-access blocker. The agent remains in the Windows CodexSandboxOffline context; the working Ubuntu environment is inaccessible from it. No required executable evidence changed. The goal is blocked, not complete; resume after providing agent access to the Ubuntu workspace and Docker engine. See artifacts/verification/resumed-goal-audit.json for the requirement audit. Existing implementation, unverified candidate and pending official requirements are preserved.

## Linux resumed goal blocked audit — 22 October 2026

Three consecutive goal turns confirmed Docker Server permission denial and Node captured-subprocess EPERM. Direct compilation succeeded, but mandatory correctness, sanitizer execution, offline container, verified checkpoint and benchmark gates remain incomplete. The goal is blocked pending an execution context permitting the existing commands. See `artifacts/verification/resumed-goal-audit.json`. Implementation and official pending requirements are preserved.
