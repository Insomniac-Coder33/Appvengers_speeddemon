#!/bin/sh
set -eu
cd "$(dirname "$0")"
mkdir -p build
"${CXX:-g++}" -std=c++20 -O2 -DNDEBUG -Wall -Wextra -Wpedantic track-a/src/main.cpp -o build/track-a
