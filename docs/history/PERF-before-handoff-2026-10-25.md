# Track A performance and verification record

## M4 bounded timing diagnosis and memory stress — complete

Analyzed M3 wall/user/system times and execution order before new runs. Then completed one fixed identical-baseline A/A campaign: six adjacent AB/BA-balanced pairs per normal/tenfold workload, same binary/path, ext4/CPU2/cache policy, both-label warm-ups, full hashes, faults/context-switch and Linux load/pressure telemetry. No M3 rerun or rule change.

| Workload | Identical-binary pair wall-ratio range | Geometric B/A | Maximum absolute pair deviation | M3 observed advantage direction |
| --- | ---: | ---: | ---: | ---: |
| normal | 0.916968–1.292714 | 1.050550 | 29.27% | 4.39% |
| tenfold | 0.882264–1.166795 | 0.981710 | 16.68% | 6.45% |

**Performance remains unresolved.** Identical-binary variation is comparable to/exceeds M3's observed advantage. CPU-time variation accompanies wall variation; telemetry does not prove a cause. WSL CPU frequency/governor paths are unavailable, and Windows power/thermal/process telemetry was not sampled. No settings changed, no unrelated process killed, and no favorable reruns occurred.

All three predeclared memory cases passed both implementations with independently correct outputs: 1,024/4,096/8,192 endpoints, 4/8/12 hours each, 64/256/1,024-byte shared-prefix names, under 128 MiB/256 MiB/1 GiB caps and 60/120/180-second timeouts. Native AS caps and fresh-container memory caps are distinct. The 12 native/container executions all passed with zero cgroup limit/OOM events.

| Case | Native RSS baseline/candidate (KiB) | Fresh cgroup peak baseline/candidate (bytes) | Tested cap |
| --- | ---: | ---: | ---: |
| cardinality-1 | 4,992 / 4,992 | 8,138,752 / 5,054,464 | 128 MiB |
| cardinality-2 | 8,448 / 8,448 | 29,175,808 / 29,347,840 | 256 MiB |
| cardinality-3 | 21,820 / 21,816 | 257,089,536 / 257,105,920 | 1024 MiB |

These are tested successful envelopes, not minimum memory or maximum-cardinality limits. RSS and container-wide peaks are separately measured; warm/shared/output-cache charging limits interpretation. Reused unchanged M3 full verification (326 optimized + 326 sanitizer checks per revision) and existing checkpoint identities. No solver or tracked verification tooling changed; experiment-local reference/self-check code is archived. Scalar baseline remains default, candidate remains correctness-verified/performance-unproven, all checkpoints and prior evidence preserved.

Detailed diagnostic report, original M3 analysis, predeclared caps/design, raw A/A telemetry, independent reference manifests, capped stress results and reproduction policy: `artifacts/experiments/track-a-m4/REPORT.md`. No further campaign is authorized by these completed results. Everything stayed local; official requirements remain pending.

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

### Retained raw process observations

Normal warm-up: 5.315574186 s, 25,372 KiB RSS.

| Measured run | Wall seconds | Maximum RSS (KiB) |
| --- | ---: | ---: |
| 1 | 5.083114676 | 25,500 |
| 2 | 6.122418186 | 25,264 |
| 3 | 5.037325912 | 25,356 |
| 4 | 5.549301308 | 25,252 |
| 5 | 5.405779613 | 25,428 |

Tenfold warm-up: 68.428517661 s, 196,700 KiB RSS.

| Measured run | Wall seconds | Maximum RSS (KiB) |
| --- | ---: | ---: |
| 1 | 55.138018081 | 196,744 |
| 2 | 58.882095743 | 196,148 |
| 3 | 50.976860831 | 196,444 |
| 4 | 58.818333686 | 196,688 |
| 5 | 70.464125451 | 196,696 |

## Historical execution records

The following access failures and incomplete statuses describe earlier runs and are superseded by the verified results above.

## Current execution audit — 22 October 2026

This agent now executes in Linux x86-64 (`node`: linux x64, v20.20.2) with GCC 13.3.0 and GNU time present. Docker client 29.5.3 runs, but the Server is inaccessible: permission denied connecting to `/var/run/docker.sock`. The actual `gcc:14` image digest/platform could not be inspected; its pin remains null. Earlier Windows-only diagnoses below are historical.

`CXX=g++ node scripts/preflight.mjs` was attempted and failed. Captured Node subprocesses return `EPERM`, including `/bin/true`, so even JavaScript syntax subprocess results are rejected despite reported status 0. No checks were weakened. Direct shell compilation of the existing source succeeded with optimized C++20 flags and separately with ASan+UBSan flags. The independent oracle self-check passed three fixtures and shell syntax passed. The complete solver suite was attempted directly and stopped on its first invocation with subprocess `EPERM`; these compilation diagnostics do not establish solver correctness or sanitizer execution.

Evidence: `artifacts/toolchain/resume-environment-2026-10-22.json` and the latest `artifacts/verification/preflight.json`. The local compiler observations are now in `toolchain.lock.json`; the production source and existing candidate are preserved. No verified baseline, benchmark, measured memory or optimization is claimed. Official requirements remain pending. Next prerequisite: an execution context permitting Docker Server access and the existing Node captured-subprocess checks. Then rerun full preflight, preserve the verified checkpoint, and benchmark normal/tenfold workloads serially. No security settings or permissions were changed.

## Resumed verification — 21 October 2026, 13:47 UTC

The user's Ubuntu toolchain and Docker setup are reported ready, but the current Windows sandbox identity cannot invoke Ubuntu (`Wsl/Service/E_ACCESSDENIED`) or inspect Docker (`permission denied` at the engine pipe). `gcc:14` repository digest and platform could not be observed. This supersedes the older engine-absent diagnosis; no conclusion about the user's Ubuntu setup follows from this access denial.

Full preflight with `CXX=g++` was attempted in the accessible Windows session at `2026-10-21T13:47:26.769Z`, Node v24.13.1. It exited 1: 11 syntax checks, six tooling regressions, three oracle fixtures and shell/encoding passed; compilation failed with `g++ ENOENT`; Docker version failed. Development tooling and unchanged-source gates are true; every required executable/environment gate is false. Source manifest remains `67598c42d0deb1eb23a7a381ad0181669ccb2f294f82b2220f05079810de1611`.

No solver timings, memory measurements, sanitizer results, verified checkpoint or optimization comparison were produced. The lock remains unchanged rather than recording an unobserved image digest. Evidence is in `artifacts/toolchain/resume-environment-2026-10-21.json` and the timestamped preflight report. Continue the existing serial measurement procedure only after successful preflight in an accessible Linux agent session. Official requirements remain pending. The earlier audit and observations below are retained as history.

## Previous status

No C++ executable has been built or run in this session. No solver correctness result, runtime, memory peak, speedup, score or optimization history is claimed.

Final goal audit on 21 October 2026 confirmed unchanged source evidence, no executable, no compiler on PATH, no Docker backend, a stopped Docker service and unresolved image pin. The recurring environment blocker now meets the three-turn stop threshold. The goal remains incomplete and is recorded as blocked; details and minimum external prerequisites are in `artifacts/verification/goal-audit.json` and `PLAN.md`.

Source implements the provisional local-v1 baseline. No optimization has been attempted. A known-good executable baseline cannot be preserved until compilation and end-to-end tests pass.

## Environment and provisioning observations

- Windows x64; Node.js v24.13.1 available.
- Git 2.51.2.windows.1 available; this workspace is not a Git repository.
- Docker client 29.5.3 exists; default engine connection fails and configuration access is denied.
- WSL distribution enumeration was denied.
- No accessible C++ compiler was established on PATH or the inspected common locations.
- An Android NDK Clang installation was found, but executing its version command was denied. No alternate identity, copied executable or other bypass was attempted.
- Ordinary toolchain/registry HTTPS requests failed. No compiler archive or container image was downloaded.

`artifacts/toolchain/inspection.json` records sources, an uninstalled portable compiler candidate, and concrete failures. The expected download checksum in that file is not a verified local download.

## Verification ledger

Initial preflight recorded at **2026-10-20T17:25:35.582Z**, using Node.js v24.13.1 on Windows x64 (preserved in the candidate snapshot; the canonical report now describes the latest source set):

| Check | Actual outcome |
| --- | --- |
| `node --check` on four scripts and the test runner | All five passed |
| `node track-a/tests/test.mjs --self-check` | Three hand-derived oracle fixtures passed; C++ solver not tested |
| Git Bash `-n build.sh` | Passed |
| build.sh LF/no UTF-8 BOM | Passed |
| `node scripts/build.mjs` | Failed: `spawnSync g++ ENOENT` |
| Full executable test suite | Not run: no compiled executable |
| `node scripts/container-check.mjs` | Failed at Docker version/engine connection |
| Sanitizers, Linux execution, official harness | Not run |
| Whole-process timings and memory measurement | Not run |

The overall preflight returned exit code 1 because executable verification is blocked. Passing the development checks does not make the C++ program verified.

Evidence: `artifacts/verification/preflight.json`, `artifacts/build/native.json`, per-invocation `artifacts/container/run-*/check.json`, and `artifacts/toolchain/inspection.json`.

Initial candidate source/build/test manifest SHA-256: `0a6827e485738cb41a0203e1285f40a3e4934e602f740008d0268a821eae37b9`. Later tooling changes have a separate identity in the current preflight report.

Main C++ source SHA-256: `58819b871ddbf873731a7d54905ffe4c18477822cb76f7aa4d263b813ce29496`.

Checkpoint: `baselines/candidate-0a6827e48573/`, explicitly an **unverified source candidate**. No known-good executable or optimization comparison exists.

## Source review changes

Before compilation, independent review identified a possible stale-output false positive in the container smoke check and unsafe handling of special output files. The container check now creates fresh run directories; the benchmark removes only its own prior output before each run. The solver rejects special-file and symlink output targets and only attempts regular-file cleanup. Tests include malformed-input preservation of prior output and a Linux special-device rejection case.

These are review-driven fixes. No runtime result or performance improvement is attributed to them. Full hash-collision behavior and counter-overflow paths were reviewed as invariants; forced collisions and uint64 counter saturation were not executed.

## Goal follow-up: verification integrity

The script audit found that preflight could ignore a failed container check after native tests passed, builds could reuse stale output, benchmarks lacked source-to-binary linkage, and expected-invalid cases could accept sanitizer diagnostics. Those paths are now guarded. Required gates include native build, actual executable tests, native Linux execution, sanitizer build/tests, offline container success, tooling and unchanged sources. Build outputs are fresh and identified; container smoke uses an immutable image ID; checkpoints/benchmarks require matching passing evidence. Reports begin as non-success, preventing an interrupted check from leaving old success at the canonical path.

Six tooling regression tests passed: four failure-policy/process/sanitizer checks and two workload tests. Workload tests include hand-derived bytes/ranks, a separate materializing sort oracle for 2,000 records, repeatability and a tenfold-prefix check. These are Node/tooling results, not C++ verification. The original oracle still passes its three hand-derived fixtures. The final tooling-only preflight deliberately leaves all executable/environment gates false and exits nonzero.

Final tooling-only preflight at **2026-10-21T02:05:20.282Z** passed all 11 JavaScript syntax checks, the six regressions, three oracle fixtures, shell syntax and LF/no-BOM checks. It returned **exit 1**, with `requiredChecksPassed:false`; native build, local executable, sanitizer build/tests, Linux and offline container gates are all false. Source manifest: `67598c42d0deb1eb23a7a381ad0181669ccb2f294f82b2220f05079810de1611`. Main C++ source retains the earlier hash.

At **2026-10-21T02:06:20.797Z**, direct negative guard checks passed: checkpoint refused with exit 1 and left the baseline directory unchanged; benchmark refused with exit 1 and recorded zero runs. Evidence: `artifacts/verification/negative-guards.json`. The deliberately rejected benchmark record contains no timing or memory observations.

The environment remains blocked. Normal hidden Docker Desktop launch was accepted at 23:13:29 IST on 20 October but no backend remained running at the follow-up; the service stayed stopped and the engine pipe was absent. Compiler execution, Docker config, WSL enumeration and Windows process-command/parent inspection remain unavailable to the restricted identity. On 21 October, current inventory still showed no compiler on PATH or running Docker backend; unchanged denied execution commands were not retried. `artifacts/toolchain/goal-environment.json` contains the observations. No successful compiler installation, Linux run, sanitizer run or container build occurred.

The flashing-window cause is unconfirmed. Existing project children already use `windowsHide:true`. Direct commands now use captured output without login profiles/PTYs; the owned Desktop launch was hidden. A readable sandbox log records `codex.exe` launching its command-runner helper, but the denied process query prevents identifying the command/parent PID responsible for the visible flash. No unrelated terminal was closed.

## Prepared synthetic workloads, not performance results

Both datasets were generated serially on 21 October 2026 and include independent expected-output files. No C++ executable or benchmark ran during preparation.

| Local workload | Records | Actual input bytes | Expected-output bytes |
| --- | ---: | ---: | ---: |
| Normal | 3,100,000 | 168,780,508 | 13,646,829 |
| Tenfold | 31,000,000 | 1,687,804,970 | 14,002,336 |

Normal input SHA-256: `e53f8888f58513ab1ec770ee2cf2651d42fd74436089b6d35e54dbc6939c67b3`; expected output: `bfd4febd3efcf8b43735390cf64d0cdb804c8dd186907cd854b3e7df6fbd40c9`.

Tenfold input SHA-256: `c33fcc70ee2fd3e82ec886ef9da4bdd0d4a775011ce7459cc6fec9c8fd632f62`; expected output: `f1cda56b71bd19824cb74a91d8074555bcbfa9414f6bb0fc852c41d9c5e22b6b`.

Both have 1,842 endpoint groups and 88,416 endpoint-hour groups, spanning 48 interleaved hours including leap day. Six of ten records use `/hot`; the bounded 1,024-value latency alphabet includes zero and UINT32_MAX. Tenfold extends the same deterministic prefix with fixed cardinality. The generator's typed aggregate arrays contain 8,259,528 bytes; this is an allocation-size calculation, not a measured peak for the generator or solver. Arbitrary latency density, growing cardinality and long-token scaling remain separate stress cases.

Manifests record generator identity and file hashes. `artifacts/verification/workload-integrity.json` records reread hashes, LF record counts and output count/rate conservation. These locally generated hashes have no official standing.

The integrity audit started at **2026-10-21T02:03:24.592Z** and completed successfully (exit 0); all four input/expected-output files matched their manifests, input LF counts were exactly 3.1M/31M, and expected-output request/rate counts conserved their totals. This establishes asset integrity, not C++ correctness.

## Memory model, not measurement

Raw latency storage is 4N bytes. With explicit capacity doubling, overlapping allocation can require approximately 12N latency bytes during growth: 37.2 MB at 3.1M records and 372 MB at 31M. Endpoint and hour maps, owned strings, rehash peaks, ordering arrays, buffers, runtime and charged cache/kernel allocations are additional.

## Next measurement

Once all local preflight gates pass, preserve the exact source/build/test checkpoint and compiler identity. Run the two prepared workloads serially, each with one warm-up and five complete measured processes. The runner checks expected hashes and source/executable/input identities and requires the preserved baseline. Linux GNU time supplies maximum process RSS per run; wall time includes wrapper/process startup. This measurement branch has not executed here. Process RSS does not substitute for official cgroup memory.peak. Raw times, memory observations, speedups and official harness results remain absent.

## Resumed goal blocked audit

Three consecutive resumed goal turns confirmed the same session-access blocker. The agent remains in the Windows CodexSandboxOffline context; the working Ubuntu environment is inaccessible from it. No required executable evidence changed. The goal is blocked, not complete; resume after providing agent access to the Ubuntu workspace and Docker engine. See artifacts/verification/resumed-goal-audit.json for the requirement audit. Existing implementation, unverified candidate and pending official requirements are preserved.

## Linux resumed goal blocked audit — 22 October 2026

Three consecutive goal turns confirmed Docker Server permission denial and Node captured-subprocess EPERM. Direct compilation succeeded, but mandatory correctness, sanitizer execution, offline container, verified checkpoint and benchmark gates remain incomplete. The goal is blocked pending an execution context permitting the existing commands. See `artifacts/verification/resumed-goal-audit.json`. Implementation and official pending requirements are preserved.
