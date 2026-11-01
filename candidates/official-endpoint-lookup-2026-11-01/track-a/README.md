# Experimental owning endpoint map with transparent view lookup

Local-only C++20 candidate based on published speed-demon commit 76743e8.
The two-stage GCC15/Debian13 Dockerfile, build flags and runtime remain unchanged.
EndpointHash accepts string_view, so an owning string and equal view use the same
hash implementation. std::equal_to<> supplies exact transparent byte equality.
The unordered map still owns std::string keys; only a find miss constructs a key.
Map keys are never erased, and references to them remain stable across rehash.
The parser passes a view valid for the immediate call; no buffer/carry view is
stored in the map or endpoint-name references. Its temporary copy is removed.

All other parsing/aggregation/quantile/output/CLI/file semantics are unchanged.
No reserve, hash algorithm change, vendor traits, mmap, parallelism or dependency
is bundled. Custom hash functors can affect standard-library hash caching/layout;
that implementation consequence is measured rather than assumed beneficial.

Build from this folder using its unchanged Dockerfile. Provision both exact pinned
images first; build uses --pull=false --no-cache --network=none --platform=linux/amd64.
Official invocation has no arguments, TRACK=a, readonly /data/requests.log and
writable /out/summary.txt as uid65534 under the published constraints. Development
checks, paired results and recommendation live outside this context in
artifacts/experiments/endpoint-lookup-2026-11-01/. This candidate has no board run ID.
The published span baseline remains unchanged and default pending evidence.
