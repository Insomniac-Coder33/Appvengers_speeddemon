FROM gcc:15@sha256:eb5e64286ad47187b32bda75c6b6916166ecb41da56559b8b09e0001748d2cce AS build
WORKDIR /app
COPY build.sh /app/build.sh
COPY src/ /app/src/
RUN CXX=g++ sh /app/build.sh && mkdir -p /runtime && cp -L /usr/local/lib64/libstdc++.so.6 /usr/local/lib64/libgcc_s.so.1 /runtime/

FROM debian:13-slim@sha256:62bd423aeee912639ca8ee681c2b762cb3e25137e0a92b20be455898a9f034ad
WORKDIR /app
COPY --from=build /app/build/track-a /app/build/track-a
COPY --from=build /runtime/ /usr/local/lib/
ENV LD_LIBRARY_PATH=/usr/local/lib
RUN mkdir -p /data /out
ENTRYPOINT ["/app/build/track-a"]
