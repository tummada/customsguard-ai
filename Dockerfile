# --- Stage 1: Build (ดำเนินการใน CI/CD ภายนอก) ---
FROM ghcr.io/graalvm/native-image-community:21-ol9 AS build
WORKDIR /app
COPY . .
RUN ./mvnw -Pnative native:compile -DskipTests

# --- Stage 2: Run (Debian Slim - glibc Compatible) ---
FROM debian:12-slim
WORKDIR /app

# ติดตั้ง curl สำหรับ Healthcheck และเคลียร์ขยะทันทีเพื่อประหยัดพื้นที่
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# คัดกรองเฉพาะ Binary ที่คอมไพล์แล้ว
COPY --from=build /app/target/ai-saas-backend /app/backend

# กฎเหล็ก DevOps: ห้ามรันด้วย Root
RUN useradd -ms /bin/bash nonroot
USER nonroot

# Environment Standards
ENV JAVA_TOOL_OPTIONS="-XX:NativeMemoryTracking=summary -XX:+UseSerialGC"
ENV SPRING_PROFILES_ACTIVE=production

# ล็อก Heap 512MB ภายใต้กรง 1GB
ENTRYPOINT ["/app/backend", "-Xmx512m", "-Xms512m"]