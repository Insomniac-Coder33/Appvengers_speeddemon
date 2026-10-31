#!/bin/sh
# DOCUMENTATION SYNTAX AUDIT ONLY: DO NOT EXECUTE THESE PLACEHOLDER COMMANDS.

CXX=g++ sh build.sh
./build/track-a --help
./build/track-a --contract local-v1 --input /absolute/path/input.log --output /absolute/path/result.json


CXX=g++ node scripts/build.mjs


node track-a/tests/test.mjs ./build/track-a


CXX=g++ node scripts/preflight.mjs


mkdir -p baselines
node scripts/checkpoint.mjs


(
  cd candidates/endpoint-spans
  CXX=g++ sh build.sh
  node track-a/tests/test.mjs ./build/track-a
)


node scripts/container-check.mjs
