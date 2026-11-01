# Official Track A buffered line-span candidate

Experimental C++20/standard-library-only fork of the verified scalar official
baseline. Only Parser and ingest change: complete LF-terminated records are views
into the existing bounded read buffer; a split line uses at most 176 carry bytes.
Timestamp/method/numeric fields are parsed from spans, endpoint grammar is checked
and each endpoint is assigned once into a reusable owning string before unchanged
owning-key aggregation. No view is retained after the record call. Aggregation,
nearest-rank quantiles, ordering, integer ppm, serialization, CLI and file protections
are unchanged. Malformed input fails without accepting CRLF, missing final LF,
controls, out-of-range numbers or invalid fields. Overlong invalid lines fail earlier.

Build this folder with its unchanged pinned GCC15 Dockerfile. Official entrypoint
needs no arguments: TRACK=a, readonly /data/requests.log, writable /out/summary.txt.
Native options remain --data DIR --out DIR --buffer-size 1..16777216.
Runtime and offline dependencies remain the approved GCC image's standard runtime.
Metadata uses Appvengers with zero direct third-party dependencies. MIT applies.

Fresh experiment results, exact build/test/source/binary identities, paired timings,
RSS/cgroup metrics and recommendation are preserved outside the build context in
artifacts/experiments/official-a-perf-2026-11-01/. This file makes no inherited
correctness or speedup claim for changed code. Baseline, submission and speed-demon
worktree are preserved; no official board run, promotion or publication is implied.
