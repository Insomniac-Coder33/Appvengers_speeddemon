FROM gcc:15@sha256:eb5e64286ad47187b32bda75c6b6916166ecb41da56559b8b09e0001748d2cce
WORKDIR /app
COPY build.sh /app/build.sh
COPY src/ /app/src/
RUN mkdir -p /data /out && CXX=g++ sh /app/build.sh
ENTRYPOINT ["/app/build/track-a"]
