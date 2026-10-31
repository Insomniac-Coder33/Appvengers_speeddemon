# Speed Demon: Complete Project and Participation Guide

This guide explains the competition, the software you would build, scoring, execution requirements, submissions, and an engineering approach. Event dates, deadlines, and the event timeline are intentionally omitted.

**Status:** A planning document, not a competition implementation. Published facts are linked to organizer sources. Sections marked **Engineering guidance** contain recommendations and explanations, not additional competition rules. Exact task specifications and the official harness must resolve details that the overview pages do not define.

## Contents

1. [Purpose and project scope](#1-purpose-and-project-scope)
2. [The five tracks](#2-the-five-tracks)
3. [Understanding the tasks](#3-understanding-the-tasks)
4. [Scoring](#4-scoring)
5. [Correctness and eligibility gates](#5-correctness-and-eligibility-gates)
6. [Execution environment](#6-execution-environment)
7. [Datasets and leaderboard](#7-datasets-and-leaderboard)
8. [Submission contents](#8-submission-contents)
9. [Participation and code rules](#9-participation-and-code-rules)
10. [Awards](#10-awards)
11. [Suggested architecture](#11-suggested-architecture)
12. [Development and measurement approach](#12-development-and-measurement-approach)
13. [Documentation guidance](#13-documentation-guidance)
14. [Track selection and teamwork](#14-track-selection-and-teamwork)
15. [Failure modes and readiness checks](#15-failure-modes-and-readiness-checks)
16. [Unresolved details and source differences](#16-unresolved-details-and-source-differences)
17. [Glossary](#17-glossary)
18. [Sources](#18-sources)

## 1. Purpose and project scope

Speed Demon is Hackathon Raptors' free, online, 72-hour performance engineering competition. A task, reference implementation, and data are supplied; participants produce faster, leaner software with identical results. Organizers benchmark submissions themselves. Five tracks are available; overall-title eligibility requires at least three. The prize pool is USD 2,000. [Organizer overview][overview]

**Engineering guidance:** Think of your project as an executable data-processing system. Its central deliverable is the program that transforms input into the specified output. A dashboard could help you inspect your own experiments, but it would be an optional development aid rather than the computational solution.

For example, consider a hypothetical task that groups purchase records by region. A simple implementation might repeatedly scan the entire file for each region. An improved implementation could collect totals in one pass. Both must calculate the same totals; the improvement comes from doing less work, storing data more efficiently, or both.

The important distinction is between a result and the cost of producing it:

- **Result:** The required records, values, ordering, and representation.
- **Cost:** Time, memory, normalized source size, dependencies, and growth under larger inputs. The source-size metric counts transformed source bytes; it does not directly measure algorithmic complexity.

## 2. The five tracks

| Track | Required workload |
| --- | --- |
| A: Ingest | 3.1M log lines; endpoint counts, p50/p95/p99 latency, hourly error rates. |
| B: Index | 250 MB corpus; inverted index; 50,000 Boolean/phrase queries. |
| C: Join | 204 MB difficult CSV; lookup-table join; sorted aggregates. |
| D: Traverse | Directed weighted graph, 5M edges; 2,000 shortest-path queries; preprocessing timed. |
| E: Compress | 100 MB mixed corpus; lossless compression; size/decompression tradeoff. |

Source: [Unstop task descriptions][unstop].

### Published workload measurements

| Track | Input size | Reference runtime | Timeout |
| --- | ---: | ---: | ---: |
| A | 312 MB | 41.2 s | 412 s |
| B | 250 MB | 58.7 s | 587 s |
| C | 204 MB | 36.9 s | 369 s |
| D | 180 MB | 72.4 s | 724 s |
| E | 100 MB | 29.8 s | 298 s |

Source: [Official track cards][official]. These are reference measurements, not guaranteed performance targets for your laptop.

### Published input previews

These are the organizer's preview formats, not a complete replacement for the task specifications. [Official input previews][official]

| Track | Published format details |
| --- | --- |
| A | Space-separated `ts`, `method`, `endpoint`, `status`, `latency_us`; RFC3339 microsecond timestamps; seven methods; 1,842 endpoints; `uint16` status and `uint32` latency. Statuses in the 5xx range count as errors. Timestamps are monotonic within a shard, not necessarily across interleaved shards. |
| B | Query lines are prefixed with `BOOL` or `PHRASE`; the preview describes 62% Boolean and 38% phrase queries. Boolean operators include AND, OR, and NOT; phrase matching retains stopwords and token positions. |
| C | Columns: `id,name,note,region_id,amount`. Quoted delimiters, escaped quotes, embedded newlines, mixed LF/CRLF, empty fields, and BOMs at some chunk boundaries require careful handling. |
| D | `graph.txt` starts with `n m`; subsequent lines contain `u v w`. Identifiers are dense and zero-based, edge values are `uint32`, and edges are not sorted by source. A reverse edge is separate. |
| E | `corpus.bin` contains fixed prose, log, JSON, and binary segments; boundaries are published and MiB-aligned. The binary preview describes float32 sensor data. |

Track A's published reference peak memory is 2,940 MB. Track E's published reference compression ratio is 2.41:1. Reference implementations are described as being supplied in Go, Python, and Rust; the official harness must establish the actual baseline used for scoring. [Official reference information][official]

## 3. Understanding the tasks

The following explanations are **engineering guidance**. Implement exact semantics from the eventual task specification rather than filling gaps with assumptions.

### Track A: Log aggregation

A log records something that happened in a system, such as a request to an API. Aggregation reduces many individual events into useful statistics.

An endpoint is a route such as `/orders`. A request count tells you how frequently it was used. A percentile describes the latency distribution: p95 is a threshold at or below which approximately 95% of observations fall, subject to the task's exact percentile definition.

Potential design questions:

- Can fields be parsed directly from input bytes without constructing temporary strings?
- Can endpoint names be mapped to compact integer identifiers?
- Is full sorting necessary, or would an exact selection algorithm be suitable?
- Can workers maintain local aggregates and merge them efficiently?
- Does timestamp handling dominate the runtime?

Correctness questions include percentile rounding, empty groups, error-rate denominators, timestamp interpretation, overflow, and output ordering. Approximate percentile sketches are unsuitable unless explicitly permitted.

### Track B: Search indexing

An inverted index maps a word to the documents containing it. Positional information also records where that word occurs, allowing a phrase search to check adjacency and order.

For example, an index might associate `river` with documents 2, 5, and 11, and `bridge` with documents 5 and 8. An AND query can intersect the lists to find document 5. A phrase query needs additional evidence that the words occur together in the required order.

Potential design questions:

- How should document identifiers and token positions be stored?
- Can sorted lists be intersected without temporary sets?
- Does compression save enough memory traffic to justify decoding work?
- Can repeated query terms reuse computation?
- What balance between index construction and query execution gives the best result?

Tokenization is part of correctness. Case conversion, punctuation, Unicode, stopwords, repeated terms, operator order, and duplicate results must follow the specification.

### Track C: CSV parsing and joining

A join connects records from one dataset to matching records in another. For example, an order containing `region_id=7` might be matched to a lookup record naming region 7.

CSV requires a parser that understands field boundaries. A comma inside a quoted field is data; a newline inside a quoted field may not end the record. Simply splitting on commas and newlines is therefore insufficient for complex CSV.

Potential design questions:

- Can a small parsing state machine scan the input once?
- Which fields actually need to be materialized?
- Is a hash-based lookup preferable to sorting and merging?
- Can monetary values use exact scaled integers rather than binary floating point?
- Can output groups be sorted only after aggregation?

Check missing lookup keys, repeated keys, empty fields, encoding markers, escaped quotes, embedded newlines, spaces, negative amounts, and numerical formatting. Handling invalid input must follow the task rather than an invented recovery policy.

### Track D: Graph traversal

A directed edge permits travel in one direction. Its weight represents a cost. A shortest-path query asks for the minimum total cost between two nodes.

The main engineering tradeoff is whether extra preprocessing makes many subsequent queries cheap enough to justify its cost.

Potential design questions:

- Would compact adjacency arrays improve locality?
- Can a reverse graph support bidirectional search?
- How much work is spent on priority-queue operations?
- Can repeated sources or targets share useful computation?
- Is a more complex preprocessing method actually beneficial on this workload?

Check unreachable targets, source-equals-target queries, zero weights, repeated edges, path-distance overflow, and the required output for missing paths. An unsigned edge-weight type alone does not prove that all weights are strictly positive.

### Track E: Compression

Lossless compression encodes data so that decoding reproduces every original byte. Compression ratio and decoding speed often pull in different directions.

For a hypothetical 80 MB input compressed to 20 MB, the compression ratio is 4:1. That says nothing by itself about how quickly either operation runs.

Potential design questions:

- Do different data segments benefit from different representations?
- How large should a dictionary, block, or symbol model be?
- Can predictable fields be transformed before encoding?
- How much metadata must be stored so the decoder can reconstruct the input?
- Does a smaller output actually compensate for a slower decoder?

Check exact round trips, empty blocks, boundary alignment, binary input, integer coding, malformed-stream behavior where specified, and deterministic format handling. Never assume that all input is text.

## 4. Scoring

### 4.1 Efficiency coefficient

The published weighting is time 40%, memory 20%, source size 15%, dependency weight 15%, and scaling 10%. Machine scoring supplies 65% of a track total; human review supplies 35%. [Organizer overview][overview]

The organizer's scoring description defines:

```text
rT = min(Tref/T, 50)
rM = min(Mref/M, 50)
rS = min(Sref/S, 50)
rD = min(Dref/D, 50)
rX = min(Xref/X, 50)

K = rT^0.40 * rM^0.20 * rS^0.15 * rD^0.15 * rX^0.10

speed_score = clamp(100 * ln(K) / ln(25), 0, 100)
```

Each improvement ratio is capped at 50. For E, compressed size occupies M. Normalized source measurement formats code, removes comments, and normalizes identifiers. [Organizer technical article][article]

| Symbol | Submission measurement |
| --- | --- |
| T | Track-specific execution-time measurement |
| M | Peak memory, or compressed size for E |
| S | Normalized source bytes |
| D | Dependency weight |
| X | Runtime growth from normal input to tenfold input |

The `ref` suffix means the corresponding reference measurement. Caps apply to the ratios **before** exponentiation. A ratio below 1 remains below 1; the cap does not remove penalties for worse resource use.

**Engineering guidance:** The ratios reward improvement relative to the reference. For a resource where less is better, halving consumption gives a ratio of 2. The exponents determine how strongly that improvement affects the combined coefficient.

For an original illustrative calculation, suppose time improves 10-fold and every other ratio stays at 1:

```text
K = 10^0.40 = approximately 2.512
speed_score = approximately 28.61
machine contribution to the track total = approximately 18.60 points
```

This does not imply that a 10-fold runtime improvement gives a 10-fold overall score. It changes one component of a weighted calculation.

Useful mathematical checkpoints:

| K | Speed score |
| ---: | ---: |
| 1 | 0 |
| 2 | Approximately 21.53 |
| 5 | 50 |
| 10 | Approximately 71.53 |
| 25 or above | 100 |

These values are calculated from the published formula, not separate prize thresholds.

### 4.2 Measurement definitions

Published technical details: `D = 1 + runtime dependency count + vendored bytes / 50000`; `X = runtime(10x input) / runtime(1x input)`. B weights construction/query time 40/60. E weights compression time at one quarter of decompression time. [Official scoring details][official]

**Engineering guidance:** Use the official measurement scripts for dependency classification, source normalization, and track-specific time aggregation. A ratio or weight described in prose does not justify inventing an implementation for the scoring harness.

For scaling, a program taking 2 seconds at normal input and 22 seconds at tenfold input has X=11. Compare this with the reference's X, rather than treating 11 as an independent score.

For dependency weight, suppose a hypothetical submission has two counted runtime dependencies and 25,000 counted vendored bytes. Substituting into the published expression gives D=3.5. The official rules must decide what is counted and whether particular packages overlap with vendored-source accounting.

### 4.3 Human review and overall results

Code quality contributes 15 percentage points, optimization technique 12, and the performance log 8. Overall ranking uses a geometric mean of qualifying track totals. [Unstop judging criteria][unstop]

The official description specifies independent, anonymized reviews, with judges submitting their assessments before seeing the measured leaderboard. Review criteria use a five-point scale before aggregation. [Official judging process][official]

**Engineering guidance:** If a normalized judge score is represented on a 0-100 scale, the combination is:

```text
track_total = 0.65 * speed_score + 0.35 * judge_score
```

For an invented example, speed_score=60 and judge_score=80 produce a track total of 67.

A geometric mean multiplies the track scores and takes the appropriate root. For three hypothetical totals of 80, 50, and 50, it is approximately 58.48. Three scores of 60 produce 60. This explains why balanced performance can beat one standout result alongside weaker results. The exact treatment of additional tracks and eligibility must follow the final rules.

## 5. Correctness and eligibility gates

Published gates include exact output hashes, a timeout, sandbox compliance, and an overall-title speed floor within 10 times the track's fastest correct submission. Project code must originate inside the competition window; advance research/design/environment setup is allowed. [Organizer rules explanation][article]

### Failure consequences

- A correctness failure on any of the five scored runs fails the track; passing four runs is insufficient.
- Exceeding the track timeout, a scored-run memory failure, or a nonzero exit fails the run rather than merely reducing its speed score.
- The speed floor compares against the fastest correct entry, whereas the hard timeout compares against the reference runtime. They are different conditions.
- Attempts to modify protected datasets, contact external services, or ship precomputed answers can cause event-wide disqualification.

Source: [Official gates and execution contract][official]. The website's general gate introduction and its overall-title-specific speed-floor wording are not completely consistent; see section 16 before inferring eligibility consequences.

**Engineering guidance:** Correct output is a binary requirement, not an accuracy percentage. A file can contain the same mathematical values and still differ at the byte level because of ordering, whitespace, line endings, decimal representation, or a final newline.

Separate three checks in your own reasoning:

1. **Computational correctness:** Did the algorithm calculate the intended result?
2. **Serialization correctness:** Did it encode that result exactly as required?
3. **Operational correctness:** Did the packaged program complete successfully within its limits?

A correct answer on an ordinary input does not establish correctness on boundary cases. Likewise, success outside the container does not establish success inside it.

## 6. Execution environment

| Constraint | Published value |
| --- | --- |
| Host | Hetzner EX44, Helsinki; Intel i5-13500 |
| Submission CPU | Six P-cores, twelve threads; turbo disabled; 2.5 GHz base target |
| Runtime | Debian 13; Docker; cgroups v2 |
| Container memory | 8 GB; no swap |
| Scratch | `/tmp`, 1 GB tmpfs |
| Filesystems | `/data` read-only; root read-only; `/out` writable |
| Networking | Disabled for build/run |
| Process/file limits | 512 PIDs; 8192 open files |
| Runs | Five; trim fastest/slowest; average three |
| Stability | >5% spread rerun; >2% reference drift invalidates batch |

Source: [Official harness and environment][official].

### Program execution contract

The published contract requires reading the specified files from `/data`, writing exactly the required output file under `/out`, and exiting with code `0`. Exact filenames are track-specific. The build must succeed without fetching packages or other assets over the network. [Official Docker contract][official]

Published scoring runs are serialized and pre-warm input into the host page cache. Runtime is measured externally from process execution to exit; peak memory comes from cgroup `memory.peak`. The tenfold-input scaling run retains the same memory cap. [Official measurement protocol][official]

**Engineering guidance:** Your own computer is a development environment. Different caches, processors, background load, and container runtimes can change which optimizations appear useful. Compare candidates under the same local conditions and treat their relative improvements as evidence, not a promise of official results.

An offline build needs an available toolchain, source, and allowed dependencies. A build that quietly downloads packages or missing assets will depend on a service that may not exist in the evaluation environment. Use the actual harness to verify the complete build, not merely a previously cached successful image.

Temporary filesystem storage can also consume memory. Budget parser buffers, graph/index structures, worker-local state, output buffers, runtime overhead, and scratch together rather than assuming each has a separate allocation allowance.

The source overview describes base-image selection and build time as unscored; exact image provisioning still needs verification against the harness. [Official Docker contract][official]

## 7. Datasets and leaderboard

Published behavior: synthetic generators; 10% samples with hashes; unseen-seed holdouts; sample-board attempts once per team per 15 minutes. Only final holdout evaluation determines final measured results. Scaling-only OOM takes the worst X treatment; scored-run OOM fails the track. [Official FAQ and leaderboard][official]

**Engineering guidance:** There are three distinct outputs to understand:

- **Program output:** The required result file, such as aggregates or query answers.
- **Benchmark measurements:** Observed runtime and resource use.
- **Leaderboard entry:** The organizer's presentation of benchmark-derived results and ranking.

Your program is not expected to invent its own official score. A local score estimate is useful for deciding what to improve, while official evaluation determines the competition result.

Use varied locally generated inputs to test whether an improvement generalizes. Knowing a data distribution can justify a suitable algorithm; recognizing a specific file and returning saved answers does not demonstrate solving the task.

Rank and score are different concepts. A rank can fall because another team improves even when your program has not changed. A sample ranking also does not prove how the same program will behave on different inputs.

## 8. Submission contents

Required: public GitHub repository, OSI-approved license, per-track source/build scripts, offline Dockerfile, `README.md`, `PERF.md`, and `.speed-demon.toml`. A demonstration video under three minutes is optional and unscored. [Unstop deliverables][unstop]

**Engineering guidance:** A suitable proposed structure is:

```text
repository/
  LICENSE
  README.md
  track-a/
    Dockerfile
    README.md
    PERF.md
    .speed-demon.toml
    src/
    tests/
  track-b/
    ...
```

This tree is a design suggestion, not a substitute for the official packaging layout. Confirm build context, metadata placement, exact filenames, and supported directory conventions before submission. The `tests/` directory is a recommendation, not a claimed mandatory deliverable.

The metadata needs to communicate the track, team, language, and dependency information. Do not guess TOML key names; use the official schema. [Official submission description][official]

## 9. Participation and code rules

Published participation rules: worldwide eligibility; solo or 1-4 people; any offline-buildable Linux x86-64 language; AI permitted. Precomputed answers and benchmark-bypassing shortcuts are prohibited. Task-solving library restrictions apply; repositories must be public and openly licensed at submission freeze. [Organizer rules][article]

**Engineering guidance:** Writing a complete solution in advance and delaying its commit does not make it newly written. Preparation should produce understanding and a ready environment, with the competition implementation created in the authorized coding window.

Examples of useful preparation include comparing algorithm families on paper, learning profiler concepts, installing tools, reading documentation, and planning responsibilities. Avoid turning the planning document into a prewritten implementation.

AI assistance can help examine an algorithm, review edge cases, interpret a profile, or propose experiments. Maintain human understanding of correctness and tradeoffs: generated code still needs measurement and review.

The overview restricts ready-made search engines in B, general-purpose compression codecs in E, and analytics dataframe libraries in A and C. Exact banned packages and exceptions belong to the track specifications. The published scoring weights, caps, and gates are intended to remain fixed during the competition. [Official library and scoring rules][official]

## 10. Awards

| Award | USD |
| --- | ---: |
| Overall champion | 800 |
| Overall runner-up | 400 |
| Overall third | 200 |
| Highest K, any track | 200 |
| Lean award | 100 |
| Write-up: three winners | 100 each |

Source: [Unstop prize descriptions][unstop].

The highest-K award is available to a specialist without three completed tracks. The lean award concerns the best K achieved with the smallest normalized source. The write-up award requires publishing an account of the optimization work and tagging Hackathon Raptors; assessment emphasizes technical insight rather than audience size. [Official award descriptions][official]

**Engineering guidance:** Choose an objective deliberately. A specialist can focus effort on one excellent workload; an overall contender must spread effort across enough qualifying workloads. Do not assume unnamed per-track cash allocations or prize stacking rules from promotional wording.

## 11. Suggested architecture

**Engineering guidance:** Keep responsibilities visible enough to measure and reason about them.

```text
Input bytes
    |
    v
Parser / decoder
    |
    v
Compact internal representation
    |
    v
Task algorithm
    |
    v
Deterministic result serialization
    |
    v
Required output file
```

A development-only measurement path can collect profiles and experiment notes without polluting the required output.

Suggested component responsibilities:

| Component | Responsibility | Design question |
| --- | --- | --- |
| Input | Obtain bytes efficiently | Buffered reads, mapping, or streaming? |
| Parser | Apply the exact grammar | Which transformations and validations are required? |
| Storage | Represent useful information | What is the smallest practical representation? |
| Algorithm | Perform the workload | Where are repeated work and unnecessary passes? |
| Parallel execution | Divide independent work | How will workers merge results deterministically? |
| Output | Serialize the result | How are ordering and number formats controlled? |
| Packaging | Reproduce execution | Can a clean environment build and run it? |

Choose boundaries that help correctness and profiling. An abstraction that adds substantial work in a hot loop may need adjustment; that decision should follow evidence.

## 12. Development and measurement approach

**Engineering guidance:** This is an implementation method, not an event schedule.

### Establish semantics

Translate the specification into explicit input/output assumptions. List legal values, exceptional cases, numerical bounds, and formatting requirements. Keep unanswered questions visible instead of embedding assumptions in code.

### Establish a correct baseline

Prefer a simple implementation whose behavior can be inspected. Validate both meaningful values and serialized output. Retain this baseline as a comparison point for more complicated candidates.

### Profile the actual bottleneck

Measure the proportion of work spent reading, parsing, allocating, hashing, sorting, computing, synchronizing, and writing. Choose tools suitable for the language and platform. A flame graph identifies where execution time accumulates; allocation profiling identifies memory churn.

### Change one important variable

A useful experiment changes a data structure, algorithm, parsing path, or concurrency policy with a clear hypothesis. Record why the change should help, the measurement conditions, and what actually happened.

For an original hypothetical example:

| Experiment | Runtime | Peak memory | Decision |
| --- | ---: | ---: | --- |
| Simple baseline | 12.0 s | 900 MB | Keep as reference |
| Reuse parsing buffers | 8.5 s | 450 MB | Keep |
| Add eight workers | 9.2 s | 1100 MB | Investigate/revert |
| Compact integer keys | 6.4 s | 320 MB | Keep |

The slower parallel version may be losing to synchronization, allocation, memory bandwidth, or uneven work distribution. More workers are a hypothesis, not an automatic improvement.

### Recheck semantics after optimization

Test cases that distinguish correct behavior from plausible behavior. For example, a CSV parser needs cases with commas and line breaks inside quoted fields, while a shortest-path implementation needs unreachable destinations and overflow-sensitive distances. These are stronger checks than tests that merely mirror implementation steps.

### Compare under consistent conditions

Use the same inputs, machine settings, build mode, and measurement method. Record compiler/runtime versions and relevant flags. Repeat sufficiently to identify noise. Compare complete task execution rather than only an attractive microbenchmark.

### Validate integration

Inspect the actual clean build, container startup, file permissions, output location, exit status, and resource limits. An algorithmic improvement is useful only if the packaged submission still works.

## 13. Documentation guidance

**Engineering guidance:** Documentation should explain reproducibility and decisions without claiming unmeasured achievements.

### README content

- What the implementation computes.
- The selected algorithm and data representation.
- Build and execution instructions that match the actual packaging.
- Dependencies, versions, and why they are needed.
- Numerical and parsing choices that affect correctness.
- Local verification procedure.
- Known limitations and worthwhile future experiments.

### PERF content

For every significant experiment, capture:

| Field | What to record |
| --- | --- |
| Hypothesis | Expected bottleneck and proposed improvement |
| Revision | The code version being measured |
| Conditions | Input identity, environment, build configuration |
| Before/after | Runtime and relevant resource measurements |
| Correctness | Verification result |
| Explanation | Why the result supports or rejects the hypothesis |
| Decision | Keep, revert, or investigate |

Do not invent an optimization history after the fact. An unsuccessful experiment can show good judgment when its measurement and explanation are honest.

### Dependency record

Maintain names, versions, source origins, licenses, how packages are made available offline, and whether the relevant track permits them. Distinguish development tools from runtime dependencies, while following the organizer's actual accounting definitions.

## 14. Track selection and teamwork

**Engineering guidance:** Choose based on existing strengths and verification effort.

| Interest | Track to investigate | Main engineering concern |
| --- | --- | --- |
| Parsing and aggregation | A | Allocation and exact statistics |
| Search and databases | B | Construction/query tradeoffs |
| Data pipelines and formats | C | CSV semantics and joining |
| Graph algorithms | D | Representation and repeated queries |
| Binary formats and coding | E | Compression/decoding tradeoffs |

A small team could assign ownership of implementation, correctness review, and measurement/packaging. People can cover multiple responsibilities, but every optimization needs someone who can explain its correctness and observed effect.

For multiple tracks, keep workload-specific code understandable. Share utilities only when sharing reduces complexity without obscuring dependencies, source accounting, packaging, or behavior.

## 15. Failure modes and readiness checks

**Engineering guidance:** The following checklist translates the documented constraints into practical review questions.

| Failure pattern | What to verify |
| --- | --- |
| Correct values, wrong bytes | Ordering, whitespace, newlines, number formatting |
| Works only on the sample | Varied generated inputs and edge cases |
| Sporadic incorrect output | Shared state, data races, nondeterministic reduction |
| Fast algorithm, slow program | Parsing, allocation, I/O, output, startup costs |
| Works locally, fails evaluation | Architecture, build inputs, paths, permissions |
| Offline build failure | Package downloads, missing dependencies, cache assumptions |
| Memory failure | Peak live state, scratch storage, per-worker duplication |
| Poor scaling | Repeated scans, quadratic behavior, whole-input retention |
| Oversubscribed workers | Available threads, contention, memory bandwidth |
| Unsupported library | Track-specific restriction list |
| Incomplete submission | Required files, license, metadata, recorded revision |

Readiness checklist:

- [ ] Exact task semantics are understood.
- [ ] The official schema, filenames, and metadata conventions are followed.
- [ ] The final implementation was created within the permitted coding window.
- [ ] Results match expected hashes and targeted correctness checks.
- [ ] Execution is deterministic across repeated runs.
- [ ] Clean builds succeed using the official offline process.
- [ ] The container follows input/output and filesystem restrictions.
- [ ] Memory, CPU, timeout, and process constraints are respected.
- [ ] Larger inputs have been considered.
- [ ] Dependencies are permitted and documented.
- [ ] Public source, license, build inputs, and required documentation are complete.
- [ ] PERF measurements refer to real experiments and identifiable revisions.
- [ ] The submitted revision corresponds to the tested implementation.

## 16. Unresolved details and source differences

**Engineering guidance:** Do not silently convert promotional examples into formal parsing rules or submission schemas. Resolve these points using final specifications or an organizer clarification:

- **Output contracts:** Exact filenames, schemas, ordering, rounding, and error behavior.
- **Track A:** Percentile definition, error-rate grouping, timestamp rules, and overflow bounds.
- **Track B:** Tokenization, Boolean grammar, precedence, and phrase semantics. The website describes queries without parentheses but shows a sample containing `(nothing)`; it does not establish whether that sample is a literal token or syntax.
- **Track C:** BOM handling, invalid records, duplicate lookup keys, and numerical precision.
- **Track D:** Graph guarantees, unreachable results, accepted preprocessing, and path-distance types.
- **Track E:** Codec interface, segment boundaries, compressed format, exact time aggregation, and restrictions. The website labels the corpus 100 MB while its segment byte counts total 104,857,600 bytes, or 100 MiB; use exact dataset sizes from the specification.
- **Accounting:** Dependency classification, source normalization edge cases, and the worst-X fallback value.
- **Overall ranking:** Which tracks are counted when entering more than the minimum and precise application of the speed floor. The gate introduction says a failed gate zeros a track, while the speed-floor paragraph specifically calls it an overall-title requirement; confirm how this affects specialist entries and track totals.
- **Awards:** Standalone per-track payouts, award stacking, and exact lean-award ordering are not fully specified by the overview descriptions.
- **Currencies:** Unstop's prize cards contain numerical amounts that differ from the USD amounts stated in its description. This guide uses the explicit USD prize list rather than inferring an exchange rate.
- **Operations:** Base-image availability for offline builds, submission-branch details, and metadata schema.

The website gives tie-break order as raw K, runtime, then earliest submission commit; the meaning of raw K for an aggregated overall tie needs confirmation. It also provides a 48-hour measurement rerun request window. These are result-handling rules, not an event calendar. [Official FAQ and rules][official]

## 17. Glossary

| Term | Meaning |
| --- | --- |
| Reference implementation | A program that establishes expected behavior and a comparison baseline. |
| Harness | Software that builds, executes, verifies, and measures submissions. |
| Holdout | Input reserved for evaluation rather than ordinary development. |
| SHA-256 | A cryptographic file digest used to compare exact output bytes. |
| Determinism | Producing the same result under the same defined conditions. |
| Wall time | Elapsed time observed outside the program. |
| Peak memory | The largest measured memory footprint during execution. |
| Scaling | How resource costs change as workload size increases. |
| Inverted index | A mapping from terms to documents, optionally with positions. |
| Posting list | The document identifiers or positions associated with one term. |
| Join | Matching and combining records using a key. |
| Percentile | A threshold describing a position within a value distribution. |
| Lossless | Able to reconstruct the original data exactly. |
| Cache locality | Accessing data in a way that makes efficient use of CPU caches. |
| Allocation | Requesting memory for objects or buffers. |
| SIMD | Executing an operation over several data elements using vector instructions. |
| OOM | Out of memory; can cause process/container termination. |
| tmpfs | A memory-backed filesystem. |
| Geometric mean | The nth root of the product of n nonnegative values. |
| OSI-approved license | An open-source license approved by the Open Source Initiative. |

## 18. Sources

Use these for authoritative details and subsequent clarifications. This guide deliberately excludes the event calendar.

- [Official Speed Demon site][official]: detailed tracks, scoring, execution, rules, submissions, and FAQ.
- [Unstop event listing][listing]: the original event page.
- [Readable Unstop event endpoint][unstop]: the event text accessible during preparation of this guide.
- [Hackathon Raptors event overview][overview]: organizer summary.
- [Organizer's technical article][article]: additional explanations of the workloads and evaluation.
- [Official community Discord](https://discord.gg/xfYPDZYqeh): organizer announcements and participant support.

[official]: https://speeddemon.dev/
[listing]: https://unstop.com/hackathons/speed-demon-72-hour-hackathon-hackathon-raptors-1770904
[unstop]: https://api.unstop.com/hackathons/speed-demon-72-hour-hackathon-hackathon-raptors-1770904
[overview]: https://www.raptors.dev/project/speed-demon-2026-every-millisecond-is-a-soul
[article]: https://dev.to/raptorsdev/speed-demon-2026-every-millisecond-is-a-soul-2709
