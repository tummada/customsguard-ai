package com.vollos.feature.customsguard.repository;

import com.vollos.feature.customsguard.entity.CustomsDeclarationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CustomsDeclarationRepository extends JpaRepository<CustomsDeclarationEntity, UUID> {

    Page<CustomsDeclarationEntity> findByTenantId(UUID tenantId, Pageable pageable);
}
