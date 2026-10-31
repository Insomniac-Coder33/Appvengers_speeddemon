# Speed Demon: second audit and how to proceed

Audit completed 20 October 2026 for a solo developer using AI assistance. Read this with [the participation guide](SPEED_DEMON_GUIDE.md) and [the updated solution strategy](SPEED_DEMON_STRATEGY.md). This file contains planning guidance and prompts, not competition implementation. No solution has been built, benchmarked, or qualified.

**1. What the second analysis changes**

The algorithm analysis remains useful, but the initial A+C+B recommendation needed stronger limits on scope. We cannot equate three proposed tracks with the greatest chance of any prize. Highest K is one cross-track contest; overall ranking needs three eligible tracks; the write-up is a separate award; lean ordering is unresolved. Human judging affects overall track totals, not raw K.

Use **A-first with an option to expand**. C is the preferred second candidate because it shares parsing and aggregation knowledge. B is a provisional third, not an automatic choice. Compare B with D when their contracts, actual data, and the developer's strengths are known. If expansion threatens validation or the best entry's quality, pursue the strongest specialist entry and the write-up instead.

There is no evidence that A is an uncrowded track or that our proposed techniques are unique. Distinction must come from measured whole-task efficiency, exact results, a compact implementation, and convincing experiments.

The existing strategy includes the main edge-case families for all five tracks. What it cannot yet provide is proof of complete legal-input coverage: final specifications define those domains. Every unresolved behavior needs an explicit resolution, rather than a guessed implementation.

**2. Coverage of the original guide**

This is a requirements audit, not a completed-readiness checklist. “Covered” means discussed in the documents; it does not mean implemented or verified.

| Guide topic | Coverage and remaining acceptance evidence |
| --- | --- |
| 1. Scope | Covered: exact workload solvers. Decide specialist versus overall using actual capacity. |
| 2. Five tracks | All five compared. Select entries after contracts and effort estimates are known. |
| 3. Task semantics | Extensive edge matrices exist. Resolve exact grammar, arithmetic, ordering, and invalid-input policy. |
| 4. Scoring | Formula, caps, tradeoffs, and time/scaling coupling checked. Run official source/dependency/accounting scripts when released. |
| 5. Gates | Semantic correctness, byte correctness, timeout, memory, speed floor, and sandbox checks must each have evidence. |
| 6. Environment | Constraints documented. Linux container runtime and toolchain still need verification. |
| 7. Data/leaderboard | Record official file identities and distinguish sample, full, scaling, and holdout roles. Sample ranking is provisional. |
| 8. Submission | Confirm exact build context, Dockerfile, README, PERF, license, metadata schema, paths, and recorded revision. |
| 9. Participation | Confirm registration/solo entry and contact route. Keep new project code inside the permitted coding window. |
| 10. Awards | Distinguish raw K, judged overall totals, lean ordering, and separate published write-up. Resolve stacking. |
| 11. Architecture | Candidate representations and invariants covered. Choose language and interfaces after semantics and toolchain review. |
| 12. Measurements | Require clean end-to-end runs, raw observations, exact output checks, and normal/tenfold memory peaks. |
| 13. Documentation | Record real experiments, provenance, commands, limitations, and future work. Do not fabricate results. |
| 14. Teamwork | One human owner, bounded AI tasks, explicit file ownership, serialized benchmark runs. |
| 15. Readiness | Replace generic checkmarks with reproducible evidence tied to an exact revision. |
| 16. Unknowns | Maintain an unresolved-questions list; disagreements between spec/reference/harness require clarification. |
| 17. Glossary | Covered; use the exact measurement definitions rather than familiar but different meanings. |
| 18. Sources | Record source URL/version/date and file hashes when artifacts become available. Organizer contracts outrank our design hypotheses. |

For each requirement, the eventual plan should record:

`requirement ID | authoritative source/version | interpretation | verification method | evidence/revision | status`

Useful statuses are **unresolved**, **designed**, **implemented**, and **verified**. A design note must never be marked verified merely because it sounds correct.

**3. Dates and participation actions**

The guide deliberately omitted the calendar. For planning, the organizer currently lists the following. Exact times below are converted to Asia/Kolkata, UTC+05:30; date-only listings have no invented cutoff time. [Organizer timeline](https://speeddemon.dev/).

| Event | India time/date |
| --- | --- |
| Team formation closes | 26 October 2026; exact cutoff unspecified |
| Final specifications/reference/harness release | 28 October 2026, 11:30 p.m. IST |
| Sample release | 30 October 2026, 11:30 a.m. IST |
| Coding window begins | 30 October 2026, 11:30 p.m. IST |
| Code freeze | 2 November 2026, 11:30 p.m. IST |
| Write-up deadline | 10 November 2026; exact cutoff unspecified |

Confirm registration and solo-team status through the organizer's process; this session has not registered you. Check the precise deadline applicable to a solo entry rather than treating the team-formation date as a confirmed registration deadline. Keep a reachable contact route during judging.

Research, design, and environment preparation are permitted beforehand; project code must be newly written during the coding window. [Organizer rules](https://speeddemon.dev/). Plan project-specific solvers, tests, generators, and build scripts in prose now; author them in the permitted window unless the organizers expressly clarify an exception. Reading or running organizer-provided materials is different from writing an advance solution. Do not hide early authorship by delaying a commit.

**4. What was actually checked on this computer**

These are observations from the current restricted Windows session, not conclusions about every installed environment.

| Check | Observed result | Meaning |
| --- | --- | --- |
| Git | Version 2.51.2.windows.1 available | Git executable works. |
| Current directory | Not inside a Git repository | No submission repository is established here yet. |
| Docker client | Version 29.5.3 available | Client installation exists. |
| Docker engine | Could not connect to default engine pipe; Docker config access denied in session | Linux-container operation is unverified; this does not prove Docker is absent or broken. |
| WSL | Executable exists; distribution enumeration denied | Installed distribution and its toolchain remain unknown. |
| C++/Rust on Windows PATH | clang++, g++, rustc, cargo not found | They may still exist inside Linux, containers, or outside this PATH. |
| Python | Windows application alias found | A working interpreter was not established by that check. |

The appropriate preparation task is to establish a working Linux x86-64 development/container environment and a familiar compiler, with sufficient storage and memory for normal and tenfold data. Use generic toolchain/container checks before kickoff, without authoring track-solving code. Do not switch language solely because AI can generate it. C++ or Rust are reasonable candidates only when you can understand and debug the resulting program.

Later clean-build verification must include the exact allowed base image/toolchain provisioning, dependencies available without network, Linux paths, executable permissions, LF build scripts, read-only input/root, permitted scratch, and prescribed output files. A cached local Docker success is not proof of a reproducible offline build.

**5. Evidence required before expanding the entry**

The following are proposed management decisions, not additional event rules.

| Decision | Evidence to require |
| --- | --- |
| Continue beyond A's first version | Correct end-to-end output; known numeric/parser semantics; functioning offline container; measured baseline. |
| Commit substantial effort to C | Clear CSV/number/join contract and a bounded verification design; enough time remains for A and final delivery. |
| Attempt a third track | A and C have passing output checks, clean builds, measured 1x runs, credible 10x memory bounds, and no unresolved mandatory semantics. |
| Choose B rather than D | Tokenizer/grammar and index storage are tractable, and a competitive complete workload appears achievable within the remaining budget. |
| Choose D rather than B | Graph/query structure supports a tested total-run strategy; preprocessing, memory, and speed-floor risks are acceptable. |
| Keep an optimization | Exact outputs still match and the whole scoring tradeoff improves by more than measurement noise, or it provides necessary eligibility/headroom. |
| Abandon expansion | A correct third baseline cannot be reached within its bounded attempt, required semantics remain unknown, or validation time would be consumed. |
| Submit | Exact recorded revision passes the clean offline build and required correctness/operational checks; artifacts and metadata match it. |

Any speed-floor estimate from the sample board is provisional. The final full holdout and strongest correct competitor can change the conclusion. Aim for margin, but do not invent a guaranteed eligibility threshold beyond the actual rule.

One example of a realistic solo envelope is **40 focused work hours + 21 sleep hours + 6 meals/break hours + 5 contingency hours = 72 elapsed hours**. It is a planning assumption to adapt to your actual availability, not a prescription to work continuously or a promise that three tracks fit.

| Focused-work budget | Hours |
| --- | ---: |
| Contract/harness integration | 3 |
| A baseline, verification, and useful optimization | 10 |
| C, if expansion is justified | 8 |
| Optional third-track attempt | 7 |
| Final validation | 5 |
| PERF/README and write-up evidence | 4 |
| Packaging and submission | 3 |
| Total | 40 |

Protect the final 12 focused hours for validation, documentation, and delivery. A possible third-track stop rule is a three-hour attempt to reach a correct complete baseline, with seven hours total to make it submit-ready. These limits are deliberately proposed caps, not estimates that B or D is easy. If they are unrealistic after inspection, choose the specialist route early. Unused expansion time can improve the strongest entry and its evidence. Avoid launching additional heavy agent builds or profiling jobs while benchmarking.

**6. Specific technical issues the plan must carry forward**

- **A:** Exact rank/interpolation definition; 5xx boundaries; hour grouping and timezone semantics; full endpoint identity; no averaging worker percentiles; distinguish 12.4 MB raw latencies from measured cgroup peak.
- **C:** Quote/CRLF/BOM state across buffers; exact decimal or IEEE semantics; duplicate/missing join keys; early grouping only after an equivalence argument; every row still needs aggregate routing.
- **B:** Exact tokenizer and left-associative grammar if confirmed; unary/binary NOT and document universe; phrase positions/repeated words; sorted posting invariant; 10x construction peaks; query visibility during build.
- **D:** Directed reverse graph; zero weights; uint64 path/shortcut sums; correct bidirectional stopping; preprocessing included; no assumed road topology; path reconstruction if required.
- **E:** Self-contained fresh-process decoder; reversible bit patterns; metadata counted; overlapping match-copy semantics; incompressible fallback; harness's actual weighted timing. The memory cap still applies even though compressed bytes replace memory in the scoring formula.
- **All tracks:** Short I/O, final unterminated record where legal, overflow, output bytes, deterministic execution, resource limits, live allocation peaks, source/dependency normalization, and holdout-safe behavior.

If the written spec and reference disagree, preserve a small reproducer and identify whether the disagreement is semantic or only serialization. Seek organizer clarification rather than silently implementing the mathematically preferable behavior or blindly copying a suspected bug. Continue independent work while that specific choice remains unresolved.

**7. How to use Plan mode**

Open this workspace in Codex and select Plan mode. Official OpenAI documentation describes `/plan` and Shift+Tab as planning controls; their availability depends on the client. Check the visible mode indicator. In the CLI, `/plan` explicitly starts planning and can include a prompt. [OpenAI planning guidance](https://learn.chatgpt.com/guides/best-practices), [command reference](https://learn.chatgpt.com/docs/developer-commands?surface=cli).

Use the current conversation if convenient; a fresh thread also works when the files are provided. Plan mode is useful for resolving unknowns and producing decisions with acceptance criteria. It does not supply missing organizer specifications or make a speculative algorithm optimal.

The prompt below asks for a read-only planning response. Do not require the planner to write project files while in that mode. Once reviewed, save the plan through an editing-capable session with a documentation-only request. Creating a saved plan is separate from starting implementation.

Copy-ready prompt for now:

```text
Remain in Plan mode. Inspect and plan only; do not write competition code,
tests, generators, build scripts, or other executable project artifacts.

Workspace: C:\Users\Pratik\Desktop\Speed_demon
Read SPEED_DEMON_GUIDE.md, SPEED_DEMON_STRATEGY.md, and
SPEED_DEMON_NEXT_STEPS.md completely, plus any applicable AGENTS.md.

I am entering Speed Demon solo with AI assistance. Optimize for a realistic
chance of a prize with a correct, explainable submission. Do not invent
winning probabilities, benchmark results, or eligibility guarantees.

Treat A-first as the starting hypothesis. Compare specialist entry plus
write-up against expanding to A+C+B or A+C+D. Do not precommit three tracks.
Use current organizer sources and any released specifications, reference
implementations, and harness. Distinguish official facts, assumptions,
design choices, and unresolved conflicts. Do not silently resolve conflicts.

First inspect available tools read-only. Ask at most three essential questions
about my language experience, actual weekend availability, and Linux/Docker
readiness if the workspace cannot answer them. Continue independent analysis
while awaiting answers. Do not install tools or change machine settings.

Return one decision-ready plan containing:
1. Recommended prize route and explicit criteria for adding/dropping tracks.
2. Preparation allowed now, specification-review work before kickoff, and
   implementation work that must wait until the authorized coding window.
3. A requirements-to-evidence matrix covering semantics, exact output,
   correctness tests, runtime/memory/source/dependencies/scaling, the speed
   floor, offline packaging, submission metadata, license, and write-up.
4. For each selected track: baseline algorithm, data representation,
   correctness invariants, 1x/10x memory model, prioritized experiments,
   edge cases, fallback, and measurable acceptance criteria.
5. Language/toolchain choice justified by my ability to review it and the
   actual offline Linux environment. No guessed metadata keys or filenames.
6. A realistic 72-hour budget with sleep, breaks, contingency, a bounded
   third-track attempt, and protected final verification/documentation time.
7. A milestone sequence from clean baseline through measured optimization
   to the exact tested submission revision. Preserve a known-good fallback.
8. Bounded AI delegation with separate file ownership and one integration
   owner; run benchmarks without competing local workloads.
9. All remaining organizer questions, what each blocks, and the first safe
   next action. Mark implementation and verification as pending where true.

Use brief rationale and explicit tradeoffs. Prefer the simplest candidate
that satisfies the evidence. The plan is complete when another session can
execute its resolved milestones without guessing; unresolved milestones
must name the missing evidence. Return the plan in chat without editing files.
```

**8. Follow-up prompts for the later stages**

After reviewing the plan, switch to an editing-capable mode and use this to preserve it without beginning code:

```text
Save the agreed plan as PLAN.md in this workspace, with its assumptions,
unresolved requirements, milestones, and acceptance criteria. This is a
documentation-only task. Do not implement or create executable artifacts.
```

After official specifications and the harness are released, return to Plan mode:

```text
Reconcile PLAN.md against the newly released official specifications,
reference implementations, metadata schema, and harness. Read their actual
contents. Report every changed assumption, settle supported decisions,
retain genuine conflicts as questions, and revise the recommended track
portfolio and memory/time budgets. Do not write competition code before
the permitted window. Return the updated plan and exact next milestone.
```

Only after the coding window has begun, use an editing-capable mode for a bounded implementation milestone:

```text
Verify that the competition coding window is open and read PLAN.md plus the
frozen official Track A specification and harness. Implement Track A's first
correct end-to-end milestone, including the exact output contract, targeted
edge-case verification, and required offline packaging. Resolve routine
implementation choices autonomously within the plan. Do not expand tracks.
Run the available correctness and container checks, record real results and
remaining blockers, and update PLAN.md and PERF.md. If required semantics
are missing or conflicting, do independent work but do not invent them.
```

For an optimization milestone after a correct baseline exists:

```text
Profile the verified Track A baseline and select the highest-value remaining
experiment from PLAN.md. Preserve the known-good version. Make one coherent
optimization, verify exact outputs, and compare repeated whole-task runtime,
measured peak memory, source/dependency cost, and scaling where available.
Keep it only when the evidence justifies the tradeoff. Record the real
experiment and update the plan; do not broaden scope or invent measurements.
```

An optional later AGENTS.md can hold short stable rules: official contracts govern semantics, exact results precede optimization, measurements need revision/input identities, benchmarks run alone, and build/test commands must be real. PLAN.md should hold changing milestones and decisions. These are local working conventions, not organizer-mandated files. Their accounting treatment still follows the harness.

**9. What a submission-ready result actually means**

- All selected tracks have resolved contracts and a known-good revision.
- The exact revision builds from a clean checkout using the prescribed offline process, with its toolchain/base image properly provisioned.
- Required hashes match, legal edge cases pass, output is deterministic, and the program follows the actual runner contract.
- Normal-size measurements are repeatable; tenfold execution or any limitation is explicitly measured and understood. A payload estimate is not a peak-memory measurement.
- Dependencies and normalized source are checked by official accounting, including generated/shared/vendored material where applicable.
- Public source, OSI license, README, PERF, Docker/build files, and exact metadata are present; the recorded submission revision is the one tested. Check the released README requirements, including the requested account of what another 24 hours would enable.
- An early valid attempt and final submission receipt/status are checked through the actual organizer workflow. The sample-board rate limit is respected; no assumed branch-selection convention is used.
- A late change does not replace the known-good revision without rerunning the affected checks. Do not force-push or rewrite history to conceal authorship or failed experiments.
- The write-up award is tracked separately from PERF, including publication/tagging requirements and its deadline. Publishing and messaging require the user's explicit instruction.
- Keep benchmark logs and input/revision identities for any permitted measurement-rerun request.

The immediate next action is to use the planning prompt, resolve your language/availability/environment choices, and preserve the resulting plan. Competition implementation remains a later, time-gated activity.
