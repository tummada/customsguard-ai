# Stage 1: Build Native Image
FROM ghcr.io/graalvm/native-image-community:21 AS builder

# Set working directory
WORKDIR /app

# Copy source code
COPY . .

# Build native image using Gradle multi-module (bootable module = platform-app)
RUN ./gradlew :platform-app:nativeCompile

# Stage 2: Run Native Image
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/platform-app/build/native/nativeCompile/platform-app /app/vollos-backend

# Expose port
EXPOSE 8080

# Run application
ENTRYPOINT ["/app/vollos-backend"]
