# Track A local-v1 contract — provisional

This deliberately defined local prototype contract is not the organizer's specification. Passing its tests or hashes does not establish official correctness, packaging compliance, or eligibility.

## Invocation

`track-a --contract local-v1 --input PATH --output PATH [--buffer-size N]`

The contract flag is mandatory. Buffer size defaults to 1048576 bytes and must be between 1 and 16777216. `--help` describes usage. Success exits 0, writes the result only to the requested file, and leaves stdout empty. Errors produce stderr diagnostics and a nonzero exit. Input must be an existing regular file (a symlink to one is allowed). Output must be a regular file or a new file, never a symlink or special file. Input/output must not identify the same file, including existing aliases. Duplicate options are rejected.

Input is completely parsed and result ordering prepared before opening output. Malformed input preserves existing output. An output failure after truncation can lose an existing result; partial output is removed best-effort. Atomic replacement is not promised. Do not use important pre-existing files as output, and do not change filesystem aliases while a run is active.

## Input

One record contains five nonempty fields: timestamp, method, endpoint, status, latency. One or more ASCII spaces separate fields; leading/trailing spaces, tabs and control bytes in fields are rejected. Method and endpoint accept bytes above ASCII space except DEL; bytes are not decoded or normalized.

LF and CRLF terminate records. A final record without a line terminator is accepted. Bare CR, blank records, extra/missing fields and malformed numbers are errors. Empty input is valid.

- Timestamp: exactly `YYYY-MM-DDTHH:mm:ss.ffffffZ` (27 bytes). Gregorian date, year 0001–9999, hours 00–23, minutes/seconds 00–59, six fractional digits.
- Offsets, leap seconds and other fractional widths are unsupported locally, not asserted officially invalid.
- Method: validated but not used for grouping.
- Endpoint: exact byte identity; no closed vocabulary or path normalization.
- Status: ASCII decimal uint16; leading zeroes allowed, signs forbidden.
- Latency: ASCII decimal uint32 microseconds; leading zeroes allowed, signs forbidden.

There is no assumption of global timestamp monotonicity.

## Aggregation

Store every latency per endpoint. Request count equals the number of latencies. Sort and select the 1-based nearest rank `ceil(p*N/100)` for p=50,95,99 without intermediate overflow. Absent endpoints create no group.

Maintain uint64 request/error counts for each endpoint and UTC calendar hour. Error means status 500 through 599 inclusive. Hour keys serialize as `YYYY-MM-DDTHH:00:00Z`.

Hourly rate is exactly errors/requests, without reducing the fraction. Global rates, if required later, must sum numerators and denominators before division.

## Output bytes

ASCII JSON, no optional whitespace, followed by exactly one LF. Field order is fixed:

- Root: `contract`, `endpoints`, `hours`.
- `contract` is `local-v1`.
- Endpoint: `endpoint_hex`, `count`, `p50_us`, `p95_us`, `p99_us`.
- Hour: `endpoint_hex`, `hour_utc`, `requests`, `errors`, `rate_numerator`, `rate_denominator`.
- Endpoint hex uses lowercase digits, two per original byte.
- Numeric values are unsigned base-ten integers without leading zeroes, except zero itself.
- Endpoints sort lexicographically by original unsigned bytes.
- Hours sort by endpoint bytes, then UTC hour.
- `rate_numerator` repeats errors; `rate_denominator` repeats requests.

Empty input produces the following followed by one LF:

```json
{"contract":"local-v1","endpoints":[],"hours":[]}
```

For [1,2], p50=1, p95=2, p99=2. For [1,...,20], p50=10, p95=19, p99=20.

## Replaceable policies

Official percentile/interpolation, timestamp domain/hour grouping, output formatting and file paths remain unresolved. Replace policy and corresponding tests when authoritative assets arrive. Never change the oracle merely to agree with a production defect.
