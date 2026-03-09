package com.vollos.core.shared;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * TC-BE-042 ~ TC-BE-044: UUIDv7 generator tests.
 */
class UUIDv7Test {

    @Test
    @DisplayName("TC-BE-042: UUID v7 — format ถูกต้อง (version=7, variant=2)")
    void generate_shouldReturnValidUuidV7Format() {
        UUID uuid = UUIDv7.generate();

        assertThat(uuid).isNotNull();
        // Version bits (bits 48-51 of msb) should be 0x7
        int version = (int) ((uuid.getMostSignificantBits() >> 12) & 0xF);
        assertThat(version).isEqualTo(7);

        // Variant bits (bits 62-63 of lsb) should be 0b10
        int variant = (int) ((uuid.getLeastSignificantBits() >>> 62) & 0x3);
        assertThat(variant).isEqualTo(2);

        // Should be parseable as UUID string
        String uuidStr = uuid.toString();
        assertThat(UUID.fromString(uuidStr)).isEqualTo(uuid);
    }

    @Test
    @DisplayName("TC-BE-043: UUID v7 — time-sortable (สร้างทีหลังมีค่ามากกว่า)")
    void generate_shouldBeTimeSortable() throws InterruptedException {
        UUID first = UUIDv7.generate();
        Thread.sleep(2); // ensure different millisecond
        UUID second = UUIDv7.generate();

        // The MSB encodes timestamp in upper bits, so lexicographic comparison works
        assertThat(first.getMostSignificantBits())
                .isLessThanOrEqualTo(second.getMostSignificantBits());

        // compareTo should also reflect ordering
        assertThat(first.compareTo(second)).isLessThan(0);
    }

    @Test
    @DisplayName("TC-BE-044: UUID v7 — ไม่ซ้ำกันเมื่อสร้างหลายตัวพร้อมกัน")
    void generate_shouldNotCollide() {
        int count = 10_000;
        Set<UUID> uuids = new HashSet<>();

        for (int i = 0; i < count; i++) {
            uuids.add(UUIDv7.generate());
        }

        assertThat(uuids).hasSize(count);
    }
}
