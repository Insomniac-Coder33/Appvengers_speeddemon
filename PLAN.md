# Track A official integration plan

## Current result — 31 October 2026

The released specification is integrated in a separate [delivery candidate](candidates/official-track-a/track-a/README.md), based on the previously verified GCC15 package and scalar C++20 solver. **All statistics are per (hour, endpoint)**, output is exact summary.txt text sorted hour then endpoint, error_ppm is integer floor, and the official no-argument invocation works. Full [integration report](artifacts/official-integration/REPORT.md) and [fresh verification](artifacts/official-integration/verification.json) record the result.

Fresh gates passed: **115 optimized + 115 ASan/UBSan checks**, zero skips, 45 official-reference differentials per suite, 36 sanitized uint64 ppm cases, upstream Track A tests, clean offline build (10.810 s), image size/runtime checks, and an unprivileged readonly constrained full-input run. Source and binary identities are new; old local-v1 evidence is not reused.

Published full requests.log SHA-256: `7ec80ba45bceef51ac7f79d3a14521fc6187b2dcb87b5e5542d08063fe5d962a`. Produced summary.txt SHA-256: `495ca09682b9673ef836a506496177680bb4a3af54255174befddb1f83481cd3` (126,908 rows / 10,113,024 bytes). Input and output match the freshly retrieved board checksum manifest and released spec.

## Official-spec reconciliation

The single active table below resolves historical local-v1 assumptions from the [released spec](https://github.com/hackathon-raptors/speed-demon-2026/blob/ad1f06063a76bf94066f169e133ec0c2e1485b65/specs/a-ingest.md), reference, conventions and actual starter template. Exact upstream revisions and downloads are archived. This candidate is the official-format local delivery baseline; the root remains the preserved local-v1 default.

| Assumption | Released contract and integration | Evidence / limit |
| --- | --- | --- |
| Timestamp | Same fixed-width six-fraction UTC form; Gregorian validation retained. No offsets/leap seconds. Fixed official 72-hour span is supported, without relying on it for storage or disorder eviction. | Public boundary/rollover fixtures; all 72 hours; official tiny/sample/full. Dates outside the span remain a defensive accepted extension, not an official guarantee. |
| Grouping | All counts, latency populations and error statistics use **(hour, exact endpoint)**. Method does not enter the key. Owning endpoint strings and uint32 latency values retained. | Cross-hour counterexample, public goldens, histogram oracle and reference comparisons. No per-endpoint percentile averaging. |
| Percentiles | Nearest rank p50/p95/p99 retained, now applied to each group's own sorted values. Duplicates remain separate. | n=1/2/3/19/20/21/99/100/101/199/200/201/1001, equal/sorted/reversed/extreme values. |
| Errors and rates | Status 500..599 inclusive; integer floor parts per million replaces local-v1 numerator/denominator JSON. Status grammar narrowed from uint16 to three digits 100..599. | All statuses 100..599, 499/500/599 boundaries, one-third and 2/7 rates; sanitized production ppm arithmetic checked against Python big integers through uint64 maximum. |
| Endpoint identity | Raw ASCII endpoint text replaces hex JSON. Case, slashes, placeholders, punctuation and proper prefixes are preserved. Official grammar permits 1..125 bytes starting with slash. | Public order family and 125-byte endpoint; long shared prefixes; no catalogue hardcoding/normalization. High bytes and controls now rejected as outside the released grammar. |
| Ordering and output | One summary.txt line per populated group; hour ascending then unsigned-byte endpoint order. Eight single-space fields, six decimal integers, LF after each row, no header/BOM/trailing space. Empty input yields zero bytes. | Full byte comparison to independent and public goldens; published tiny/sample/full hashes. Old endpoint-first JSON serializer removed only in this candidate. |
| Input grammar | One ASCII space, valid listed methods, LF including final record, uint32 decimal latency without leading zeros. No header/blank lines/CRLF. | All seven methods, narrow buffers, overflow and malformed defenses. CRLF, repeated spaces, arbitrary method/high-byte endpoint and missing final LF are no longer accepted extensions. Official input is guaranteed well formed; rejection behavior is local defensive policy. |
| Invocation and filesystem | No arguments reads /data/requests.log and writes /out/summary.txt with TRACK=a supplied. Optional --data DIR / --out DIR match reference convenience options; bounded --buffer-size remains for tests. --contract local-v1 removed from this candidate. | Actual fresh no-argument, unprivileged constrained full run. Input/output alias and regular-file protections retained; output parent creation matches reference. Existing output is not transactionally replaced after write errors. |
| Buffering/memory/disorder | Scalar byte parser retained, bounded 1..16777216 read buffer. Per-group uint32 latency vectors and uint64 counters; storage proportional to input/groups. No shard/disorder assumptions, fixed catalogue, precomputed results or new optimization; endpoint identifiers retain the uint32 representational bound. | Buffer sizes 1..32 and delimiter/125-byte/power-of-two boundaries through 16 MiB; shuffled records and independent seeds; full dataset under 8 GiB/no-extra-swap limit. No universal memory bound or performance claim. |
| Packaging/runtime | Same exact allowlisted GCC15 index pin and standard C++20 flags. Independent track context; runtime libraries retained in final image. | Current official Dockerfile checker, fresh no-cache offline build, size and ldd checks, readonly/capability-dropped uid65534 containers and strict empty diff. Local sandbox compatibility is not an official scored board/harness run. |
| Metadata | Actual starter .speed-demon.toml four-key template, track=a, language=C++20, dependency_count=0. | Team is explicitly TODO_OWNER_TEAM_NAME; original template archived. No owner name, license selection, Git commit or board run fabricated. Standard library only; final official dependency/source accounting still occurs at delivery. |

## Preserved implementations and evidence

- Root scalar source, root build/tests/toolchain lock and local-v1 contract remain untouched.
- [Earlier GCC15 package](packaging/gcc15/track-a/README.md) and its [fresh packaging report](artifacts/packaging-gcc15/REPORT.md) remain unchanged.
- [Endpoint-span experiment](candidates/endpoint-spans/track-a/src/main.cpp) stays separate, correctness-verified for local-v1 and performance-unproven. It is not carried into the official-format candidate.
- Checkpoints verified-d9c5e3828341492a, verified-7dee32a851a647e0, verified-ac513ecb51d4ee4c and candidate verified-9c41e2794115eda7 are preserved. M2/M3/M4 records and raw measurements stay historical. No M3 reruns or changed promotion rule.
- The immediately prior active PLAN/README are archived in artifacts/official-integration/previous-active-docs/. Older documentation-only/spec-pending sections remain historical, not current availability claims.

## Remaining owner and delivery requirements

1. Replace the explicit `TODO_OWNER_TEAM_NAME` in the actual four-key metadata template with an approved team name. C++20 and zero direct third-party runtime dependencies are recorded; no owner identity is guessed.
2. Owner selects license/rights/notices and authorizes eventual repository setup. No Git repository is initialized and no license is selected here. Resolve the documented early-development eligibility issue with organizers while preserving all provenance.
3. Review the small delivery context only: Dockerfile, build.sh, src/main.cpp, .dockerignore, README.md, PERF.md and .speed-demon.toml. Keep downloaded datasets, test machinery, generated binaries, raw evidence and checkpoint/candidate archive bulk outside any eventual submission context.
4. Any genuine board run, board app installation, push/publication or form submission requires a separate instruction. Record real board IDs in PERF only if those actions later occur. Local full-hash correctness is not a board score or hidden-holdout guarantee.
5. No further track, speculative optimization, benchmark campaign or automatic experiment is authorized. Stop after this integration and its final preservation audit.

Final [preservation audit](artifacts/official-integration/preservation-after.json): 588 protected existing files unchanged; previous active documents archived byte-for-byte; verified candidate/checkpoint identities match. Integration milestone complete; stop here.
