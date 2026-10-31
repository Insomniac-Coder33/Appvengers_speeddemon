# Packaging compatibility record — no performance claim

This folder reuses the unchanged scalar source and normal C++20/O2 flags. Changing to an allowed compiler image and self-contained context is a packaging change, not a solver optimization.

No timing campaign runs in this milestone. Build duration is measured only against the published ten-minute build ceiling. Fresh binary correctness, sanitizer and constrained offline-container checks are recorded separately from all earlier reports.

No live-board run exists for this local candidate and no run ID is invented. Earlier local optimization experiments were inconclusive, with scalar baseline retained. Official specifications and exact harness semantics are still pending. This is not a complete official PERF/live-board history.
