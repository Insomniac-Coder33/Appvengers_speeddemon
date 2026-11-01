# Appvengers - Speed Demon Track A

C++20 implementation of the official Track A ingestion task, using only the
standard library. Team: **Appvengers**. Our code is licensed under [MIT](LICENSE).

This directory is the prepared submission root. The scoring branch must have
`track-a/Dockerfile` directly below its repository root; publishing this directory
as a nested `submission/` folder alone does not provide that layout.

- [Track A approach, build instructions and correctness reproduction](track-a/README.md)
- [Development history, verification and performance record](track-a/PERF.md)
- [Starter attribution and license](THIRD_PARTY_NOTICES.md)
- [Official starter](https://github.com/hackathon-raptors/speed-demon-starter)

## Check the package

Run from this directory in Ubuntu/WSL with Linux/amd64 Docker Server and Python 3.
Use the full seed-1 `requests.log` published by the organizers; the linked Track A
README provides its download URL and input checksum. The input directory and file
must be readable by container UID 65534. Provision the pinned image once before
the offline build:

```sh
docker pull --platform=linux/amd64 gcc:15@sha256:eb5e64286ad47187b32bda75c6b6916166ecb41da56559b8b09e0001748d2cce
docker pull --platform=linux/amd64 debian:13-slim@sha256:62bd423aeee912639ca8ee681c2b762cb3e25137e0a92b20be455898a9f034ad
TRACK_A_DATA=/absolute/path/to/full-seed1
python3 check.py a --data "$TRACK_A_DATA" --expected 495ca09682b9673ef836a506496177680bb4a3af54255174befddb1f83481cd3
```

`check.py` is the unchanged official starter utility. It tries to retrieve the
current image allowlist before building; the Docker build and solver run have
network access disabled. If allowlist retrieval fails, this upstream utility
prints a notice and skips that check, so the current allowlist still needs to be
checked before submission. It recreates only this package's `.out/track-a/`
directory on each run. Its elapsed time includes container startup and is not an
official score. Use the full expected hash above only with the public full seed-1
input; other inputs need their corresponding reference output hash.

## Verification status

The unchanged solver and build inputs passed the documented 115 optimized and
115 sanitizer checks, published full-output hash verification, and a subsequent
clean final-package build and constrained smoke checks. Those completed records
are summarized in [PERF.md](track-a/PERF.md). Adding this root checker and supporting
files does not rerun those checks or create an official board result. Original
development records and verification archives remain preserved in the workspace.

## Delivery

The repository is https://github.com/Insomniac-Coder33/Appvengers_speeddemon.
The submission branch is `speed-demon`. Place the contents of this directory at
that branch's root while retaining the existing Git history and development
provenance. The historical workspace-root `track-a/` is the local-v1 prototype;
use the official-format `track-a/` from this package for submission.

The local publish inventory is the following 14 files:

```text
.gitattributes
.gitignore
LICENSE
README.md
THIRD_PARTY_NOTICES.md
check.py
licenses/speed-demon-starter-MIT.txt
track-a/.dockerignore
track-a/.speed-demon.toml
track-a/Dockerfile
track-a/PERF.md
track-a/README.md
track-a/build.sh
track-a/src/main.cpp
```

Exclude generated datasets, `.out/`, compiled outputs and local caches. The Board
app connection, repository form and authorized push are separate delivery steps.
Record actual board run IDs and measurements in PERF.md when available. The owner
has reported organizer permission for early development; the exact exception
scope and submission declaration have not been independently checked here.
This package does not claim that all development began after kickoff.

## Board image-size repair

The initial scalar commit 3ce1131 failed only the board image-size gate before
execution: 2,176,579,120 bytes versus the 2,147,483,648-byte cap. Local content-store
Size and apparent-root figures underestimated the board's cumulative layer size.
Both scalar and span now use this identical two-stage GCC15/Debian13 slim recipe.
Compiler flags and each revision's solver bytes remain unchanged. Required GCC
standard runtime libraries are copied from the pinned compiler stage with links
dereferenced. No compiler build history/layers are inherited by the runtime stage.
This is a packaging compatibility repair, not a solver optimization or speedup.
