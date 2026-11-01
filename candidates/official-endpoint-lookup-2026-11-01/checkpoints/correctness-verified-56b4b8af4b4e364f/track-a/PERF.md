# Transparent endpoint lookup — promotion rejected, 2026-11-01

Local-only candidate based on published span 76743e8. Same two-stage GCC15/Debian
runtime, compiler flags, dependencies and output contract. No board run exists.

Fresh verification passed 150 optimized + 150 ASan/UBSan checks (71 official
reference comparisons each), added seeds/high-cardinality/carry/alias tests,
sanitized hash/equality/ownership/rehash and forced-collision units, and the full
public output hash in the production runtime. Source SHA-256:
56b4b8af4b4e364f0d2ecb21418ca6f16c838bbc18c6582443b61712361dfa87
Optimized binary: dddd0529bfccf36362146a19419aac770fd740b73fdc8e03d0f070b16fcb7104
Sanitizer binary: 3eb46832026fccd4c5badf041550574416d718a983425c9842b3a02d2355925f

Exactly one six-pair A/A control and one six-pair alternating B/C comparison were
run. Geometric B/C ratio 0.959090x; 4/6 pairs favor candidate, but A/A range
0.8280x..1.1410x and conflicting timing summaries leave the difference
unresolved. No favorable reruns. Source bytes 19156 -> 19335;
source-neutral/memory-neutral estimated relative K 0.979332x, not an official score.
Canonical S tools were absent. Median paired RSS 32744/32764 KiB;
fresh cgroup peaks 41787392/41639936 B (baseline/candidate).
RSS/cgroup peak are not the official memory definition. No material regression or OOM.

Decision: reject promotion; retain published span. This candidate remains separate,
correctness-verified and performance-unresolved. Ingestion lookup/aggregation remains
the measured bottleneck; no second change or benchmark batch is started.
All detailed raw records and the fresh report are outside the build context under
artifacts/experiments/endpoint-lookup-2026-11-01/. Only this results documentation
was finalized after verification; source/build/runtime inputs did not change.
