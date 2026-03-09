package com.vollos.core.tenant;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * TC-BE-020 ~ TC-BE-023: TenantContext (ThreadLocal) tests.
 */
class TenantContextTest {

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("TC-BE-020: set/get — ตั้งค่าแล้วอ่านกลับได้ถูกต้อง")
    void setAndGet_shouldReturnSameValue() {
        UUID tenantId = UUID.randomUUID();

        TenantContext.setCurrentTenantId(tenantId);

        assertThat(TenantContext.getCurrentTenantId()).isEqualTo(tenantId);
    }

    @Test
    @DisplayName("TC-BE-021: clear — ลบค่าออกแล้ว get คืน null")
    void clear_shouldRemoveValue() {
        TenantContext.setCurrentTenantId(UUID.randomUUID());

        TenantContext.clear();

        assertThat(TenantContext.getCurrentTenantId()).isNull();
    }

    @Test
    @DisplayName("TC-BE-022: ยังไม่เคย set — get คืน null")
    void get_withoutSet_shouldReturnNull() {
        assertThat(TenantContext.getCurrentTenantId()).isNull();
    }

    @Test
    @DisplayName("TC-BE-023: thread isolation — แต่ละ thread มีค่าแยกกัน")
    void threadIsolation_shouldHaveSeparateValues() throws InterruptedException {
        UUID mainTenantId = UUID.randomUUID();
        TenantContext.setCurrentTenantId(mainTenantId);

        AtomicReference<UUID> otherThreadValue = new AtomicReference<>();
        UUID otherTenantId = UUID.randomUUID();

        Thread otherThread = new Thread(() -> {
            TenantContext.setCurrentTenantId(otherTenantId);
            otherThreadValue.set(TenantContext.getCurrentTenantId());
            TenantContext.clear();
        });
        otherThread.start();
        otherThread.join();

        // Main thread should still have its own value
        assertThat(TenantContext.getCurrentTenantId()).isEqualTo(mainTenantId);
        // Other thread had its own value
        assertThat(otherThreadValue.get()).isEqualTo(otherTenantId);
    }
}
