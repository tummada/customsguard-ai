package com.vollos.core.shared;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.UUID;

/**
 * UUID v7 generator: time-sortable, compatible with B-Tree indexing.
 */
public final class UUIDv7 {

    private static final SecureRandom RANDOM = new SecureRandom();

    private UUIDv7() {}

    public static UUID generate() {
        long timestamp = Instant.now().toEpochMilli();
        long msb = (timestamp << 16) | 0x7000L | (RANDOM.nextLong() & 0x0FFFL);
        long lsb = 0x8000000000000000L | (RANDOM.nextLong() & 0x3FFFFFFFFFFFFFFFL);
        return new UUID(msb, lsb);
    }
}
