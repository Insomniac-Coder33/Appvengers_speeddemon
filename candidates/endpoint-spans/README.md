# Track A endpoint-span candidate — experimental

Latest decision: **endpoint-span candidate is correctness-verified, performance-unproven; baseline remains default**. Full preflight passed 326 optimized and 326 sanitizer checks for each revision. One balanced six-pair batch per workload produced mixed/noisy timings and no promotion. See root `artifacts/experiments/track-a-m3/REPORT.md`, `PLAN.md` and `PERF.md`.

This is the isolated candidate tree. Its build explicitly opts into the candidate; normal builds from the root workspace continue to use the scalar baseline.

Previous local robustness/profile milestone: 233 optimized and 233 sanitizer checks passed; original baseline preserved. Controlled ext4/CPU-pinned timings remained above 5% spread, so no solver optimization was accepted. See `artifacts/experiments/track-a-m2/REPORT.md`, `PLAN.md` and `PERF.md`. Official requirements remain pending.

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

C++20 implementation of compact log parsing and exact aggregation, with an explicitly **provisional `local-v1` contract**. Only Track A is in scope.

The user authorized early local development. The original three planning documents are preserved; `PLAN.md` records the current authorization and decisions. Nothing has been pushed, published, deployed or submitted.

**Current limitation (21 October, 13:47 UTC):** the user has provisioned Linux x64, Node 20, GCC 13, GNU time and working Docker from Ubuntu, with `gcc:14` downloaded. This Windows `CodexSandboxOffline` session cannot access them: WSL returns `E_ACCESSDENIED`, and Docker returns permission denied at its engine pipe. Full preflight was attempted here and failed at compilation (`g++ ENOENT`) and Docker access; all tooling checks passed. Resume the agent inside the accessible Ubuntu environment to continue. The C++ program remains unexecuted, the actual image digest/platform remain uninspected, and no verified baseline or measurement is claimed. See `artifacts/toolchain/resume-environment-2026-10-21.json` and `PERF.md`. Older environment observations below are historical.

## Implementation

The parser consumes bounded byte buffers, owns each unique endpoint name once, retains uint32 latencies per endpoint, and records uint64 request/error counts per endpoint-hour. It sorts latency vectors and uses exact nearest-rank integer percentiles. Endpoint bytes determine identity and output ordering. Numeric parsing checks bounds.

The provisional policies are intentionally separate functions: timestamp interpretation, percentile calculation, and output serialization. See `track-a/LOCAL_CONTRACT.md` for exact local semantics, including unsupported timestamp forms and the local JSON schema. Official output filenames, percentile rules, timestamp domain, hourly grouping and formatting remain unknown.

Error rates retain exact errors/requests fractions. A global rate must sum counts, not average endpoint rates. Percentiles must never be averaged across workers.

No third-party production libraries, approximate statistics, concurrent workers, hand-written SIMD, or custom hash table are used.

## Build and check

Required: accessible C++20 compiler and Node.js 20+ for development checks (this session uses 24.13.1). Node is not part of the program's runtime. Full local verification requires Linux x86-64, GCC/Clang with ASan/UBSan runtimes, an accessible Docker engine and provisioned pinned compiler image. Benchmarks additionally require GNU `/usr/bin/time`.

On Linux with GCC 14 available:

```sh
sh build.sh
node track-a/tests/test.mjs ./build/track-a
CXX=g++ node scripts/preflight.mjs
node scripts/checkpoint.mjs
```

The portable Node build driver accepts an explicit compiler executable:

```sh
node scripts/build.mjs --compiler /absolute/path/to/g++
```

The driver now writes each binary to a fresh `build/run-*/` directory and prints its path. `artifacts/build/native.json` points to the latest build record, including compiler version, source hash, binary hash and exit evidence; an unsuccessful build replaces that pointer with failure evidence. `verified` in a build record means compilation only. It never establishes correctness. The simple `build.sh` command remains the container build entrypoint; use preflight for recorded verification.

On Linux, preflight builds a separate `--sanitize` binary with AddressSanitizer, UndefinedBehaviorSanitizer and nonrecovering errors, then runs the same complete local-contract suite. The tests force fatal sanitizer options and reject sanitizer diagnostics even in cases expecting an invalid-input error. Successful compilation on Windows cannot replace native Linux execution or sanitizer evidence.

For a trusted, verified Windows Zig installation, pass its executable as `--compiler`. The driver invokes `zig c++`; `--target linux` cross-compiles for x86_64-linux-musl. A cross-compiled binary still needs real Linux execution before claiming Linux correctness. No Zig archive was downloaded in this session.

Run the executable with explicit local paths:

```sh
./build/track-a --contract local-v1 --input /path/to/input.log --output /path/to/result.json
```

Use a disposable output path. Input/output aliases are rejected. Malformed input is rejected before output opens; a later write failure can destroy an old output file because replacement is not transactional.

The independent test runner compares complete output bytes with hand-derived goldens and a straightforward materializing oracle. It exercises buffer boundaries, rank transitions, numeric bounds, dates, identity, line endings, randomized cases, invalid inputs and filesystem aliases. Unsupported alias creation is reported as skipped.

```sh
node --check track-a/tests/test.mjs
node track-a/tests/test.mjs --self-check
```

The self-check validates only three hand-derived oracle fixtures. It does **not** test the C++ implementation.

Run the aggregate development preflight with:

```sh
node scripts/preflight.mjs
```

It records commands, results, before/after source identities and all required gates in `artifacts/verification/preflight.json`, plus a timestamped copy. Failure of tooling, build, executable tests, Linux execution, sanitizers, offline container checks or unchanged-source checks makes the overall result fail. A report is marked in-progress before work starts, so an interrupted run cannot leave an old success at the canonical path. Set `CXX` to an accessible compiler executable when it is not named `g++` on PATH.

`node scripts/preflight.mjs --tooling-only` checks independent tooling without retrying unavailable compiler/engine commands. It intentionally returns nonzero because required executable gates did not run. Oracle and script regressions are never counted as solver verification.

## Linux container and offline build

The Dockerfile contains no downloads. It requires a compiler-containing Linux/amd64 image supplied through `BUILD_IMAGE`. The intended compiler is GCC 14; its exact image digest remains unresolved in `toolchain.lock.json`.

Before an offline build, provision the exact image through an authorized online preparation step or an offline image archive. Resolve its genuine digest and record `linux_compiler.pinned_image` as an actual `name@sha256:digest` reference. Do not replace the unresolved value with an invented digest, and do not assume a cached intermediate build proves reproducibility.

```sh
node scripts/container-check.mjs
```

The script checks the Docker engine and pinned image, refuses automatic pulls, then builds with `--network=none --no-cache --pull=false`. Each invocation gets fresh input/output directories and a separate evidence file. Its local smoke run uses read-only input/root, writable output, no networking, an 8g memory limit with no additional swap, 1g tmpfs, 512 PIDs and 8192 open files.

It verifies Linux/amd64 architecture and digest provenance, records the compiler version and base image ID, and runs the exact image ID emitted by the clean build. It does not use a shared mutable output tag. Build-context sources must remain unchanged during verification.

Offline preparation must provide the complete compiler image layers, C++ headers/linker/runtime, and the host development tools before networking is disabled. On an authorized connected preparation environment, resolve the candidate tag to its genuine repository digest and provision that exact digest on the target engine. Record the exact digest from `docker image inspect`, not an example value. If transferring an image archive, verify its checksum and confirm the target retains a digest-addressable reference; `docker load` alone is not evidence of that. This transfer route has not been rehearsed here. The current lock has no pin and no provisioned image, so offline packaging remains blocked.

This is a local packaging rehearsal. CPU affinity, measurement, full test-suite execution inside Linux, base-image provisioning rules and official harness acceptance are separate pending checks. No `.speed-demon.toml` or official filenames have been invented.

## Measurement and baseline preservation

Do not optimize until the complete C++ test suite passes and the source/build/test revision is preserved with a SHA-256 manifest. The saved checkpoint `baselines/candidate-0a6827e48573/` is an **unverified candidate**, not a known-good baseline. It includes the source/build/test files, current documentation and verification evidence; its manifest records individual file hashes.

After preflight passes, `node scripts/checkpoint.mjs` preserves unchanged source/test/build files, verification evidence and the exact executable in a new `baselines/verified-*/` directory. It refuses missing or failed evidence. No such verified checkpoint exists yet.

Stop competing builds, input generators, profilers and benchmark jobs before measurements. Prepare inputs and expected hashes first, serially:

```sh
node scripts/workload.mjs artifacts/workload-normal-3100000 3100000
node scripts/workload.mjs artifacts/workload-tenfold-31000000 31000000
```

These commands require new directories. The two workloads are now prepared locally; their manifests contain actual file sizes/hashes. They use 1,842 endpoints, 48 interleaved UTC hours, one hot endpoint and 1,024 latency values including zero and UINT32_MAX. A separate cumulative-histogram oracle produces expected output. The tenfold input extends the same deterministic prefix; cardinality stays fixed. These are synthetic local distributions, not official datasets or a substitute for cardinality stress tests.

Use the binary path from the passing build record, the expected-output SHA-256 from the workload manifest, and a new output directory:

```sh
EXE=$(node -p "JSON.parse(require('fs').readFileSync('artifacts/build/native.json','utf8')).output")
HASH=$(node -p "JSON.parse(require('fs').readFileSync('artifacts/workload-normal-3100000/manifest.json','utf8')).expectedOutput.sha256")
node scripts/benchmark.mjs "$EXE" artifacts/workload-normal-3100000/input.log "$HASH" artifacts/benchmark-normal-1
HASH=$(node -p "JSON.parse(require('fs').readFileSync('artifacts/workload-tenfold-31000000/manifest.json','utf8')).expectedOutput.sha256")
node scripts/benchmark.mjs "$EXE" artifacts/workload-tenfold-31000000/input.log "$HASH" artifacts/benchmark-tenfold-1
```

The runner refuses binaries without matching current preflight and preserved baseline evidence. It performs one warm-up and five serial complete executions, validates every output hash, retains raw times, and reports the mean of the middle three. Hashing and input preparation occur outside measured intervals. It rejects changed source/input/binary identities. On Linux it wraps execution in GNU time and records each process maximum RSS in KiB; wall time includes the wrapper and process launch. This path has not run here. Process RSS is not cgroup `memory.peak`, which remains a separate official-harness check. A local 10% spread threshold flags a batch for investigation rather than claiming statistical stability.

For 1x/10x work, record actual byte counts and generator dimensions; 3.1M and 31M synthetic records are not automatically official inputs. Raw latencies would require 12.4/124 MB; vector growth, dictionaries, endpoint-hour state and charged memory add to this. Do not substitute estimates or process RSS for measured cgroup peaks.

## Next milestone

Establish accessible compilation and Linux execution; run and fix the full test suite; preserve the first verified baseline; then measure it. Reconcile with released official contracts and harness before claiming official correctness or considering another track.

## Current environment blocker and window investigation

The session runs as `codexsandboxoffline` at medium integrity without administrator membership. Compiler discovery found no usable driver; an existing Android NDK compiler was execution-denied. Docker Desktop is installed, but a hidden normal launch did not leave its backend running. Its service stayed stopped, configuration/context access was denied and the default engine pipe was absent. WSL service is running, but distribution enumeration was access-denied. Ordinary compiler/registry downloads also failed. The session policy rejects sandbox/rules escalation; no ACL, identity or security configuration changes were made.

Minimum external prerequisite: provide an authorized local Linux x86-64 execution context for this workspace with an accessible C++20 toolchain, ASan/UBSan runtime, Node 20+, GNU time, Docker engine and a genuinely pinned compiler image. An approved WSL/Docker setup can satisfy this; a Windows compiler alone cannot complete the Linux requirements. No further product decision or repeated development approval is needed.

Project Node subprocesses already use `windowsHide:true`; current shell calls use captured output without a login profile or PTY. The only owned GUI launch used `-WindowStyle Hidden`. Readable sandbox logs show `codex.exe` launching `codex-command-runner-0.157.1.exe`, but do not establish which launch caused a visible flash. The process command-line/parent query returned access denied, so the responsible command and parent PID remain unconfirmed. No unrelated terminal was closed. Complete that diagnosis with an authorized Windows process snapshot during a flash, including `Name`, `ProcessId`, `ParentProcessId` and `CommandLine`.

Concrete observations are in `artifacts/toolchain/goal-environment.json`. [Official OpenAI documentation](https://learn.chatgpt.com/docs/windows/windows-sandbox) describes the separate low-privilege sandbox user and permission boundaries; it does not establish this machine's flashing-window cause.
