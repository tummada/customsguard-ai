package com.vollos.feature.customsguard.repository;

import com.vollos.feature.customsguard.entity.RegulationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RegulationRepository extends JpaRepository<RegulationEntity, UUID> {

    List<RegulationEntity> findByDocType(String docType);
}
