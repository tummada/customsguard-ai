package com.vollos.core.tenant;

import org.aspectj.lang.ProceedingJoinPoint;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.datasource.DataSourceUtils;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * TC-BE-029 ~ TC-BE-031: TenantConnectionInterceptor tests.
 */
@ExtendWith(MockitoExtension.class)
class TenantConnectionInterceptorTest {

    @Mock private DataSource dataSource;
    @Mock private Connection connection;
    @Mock private PreparedStatement preparedStatement;
    @Mock private ProceedingJoinPoint joinPoint;

    private TenantConnectionInterceptor interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new TenantConnectionInterceptor(dataSource);
        TenantContext.clear();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("TC-BE-029: tenantId ตั้งค่าแล้ว — execute set_config SQL")
    void setTenantContext_withTenantId_shouldExecuteSetConfig() throws Throwable {
        UUID tenantId = UUID.randomUUID();
        TenantContext.setCurrentTenantId(tenantId);
        Object expectedResult = "result";

        try (MockedStatic<DataSourceUtils> dsu = mockStatic(DataSourceUtils.class)) {
            dsu.when(() -> DataSourceUtils.getConnection(dataSource)).thenReturn(connection);
            when(connection.prepareStatement("SELECT set_config('app.current_tenant_id', ?, true)"))
                    .thenReturn(preparedStatement);
            when(joinPoint.proceed()).thenReturn(expectedResult);

            Object result = interceptor.setTenantContext(joinPoint);

            assertThat(result).isEqualTo(expectedResult);
            verify(preparedStatement).setString(1, tenantId.toString());
            verify(preparedStatement).execute();
            verify(preparedStatement).close();
            dsu.verify(() -> DataSourceUtils.releaseConnection(connection, dataSource));
        }
    }

    @Test
    @DisplayName("TC-BE-030: tenantId เป็น null — ข้ามไป ไม่ execute SQL")
    void setTenantContext_withNullTenantId_shouldSkipSqlAndProceed() throws Throwable {
        // TenantContext is null by default
        Object expectedResult = "result";
        when(joinPoint.proceed()).thenReturn(expectedResult);

        Object result = interceptor.setTenantContext(joinPoint);

        assertThat(result).isEqualTo(expectedResult);
        verifyNoInteractions(dataSource);
    }

    @Test
    @DisplayName("TC-BE-031: joinPoint.proceed() ถูกเรียกเสมอแม้มี tenantId")
    void setTenantContext_shouldAlwaysCallProceed() throws Throwable {
        UUID tenantId = UUID.randomUUID();
        TenantContext.setCurrentTenantId(tenantId);

        try (MockedStatic<DataSourceUtils> dsu = mockStatic(DataSourceUtils.class)) {
            dsu.when(() -> DataSourceUtils.getConnection(dataSource)).thenReturn(connection);
            when(connection.prepareStatement(anyString())).thenReturn(preparedStatement);
            when(joinPoint.proceed()).thenReturn(null);

            interceptor.setTenantContext(joinPoint);

            verify(joinPoint).proceed();
        }
    }
}
