# Draft: compact exact aggregation and an unpromoted endpoint-span experiment

**Local, unpublished draft — 25 October 2026.** This is preparation for a possible later write-up, not a publication, submission, official result or eligibility claim. Author/team metadata, organizer format and licensing are unresolved. Early development was authorized locally by the user; no organizer exception or eligibility decision has been verified. Preserve that provenance in any future adaptation.

## Scope and local semantics

The default Track A implementation is [the scalar C++20 source](../track-a/src/main.cpp), with standard-library production dependencies. It implements the explicitly provisional [local-v1 contract](../track-a/LOCAL_CONTRACT.md): exact uint32 microsecond latencies, nearest-rank p50/p95/p99, full endpoint-byte identity and endpoint/UTC-hour request/error counts. Errors locally mean statuses 500–599, with exact unreduced error/request fractions. Official timestamp, percentile, grouping, output and entrypoint rules remain dependencies of the [reconciliation table](../PLAN.md#official-spec-reconciliation).

The preserved [endpoint-span candidate](../candidates/endpoint-spans/track-a/src/main.cpp) is a separate source tree. It is locally correctness-verified and performance-unproven. It is not the default.

## Storage and determinism are implementation choices

The parser reads bounded buffers (1 MiB by default). Aggregation owns one canonical string key per distinct endpoint in an unordered map; endpoint state holds a reference to that key, while the parser also has a temporary owning token. No borrowed pointer into an input buffer becomes an endpoint identity. Full string equality determines identity even when hashes collide; a hash is not a replacement identifier.

Each endpoint retains a `std::vector<std::uint32_t>` of exact latencies. A uint32 endpoint ID and packed calendar-hour key select uint64 request/error counters. Counts and error numerators are accumulated exactly. Full latency sorting supplies local nearest-rank percentiles; percentiles or rates are not averaged across groups. Output order is explicitly sorted by unsigned endpoint bytes and then hour, so hash-table iteration order does not define serialization.

The raw latency payload is **4N bytes** on the verified platform: 12.4 MB for 3.1 million records and 124 MB for 31 million. Explicit capacity doubling can temporarily overlap old/new allocations; an approximately **12N-byte latency allocation envelope** is a conservative growth model, not an observed RSS value. Strings, maps, vectors, rehashing, I/O buffers, runtime, kernel and charged cache memory add to it.

These are directly inspectable representation/design properties. No comparison against an alternative record-object implementation was measured, so this draft does not claim a measured memory reduction or speedup from “compact” storage. Forced hash collisions and uint64 counter saturation were not executed; full-key equality and overflow guards remain reviewed invariants.

## Independent correctness checks before performance conclusions

The recorded M3 preflights passed **326 optimized and 326 ASan+UBSan checks per revision, zero skips**. The original 233 cases remain intact, with 93 focused span cases added. The [test runner](../track-a/tests/test.mjs) materializes complete lines and uses independent full-key Map aggregates and sorted numeric lists as its oracle. It checks three hand-derived fixtures, complete output bytes, rank boundaries, dates, raw bytes, deterministic order, malformed inputs and filesystem/CLI behavior. It does not reuse the production parser or packed counters.

Additional coverage includes deterministic seeds, increasing endpoint/hour cardinality, skew, equal values, full-range uint32 values, sorted/reversed values, long shared prefixes, exact buffer-end alignments, all high endpoint bytes, forbidden controls, split CRLF and final records without newline. Sanitizer diagnostics are failures even in expected-invalid cases. A status-0 subprocess with an error is still a failure. No guard was weakened to obtain a passing result.

Preflight separately records native execution, sanitizer results, source identities and a clean pinned offline container build/smoke check. The container smoke is not a full native suite inside that image or an official harness run. Compiler/source/binary/checkpoint hashes keep those claims distinct. M4 reused unchanged M3 verification; the present documentation handoff also reuses it without rerunning code.

## Why investigate ingestion?

The [M2 report](../artifacts/experiments/track-a-m2/REPORT.md) contains separate instrumentation/gprof executions, never mixed into benchmark timings. Coarse phase timers attributed about **77% normal / 87% tenfold** phase wall time to ingestion (parsing, endpoint lookup, aggregation). Ordering/sorting was secondary. Sampling, instrumentation and compiler inlining limit detailed symbol attribution; the profile does not identify one instruction or establish an optimization benefit.

M2 also found substantial timing noise after staging on WSL ext4 and pinning a virtual CPU. Storage and CPU placement changes are measurement setup changes, not solver optimizations. They cannot be counted as gains over earlier Windows-backed 9p observations.

## One isolated endpoint-span candidate

The [M3 diff](../artifacts/experiments/track-a-m3/candidate.diff) adds a buffer-consumption method. In endpoint field state, with no pending CR, it scans contiguous valid payload bytes and calls owning-string `append` once for each span. All separators, controls, pending CR/CRLF, timestamps, numbers, EOF and error transitions still use the existing scalar state machine. It neither changes the input-buffer bound nor retains a borrowed span after the call. Aggregation, percentiles, full identity, output and CLI are unchanged.

Both revisions used the same GCC 13.3.0 build flags, ext4 inputs/outputs, virtual CPU 2 and warm-input hash-read policy. After warming both binaries, one fixed six-pair batch per workload balanced baseline-first and candidate-first order. All outputs matched independent expected hashes; all raw results and per-revision source/binary/verification identities were kept. There was no favorable-result rerun.

| M3 observation | Normal | Tenfold |
| --- | ---: | ---: |
| Candidate-faster pairs | 4 of 6 | 5 of 6 |
| Geometric candidate/baseline wall ratio | 0.956104 | 0.935521 |
| Paired-ratio range | 0.807894–1.145363 | 0.892276–1.016961 |
| Paired-ratio spread/mean | 34.99% | 13.32% |
| Peak process RSS baseline/candidate (KiB) | 25,512 / 25,508 | 196,968 / 196,968 |

Those ratios are **descriptive observations**, not proven speedups. Mixed pairs and variation failed the predeclared repeatability gate on both workloads. No material process-RSS increase was observed on those inputs, but that does not establish general memory equivalence. The complete [M3 report](../artifacts/experiments/track-a-m3/REPORT.md) retains the rule, commands, identities and limitations.

## An identical-binary control did not resolve the timing cause

Before new executions, M4 analyzed M3 wall/user/system times and order. CPU-time differences accompanied wall-time differences, and mean wall-minus-CPU gaps were small; blocked I/O alone was not established as the explanation.

The [M4 control](../artifacts/experiments/track-a-m4/REPORT.md) then executed the **exact same verified baseline file under both A/B labels**, with six balanced adjacent pairs per workload. It preserved ext4 placement, CPU2, cache policy, warm-ups and hash checks, and added faults, context switches and Linux load/pressure snapshots.

| M4 identical-binary observation | Normal | Tenfold |
| --- | ---: | ---: |
| Geometric wall B/A ratio | 1.050550 | 0.981710 |
| Pair wall-ratio range | 0.916968–1.292714 | 0.882264–1.166795 |
| Maximum absolute pair deviation from 1 | 29.27% | 16.68% |
| M3 observed fractional reduction direction | 4.39% | 6.45% |

Identical-binary variation was comparable to/exceeded the earlier observed advantage. That is a reason to keep performance unresolved, not proof that the candidate has no possible benefit. It does not retrospectively identify M3's cause or justify “correcting” its ratios. WSL frequency/governor paths were unavailable; Windows power/thermal/process telemetry was not sampled. Linux pressure snapshots are system-wide, not per-process attribution. No system settings changed, no unrelated process was killed, and no extra control batches were run.

## Bounded memory evidence, with separate accounting scopes

M4's independent Python reference parsed full lines, sorted materialized endpoint latencies and accumulated full endpoint/hour counters. Three hand-derived reference fixtures preceded the fixed stress assets. The three increasing cases grew endpoint/hour cardinality and shared-prefix name length. Both implementations passed each native and fresh-container run, with exact expected-output hashes and no cgroup OOM/limit event.

| Case | Endpoints / endpoint-hours | Records / name bytes | Native RSS B/C (KiB) | Separate cgroup peak B/C (bytes) | Tested cap / timeout |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 1,024 / 4,096 | 16,384 / 64 | 4,992 / 4,992 | 8,138,752 / 5,054,464 | 128 MiB / 60 s |
| 2 | 4,096 / 32,768 | 131,072 / 256 | 8,448 / 8,448 | 29,175,808 / 29,347,840 | 256 MiB / 120 s |
| 3 | 8,192 / 98,304 | 393,216 / 1,024 | 21,820 / 21,816 | 257,089,536 / 257,105,920 | 1 GiB / 180 s |

Native caps were virtual address-space limits, not RSS caps. Container caps were fresh cgroup limits, with no additional swap. Container peaks include shell/runtime/kernel and charged cache pages; prewarmed shared pages can be charged outside the cgroup. In particular, the smaller case-1 candidate peak does not prove a memory improvement when native RSS is identical. These are successful tested envelopes, not minimum requirements, maximum cardinality, cold-cache peaks or official 10x headroom. Stress wall times checked timeout compliance and were not a new performance comparison campaign.

## Why the baseline stays default

Local correctness is supported for both preserved implementations, and the candidate merits preservation as an experiment. A repeatable performance improvement is **not established**. Neither changing storage/compiler conditions nor retaining only favorable runs would supply that evidence. The default therefore remains the scalar source; the candidate has its own verified checkpoint and explicit build directory.

The baseline comparison checkpoint is [verified-ac513ecb51d4ee4c](../baselines/verified-ac513ecb51d4ee4c/manifest.json); the candidate checkpoint is [verified-9c41e2794115eda7](../candidates/endpoint-spans/baselines/verified-9c41e2794115eda7/manifest.json). Earlier checkpoints and all raw evidence remain local. No Git commit, official source identifier, score or prize claim is fabricated.

## Before any eventual publication or delivery

Reconcile official semantics, reference outputs, harness/build/resource rules and metadata from authoritative supplied assets. Resolve owner licensing/rights, repository setup, provenance/eligibility and any write-up format requirements. See [the delivery inventory](DELIVERY_INVENTORY.md). Review all local-only links and evidence excerpts before packaging. This draft is not a license grant, finalized author metadata or an instruction to publish. No new experiment follows automatically from its unresolved conclusions.
