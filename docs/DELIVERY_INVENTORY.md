# Official integration inventory update — 31 October 2026

The released specification is now integrated in `candidates/official-track-a/track-a/`, the prospective Track A delivery context. Its seven small files are Dockerfile, build.sh, src/main.cpp, .dockerignore, README.md, PERF.md and the actual starter .speed-demon.toml template. The team placeholder is explicit and unresolved. Fresh optimized/sanitizer/reference/full-hash/offline checks passed; see [active PLAN](../PLAN.md) and [report](../artifacts/official-integration/REPORT.md).

All older implementations, locks, checkpoints and raw evidence stay preserved. Exclude outer tests, downloaded data, verification tools/results, binaries and checkpoint/archive bulk from eventual delivery. Missing owner metadata, license/rights, authorized repository/publication, eligibility resolution and genuine board evidence remain pending. No extra track or submission is prepared. The inventory below is the preserved October 25 snapshot; its pending-spec and metadata-unavailable statements are superseded by this update and the active PLAN.

# Track A delivery inventory — local handoff only

## Published-rule update and isolated context — 25 October 2026

Sources: [current organizer page](https://speeddemon.dev/) and [image allowlist](https://speeddemon.dev/allowlist.json), retrieved/archived with headers and hashes. The earlier local-only inventory is preserved under `artifacts/packaging-gcc15/previous-active-docs/`. Known current requirements replace the formerly blanket-pending packaging/delivery status; exact track specification/reference/harness are scheduled for October 28.

The small self-contained technical candidate is **`packaging/gcc15/track-a/`**, containing `Dockerfile`, `.dockerignore`, `build.sh`, `src/main.cpp`, `README.md`, `PERF.md`. Its GCC15 pin is exact/currently allowlisted, unlike the historical root GCC14 lock. Fresh g++ (GCC) 15.3.0 optimized/sanitizer suites passed 326 checks each, clean offline build 14.039989 s, reported size 552,658,341 B/unpacked 1,535,424,868 B, runtime and constrained smoke passed. See [the local result](../artifacts/packaging-gcc15/REPORT.md).

If future authorized repository packaging selects this candidate, that directory is the prospective `track-a/` context; none of its build inputs come from parents. Root experiments, generated `artifacts/`, `build/`, `baselines/`, `candidates/`, and outer provenance/handoff bulk remain outside that context and preserved locally. Runtime dependencies are already in the approved image. Do not copy the whole workspace into a track folder.

Currently described per-track files include `.speed-demon.toml` and source/docs; its complete schema and approved owner values are not supplied, so the file is **not created**. Published requirements also call for public GitHub source under an OSI-approved license at freeze and genuine board IDs in final PERF history. License/Git setup and those IDs remain absent, not fabricated. The new-code-window rule is a material eligibility conflict for early local work; retain provenance and require organizer resolution. No package is claimed submission-ready.

The table below still distinguishes future dependencies. References to the root source/build files are preserved local baseline inputs, **not** a claim that the old root Docker context/pin now meets current rules. The isolated context above is the new technical packaging candidate; old optional validation sources remain outside its build scope.

Date: **25 October 2026**. This is a prospective allowlist and gap inventory, not a package, official manifest, metadata file or submission. The scalar root implementation is the selected local default. No file is removed, no Git repository is initialized, no license is chosen, and no archive or remote delivery is produced here.

## Remaining decisions and external dependencies

| Requirement / dependency | Observed local state | What remains before an eventual authorized delivery |
| --- | --- | --- |
| Official specification and reference | Preview and general rules fetched; local-v1 kept, exact specs/reference scheduled Oct 28 | Obtain versioned specification, samples/reference outputs and input identities; resolve the single [PLAN reconciliation table](../PLAN.md#official-spec-reconciliation) without guessing |
| Official harness, build/platform/provisioning and accounting | Fresh current-allowlist GCC15 packaging checks passed locally; exact official harness/accounting acceptance remains unproven | Obtain exact invocation, resource/memory/10x/scoring and source/dependency-accounting rules; verify the actual final context and selected revision against them |
| Metadata and write-up format | Published filename `.speed-demon.toml` and broad fields known; complete schema/approved values and genuine board run IDs still missing; no file fabricated | Receive actual filenames/schema/fields and format restrictions, then get owner-approved values. Do not infer them from directory/user names or invent a template |
| License and rights/notices | **No project license file found**; no license selected in this milestone | Published OSI-approved-license requirement is known; owner selects the actual compliant license/rights/notices and text later. No legal/eligibility conclusion is made from absence alone |
| Git repository and provenance | Read-only `git rev-parse --is-inside-work-tree` returned “not a git repository.” A visible `.git` path has no usable worktree metadata; `.gitignore` alone is not a repository | Published public-GitHub-at-freeze requirement is known; owner authorizes later repository setup/publication separately, reviews the file allowlist, and records genuine commits only when they exist. No initialization, commit or remote is performed here |
| Early-development eligibility | User authorized early local development; historical planning and provenance are preserved | Published new-code-window rule materially conflicts with treating early local code as an eligible submission; obtain organizer resolution, preserve authorship/timestamps, and claim no exception |
| Final selection and publication/delivery authorization | Baseline default; candidate correctness-verified/performance-unproven; all prior evidence preserved | Explicitly select the final revision after reconciliation. Publication, pushing, deployment and submission remain separate future actions requiring instructions |

The current packaging milestone fetched the public homepage/allowlist. The earlier documentation-only milestone did not; exact track assets remain scheduled according to the fetched page, not fabricated from previews or assumed absent from private channels.

## Historical baseline file roles and conditional companions

The following existing root files remain useful local baseline/provenance companions. For the prospective current-rule build payload, use only the isolated track context listed above; its own script has context-relative source paths. They are file paths, not copied artifacts. Current README/contract prose is explicitly local-v1 and must be reconciled before an official package.

| Existing file | Intended role | Delivery condition |
| --- | --- | --- |
| [track-a/src/main.cpp](../track-a/src/main.cpp) | Default scalar solver source | Reconcile semantics and keep the chosen verified revision explicit |
| [build.sh](../build.sh) | C++20 build entrypoint | Confirm official flags, location and entrypoint; current default compiles scalar source |
| [Dockerfile](../Dockerfile) | Offline compiler-image recipe and executable entrypoint | Confirm allowed image/provisioning, target platform and harness paths |
| [.dockerignore](../.dockerignore) | Existing build-context allowlist | Currently permits Dockerfile, build.sh and default `track-a/src/`; official context may differ |
| [README.md](../README.md) | Build/run/verification runbook and limitations | Review local-only links and replace provisional instructions only from actual rules |
| [toolchain.lock.json](../toolchain.lock.json) | Observed compiler/image provenance | Preserve genuine pin; do not substitute invented digest or describe old compiler-status prose as new tests |
| [track-a/LOCAL_CONTRACT.md](../track-a/LOCAL_CONTRACT.md) | Explicit local policy disclosure | Include as local context only if useful/allowed; it is not the official specification |

Conditional additional files, **not fabricated or finalized now**:

- The owner-selected license file (conventionally `LICENSE`, or an approved equivalent) and required notices. None exists yet; no license identifier/text is chosen.
- The named `.speed-demon.toml`, only after complete schema details and owner-approved values are supplied. No placeholder file is created.
- A reviewed final version of [OPTIMIZATION_WRITEUP_DRAFT.md](OPTIMIZATION_WRITEUP_DRAFT.md), only if the eventual write-up route/format permits it. The present draft stays unpublished and labels observations/unproven improvements.
- Tests, development sources or concise evidence excerpts only if required/allowed by source accounting or reproducibility rules. They are not solver runtime dependencies. Selection must not imply the whole workspace is the submission.

Current `.dockerignore` rules already avoid sending generated/candidate archive bulk to the **root Docker build**. That allowlist is neither a Git policy nor proof of an official submission's file/accounting requirements. No package is assembled from this inventory now.

## Optional local validation companion, separate from the minimal build

Preserve these existing sources for complete local validation. They are distinct from generated datasets/binaries and from the prospective technical file set above:

- [track-a/tests/test.mjs](../track-a/tests/test.mjs): independent 326-case executable/oracle suite.
- [scripts/build.mjs](../scripts/build.mjs), [preflight.mjs](../scripts/preflight.mjs), [container-check.mjs](../scripts/container-check.mjs), [checkpoint.mjs](../scripts/checkpoint.mjs).
- [scripts/lib/evidence.mjs](../scripts/lib/evidence.mjs), [verification.mjs](../scripts/lib/verification.mjs).
- [scripts/tests/verification.test.mjs](../scripts/tests/verification.test.mjs), [workload.test.mjs](../scripts/tests/workload.test.mjs), and [scripts/workload.mjs](../scripts/workload.mjs).
- Existing experiment drivers [benchmark.mjs](../scripts/benchmark.mjs), [controlled-experiment.mjs](../scripts/controlled-experiment.mjs), [paired-experiment.mjs](../scripts/paired-experiment.mjs), [profile-experiment.mjs](../scripts/profile-experiment.mjs) are source history/reproduction tools, not runtime entrypoints or instructions to run new experiments.

The recorded source manifest includes the whole existing `scripts/` source set. Omitting tools for a smaller future package changes that identity; do not attach an old passing source manifest to a different selected tree and call it verified. Preserve current checkpoints and create fresh evidence for a genuinely changed delivery tree when authorized. Any delivered runbook must resolve its links without requiring excluded local archive bulk; curate allowed small excerpts or rewrite those links at final packaging time.

## Excluded from the eventual default delivery file set; retained locally

| Existing category | Treatment |
| --- | --- |
| `artifacts/` | Generated normal/tenfold inputs and expected outputs, timings, raw telemetry, container records and experiment-local helpers remain local evidence; do not bulk-submit them |
| `build/` | Generated native/sanitizer binaries and per-build directories remain local; build from the selected source in the actual target context |
| `baselines/` | Immutable source/binary/checkpoint archive bulk remains preserved for recovery/provenance, not default submission payload |
| `candidates/` | The experimental source tree and its nested scripts/build/evidence/checkpoint archive are not the default selected solver; retain them unchanged locally |
| `docs/history/` and `docs/handoff-2026-10-25/` | Exact documentation history and preservation/audit records remain local; select only reviewed needed narrative material later |
| Original `SPEED_DEMON_*.md` and `done.md` | Historical planning/status notes stay preserved; not selected as official deliverables |
| Visible `.git`, `.agents`, `.codex`, `.aws` paths and other local tool state | Never treat permission-profile/local environment metadata as submission payload; do not inspect or package private configuration |

The existing [.gitignore](../.gitignore) excludes root artifacts/build/baselines and several binary suffixes, but does **not** exclude the candidate tree. Future authorized repository setup must review explicit file selection instead of blindly adding the workspace. This milestone changes neither `.gitignore` nor Git state and deletes nothing.

## Closing boundary

The local handoff is complete with documentation and a preservation audit. External dependencies remain the authoritative official assets/rules, owner licensing/metadata decisions, eligibility/provenance resolution and authorized repository/final-delivery choices. No future experiments, Git work, license creation, board activity or remote actions start automatically. This isolated packaging check does not complete official semantic, metadata, live-board or eligibility requirements.
