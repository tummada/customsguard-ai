# Stage 1: Build Native Image
FROM ghcr.io/graalvm/native-image-community:21 AS builder

# Set working directory
WORKDIR /app

# Copy source code
COPY . .

# Build native image (Assuming Gradle or Maven wrapper is present)
# Using Gradle wrapper as standard for Spring Boot
RUN ./gradlew nativeCompile

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
COPY --from=builder /app/build/native/nativeCompile/backend-core /app/backend-core

# Expose port
EXPOSE 8080

# Run application
ENTRYPOINT ["/app/backend-core"]
