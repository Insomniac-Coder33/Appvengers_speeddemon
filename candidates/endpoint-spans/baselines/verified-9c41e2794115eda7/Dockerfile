# Provision a pinned compiler image before this offline build.
ARG BUILD_IMAGE
FROM ${BUILD_IMAGE}
WORKDIR /app
COPY build.sh /app/build.sh
COPY track-a/src/ /app/track-a/src/
RUN sh /app/build.sh
ENTRYPOINT ["/app/build/track-a"]
