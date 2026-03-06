package com.vollos.feature.customsguard.repository;

import com.vollos.feature.customsguard.entity.BoiPrivilegeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface BoiPrivilegeRepository extends JpaRepository<BoiPrivilegeEntity, UUID> {

    /**
     * Find BOI privileges where the input HS code matches any code in the hs_codes array
     * using reverse prefix match (RLS filters by tenant automatically).
     */
    @Query(value = """
        SELECT b.* FROM cg_boi_privileges b
        WHERE EXISTS (
            SELECT 1 FROM unnest(b.hs_codes) AS hc
            WHERE :inputCode LIKE CONCAT(hc, '%')
        )
        """, nativeQuery = true)
    List<BoiPrivilegeEntity> findByHsCodePrefix(@Param("inputCode") String inputCode);
}
