# Official Track A delivery candidate

C++20, standard library only; zero direct third-party runtime dependencies.
Based on the preserved scalar solver, adapted to the released Track A specification.
All statistics are grouped by (UTC hour, exact endpoint); full per-group sort and
nearest-rank percentiles, integer floor error parts per million, hour/byte ordering.
No dataset-specific answers, endpoint catalogue or out-of-order bound is embedded.

Build this folder only, using the pinned GCC15 image already provisioned:

```sh
docker build --pull=false --no-cache --network=none --platform=linux/amd64 -t track-a-official .
docker run --rm --network=none --read-only --user 65534:65534 --cap-drop=ALL --security-opt=no-new-privileges --memory=8g --memory-swap=8g --pids-limit=512 --tmpfs /tmp:rw,size=1g,exec -e TRACK=a -v /absolute/input:/data:ro -v /absolute/writable-output:/out:rw track-a-official
```

No program arguments are needed. Reads `/data/requests.log`, writes only
`/out/summary.txt`. Native convenience options: `--data DIR --out DIR`,
`--buffer-size 1..16777216`. Input buffering remains bounded; latency storage
is proportional to the input. The output directory must be writable by uid 65534.
Malformed input handling is defensive, outside the official well-formed domain.
Calendar dates outside the specified span are also handled, without a claim about
unreleased holdout data. No local-v1 compatibility mode exists in this candidate.

Metadata uses the actual starter template. `TODO_OWNER_TEAM_NAME` is intentionally
unresolved and must be replaced by an owner-approved team name before delivery.
No board run ID or submission approval is implied. See the outer local integration
report for verification, source/binary identities and remaining delivery requirements.

Next 24 hours: owner metadata/license/eligibility review; no automatic optimization
or publication. Historical baseline and span candidate remain untouched.
