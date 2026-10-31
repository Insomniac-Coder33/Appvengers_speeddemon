# Track A GCC 15 packaging candidate — local-v1 only

This self-contained build folder contains an unchanged copy of the preserved scalar C++20 solver. It is an isolated packaging rehearsal, not an official semantic reconciliation or a submission. The root scalar baseline and endpoint-span experiment remain unchanged.

The Dockerfile pins the GCC 15 multi-arch index in the organizer allowlist retrieved on 25 October 2026. It retains the compiler image as runtime so standard-library, loader and sanitizer-runtime dependencies stay available without network downloads or external image copies. There are no external build-context references.

Local build from this directory: `docker build --network=none --pull=false --no-cache .` with the exact image already provisioned. `sh build.sh` uses a C++20 compiler in the current environment; fresh packaging verification specifically compiles inside the pinned GCC 15 image.

ENTRYPOINT is `/app/build/track-a`. It still requires explicit `--contract local-v1 --input PATH --output PATH` arguments, optionally `--buffer-size N`. Local checks mount read-only input at `/data` and writable output at `/out`, with explicitly provisional local filenames. No default input/output filename or official harness invocation is invented. The exact Track A specification and harness are scheduled for 28 October; follow those when released.

The schema remains the existing local-v1 contract: strict six-digit UTC timestamps, full endpoint byte identity, nearest-rank integer percentiles, endpoint-hour counts and exact error-rate fractions. Official percentile/timestamp/schema details are not inferred from preview rows. No `.speed-demon.toml` is fabricated; team-approved metadata/schema, license/repository/eligibility and live-board evidence remain unresolved.

Fresh compiler/image/source/binary identities, build duration/size and new local correctness/sanitizer/container results are companion local evidence under the root workspace's `artifacts/packaging-gcc15/`. Prior GCC 13/14 passing reports do not verify this new package. No performance or official score is claimed. No publishing, pushing, deployment or submission occurred.
