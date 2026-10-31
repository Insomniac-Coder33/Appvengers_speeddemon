# Official integration update — 31 October 2026

The released Track A specification is now integrated in the separate [official-format delivery candidate](candidates/official-track-a/track-a/README.md). Its fresh optimized/sanitizer/reference/offline checks and published full input/output hash gate passed; see [PLAN](PLAN.md) and [report](artifacts/official-integration/REPORT.md). Owner metadata, license/repository/eligibility and genuine board evidence remain pending. The preserved root commands and local-v1 behavior below are historical/local baseline instructions, not the official-format entrypoint. Use the delivery candidate for official-format local runs.

# Track A local runbook

## Isolated packaging candidate under current rules

The [organizer page](https://speeddemon.dev/) and [allowlist](https://speeddemon.dev/allowlist.json) were fetched on 25 October 2026. The legacy root GCC14 packaging pin below is not currently allowlisted; it stays preserved for historical/local validation. Current packaging compatibility is checked separately in [packaging/gcc15/track-a](packaging/gcc15/track-a/README.md), with the unchanged scalar source and exact GCC15 index digest.

Fresh result: **g++ (GCC) 15.3.0**, 326 optimized + 326 ASan/UBSan checks (zero skips), clean offline build 14.039989 s, reported image size 552,658,341 B and unpacked root 1,535,424,868 B, runtime resolution and constrained golden/empty-diff smoke passed. The [report](artifacts/packaging-gcc15/REPORT.md) and [fresh identities](artifacts/packaging-gcc15/verification.json) distinguish this from old GCC13/14 proof.

To build only that folder after the exact image has been provisioned:

```sh
docker build --pull=false --no-cache --network=none --platform=linux/amd64 packaging/gcc15/track-a
```

This is not an official submission: CLI/input/output remain explicit local-v1, with no invented official filenames. Exact specs/harness and metadata details remain scheduled; current license/repository/eligibility and genuine board evidence requirements are in [PLAN](PLAN.md#official-spec-reconciliation) and the [updated inventory](docs/DELIVERY_INVENTORY.md). No default/root source is replaced, and no performance promotion is claimed.

The scalar C++20 baseline is the default. The endpoint-span candidate is preserved separately and is **correctness-verified, performance-unproven**. Both passed the recorded 326-check local suite and ASan+UBSan suite, plus clean offline-container checks. Timing remains unresolved after the bounded M3 comparison and M4 identical-binary control. This is a provisional `local-v1` implementation, not an official submission or an official correctness claim.

The earlier documentation-only handoff was checked on **25 October 2026** without reruns; its text is archived under `artifacts/packaging-gcc15/previous-active-docs/`. The later isolated GCC15 package above has fresh builds and verification, with no timing campaign. Current execution access must be checked in the process that will run a command; another terminal's access is not evidence for that process.

## Prerequisites

- Linux x86-64 for the verified development route; a C++20 compiler, C++ standard-library/runtime and shell. Recorded native builds used **GCC 13.3.0**. `CXX` selects the compiler executable; Node is not a solver runtime dependency.
- **Node.js 20+** for development scripts and tests. Recorded runs used Node **20.20.2**. ASan/UBSan runtimes are required for full native preflight.
- For full preflight/offline packaging: an accessible **Docker Server**, not merely an installed client, and the complete pinned Linux/amd64 compiler image already provisioned. The historical root container compiler is **GCC 14.4.0**; the isolated current-rule package above uses **GCC 15.3.0**.
- Writable `build/`, `artifacts/` and temporary directories; GNU/Linux filesystem alias support for the complete recorded filesystem checks.
- Only for a separately authorized experiment: GNU `/usr/bin/time`, `taskset`, and its documented tools. M4 additionally used Python 3, `prlimit`, `timeout` and Linux cgroup/pressure interfaces. These are not required by the standalone solver.

The **legacy root-validation** image pin is recorded in the unchanged [toolchain.lock.json](toolchain.lock.json); it is not on the current fetched organizer list:

```text
gcc@sha256:336f0bc6ca54b6bd8abe0bfad3e5f2d292258b18f0a6c6adf784f61e5a892267
```

If a restricted execution context denies Docker or captured subprocesses, use its supported scoped approval flow for the specific command. Do not bypass the boundary or weaken the checks. A subprocess result containing `EPERM`, another error, or a signal is a failure even when status is 0. Approved execution outside the sandbox worked for the fresh isolated GCC15 verification. Future executions must still use the supported scoped approval flow when required.

## Build and run the default baseline

Run from the workspace root. The input must follow [the local contract](track-a/LOCAL_CONTRACT.md). The absolute input/output paths below are placeholders: use an existing regular input file and a new disposable output path whose parent exists.

```sh
CXX=g++ sh build.sh
./build/track-a --help
./build/track-a --contract local-v1 --input /absolute/path/input.log --output /absolute/path/result.json
```

`build.sh` compiles `track-a/src/main.cpp` into `build/track-a` with `-std=c++20 -O2 -DNDEBUG -Wall -Wextra -Wpedantic`. Optional `--buffer-size N` accepts 1 through 16777216 bytes, default 1048576. Success writes only the requested JSON file, with empty stdout. Errors return nonzero and explain the failure on stderr. Contract/input/output options are mandatory; duplicate options are rejected.

Input/output aliases and special/symlink output targets are rejected. Malformed input preserves an existing output, but a later write failure after truncation can destroy a prior output; replacement is not transactional. Use disposable outputs.

A recorded native build can instead be produced with:

```sh
CXX=g++ node scripts/build.mjs
```

That driver prints a fresh `build/run-*/track-a` path and records compiler/source/binary identities in `artifacts/build/native.json`. Its `verified` flag means compilation only. It does not establish solver correctness; do not confuse that fresh path with `build/track-a` from the shell build.

## Verification commands and existing evidence

For a newly built shell-build binary, the independent executable suite is:

```sh
node track-a/tests/test.mjs ./build/track-a
```

For complete recorded verification when code or verification tooling changes:

```sh
CXX=g++ node scripts/preflight.mjs
```

Preflight builds fresh optimized and sanitizer binaries, runs the complete local suite on each, checks development tooling and shell encoding, runs the clean offline container check, and verifies unchanged sources. All required gates must pass. The native ASan+UBSan route is Linux-only and rejects sanitizer diagnostics even in expected-error cases. `--tooling-only` and the oracle's `--self-check` are intentionally insufficient for solver verification.

The current passing records are [baseline preflight](artifacts/verification/preflight.json) and [candidate preflight](candidates/endpoint-spans/artifacts/verification/preflight.json). Each records **326 optimized checks and 326 sanitizer checks, zero skips**. These include 233 existing correctness/robustness cases plus 93 focused span-boundary/control cases. Current native source/test/tooling identities are:

| Revision | Source manifest SHA-256 | Native binary SHA-256 |
| --- | --- | --- |
| Default scalar | `ac513ecb51d4ee4cf3d6f30054c8172d6e749324346e47839d523fccbe69f294` | `24ea3b7d4cf82165e9ee17afc7f6894cb7fb257b680147d8eda05e9fd242de59` |
| Isolated candidate | `9c41e2794115eda7495f084be9d5daf57cc9e8dd1d52e76e566e9e8575f0d511` | `82e4c2a2323940633b388f82bee1a9464ca0e81df86d886ed65a95393eb4e1f0` |

The lock's compiler-status prose retains an earlier 220-check observation; current suite counts come from the passing preflight records above. The lock is preserved unchanged. Documentation-only changes do not alter these tracked source manifests and do not require another full preflight.

## Verified checkpoints and isolated candidate

| Checkpoint | Meaning |
| --- | --- |
| [verified-ac513ecb51d4ee4c](baselines/verified-ac513ecb51d4ee4c/manifest.json) | Current scalar comparison baseline with the 326-check suite/tooling snapshot |
| [candidate verified-9c41e2794115eda7](candidates/endpoint-spans/baselines/verified-9c41e2794115eda7/manifest.json) | Separate span candidate with complete local verification; no performance promotion |
| [verified-d9c5e3828341492a](baselines/verified-d9c5e3828341492a/manifest.json) | First verified scalar checkpoint; preserved |
| [verified-7dee32a851a647e0](baselines/verified-7dee32a851a647e0/manifest.json) | Expanded M2 robustness/profile checkpoint; preserved |

Checkpoint manifests include saved sources, tests, build tooling, evidence and binary hashes. Their saved documentation reflects the checkpoint date, not necessarily this runbook. Earlier `baselines/candidate-*` material is unverified history and is not the experimental candidate's verified checkpoint.

After a **new** source identity passes full preflight, preservation uses:

```sh
mkdir -p baselines
node scripts/checkpoint.mjs
```

The checkpoint command deliberately refuses overwrite. The current identities already have checkpoints, so do not run it again for this documentation-only handoff.

To explicitly build/check the preserved experimental source instead of the root default:

```sh
(
  cd candidates/endpoint-spans
  CXX=g++ sh build.sh
  node track-a/tests/test.mjs ./build/track-a
)
```

The same `CXX=g++ node scripts/preflight.mjs` command can be run **from that candidate directory** if its code/tooling changes. Do not copy its source over the root baseline as an implicit promotion.

## Legacy root local-container verification (not current organizer packaging)

```sh
node scripts/container-check.mjs
```

This unchanged root script uses the historical GCC14 pin and does not check the new organizer allowlist. Use the separate GCC15 evidence for current packaging compatibility. The script checks actual Linux/amd64 image provenance and Docker Server access, then builds with `--pull=false --no-cache --network=none`. It records an immutable built image ID and runs that image with no network, read-only input/root, a fresh writable output, an 8 GiB memory/swap ceiling, 1 GiB tmpfs, 512 PIDs and 8192 open files. Its output must match the hand-derived local golden. It does not pull missing images.

The Dockerfile copies only the selected tree's `build.sh` and `track-a/src/`; `.dockerignore` is a build-context allowlist. This is a **container smoke check**, not the complete suite inside the container or official harness acceptance. Native full suites and sanitizer evidence are separate. Future official provisioning, entrypoint and resource rules still require reconciliation.

## Current limitations and handoff

- Semantics remain [provisional local-v1](track-a/LOCAL_CONTRACT.md): strict six-digit UTC timestamps, nearest-rank integer percentiles, endpoint/hour counts, exact rate fractions and a local JSON schema. General packaging/mount/delivery rules are now fetched; exact track semantics, filenames, metadata details and harness are still pending. Use the single [reconciliation table](PLAN.md#official-spec-reconciliation) before any adaptation.
- [M3](artifacts/experiments/track-a-m3/REPORT.md) used six balanced pairs per workload and did not justify candidate promotion. [M4](artifacts/experiments/track-a-m4/REPORT.md) used the exact baseline binary under both labels and found comparable/larger variation. No repeatable solver speedup or official score is claimed.
- M4's three increasing cardinality/shared-prefix cases passed both implementations under predeclared 128 MiB/256 MiB/1 GiB caps. These are successful tested envelopes, not minimum memory requirements or maximum supported size. Process RSS and fresh-container cgroup peaks are different scopes. Warm/shared page charging limits interpretation.
- `/tmp` experiment paths are disposable. Reports and raw records in the workspace remain authoritative; a missing staged output is not permission to rerun a completed batch. A new experiment needs a separate bounded plan. No experiment starts automatically from this handoff.
- A license has not been selected/added, and this workspace is not a usable Git worktree. No repository initialization, license selection, metadata fabrication or delivery occurred. See [the delivery inventory](docs/DELIVERY_INVENTORY.md).

The [unpublished optimization draft](docs/OPTIMIZATION_WRITEUP_DRAFT.md) separates implementation choices, measured observations and unproven performance conclusions. [PERF.md](PERF.md) retains the experiment record. All work remains local; official eligibility, metadata, reference/harness and submission instructions are external dependencies.

## History

The previous README is preserved verbatim in [the pre-handoff README archive](docs/history/README-before-handoff-2026-10-25.md). The previous plan and performance record are also archived there. Historical Windows/compiler/Docker access failures are records of earlier sessions, not current run instructions. Original `SPEED_DEMON_*.md`, checkpoints and all raw evidence remain unchanged.
