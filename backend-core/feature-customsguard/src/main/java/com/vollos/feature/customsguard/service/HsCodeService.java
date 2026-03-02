package com.vollos.feature.customsguard.service;

import com.vollos.feature.customsguard.dto.HsCodeResponse;
import com.vollos.feature.customsguard.dto.SemanticSearchResponse;
import com.vollos.feature.customsguard.entity.HsCodeEntity;
import com.vollos.feature.customsguard.repository.HsCodeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class HsCodeService {

    private static final Logger log = LoggerFactory.getLogger(HsCodeService.class);

    private final HsCodeRepository hsCodeRepo;
    private final GeminiEmbeddingService embeddingService;

    public HsCodeService(HsCodeRepository hsCodeRepo, GeminiEmbeddingService embeddingService) {
        this.hsCodeRepo = hsCodeRepo;
        this.embeddingService = embeddingService;
    }

    @Transactional(readOnly = true)
    public Page<HsCodeResponse> search(String query, Pageable pageable) {
        return hsCodeRepo.search(query, pageable)
                .map(e -> new HsCodeResponse(
                        e.getCode(),
                        e.getDescriptionTh(),
                        e.getDescriptionEn(),
                        e.getBaseRate(),
                        e.getUnit(),
                        e.getCategory(),
                        e.getSection(),
                        e.getChapter()
                ));
    }

    @Transactional(readOnly = true)
    public List<SemanticSearchResponse> semanticSearch(String query, int limit) {
        float[] queryEmbedding = embeddingService.embed(query);
        String embeddingStr = GeminiEmbeddingService.toVectorString(queryEmbedding);

        List<Object[]> rows = hsCodeRepo.findBySemantic(embeddingStr, limit);

        return rows.stream().map(row -> new SemanticSearchResponse(
                (String) row[0],
                (String) row[1],
                (String) row[2],
                row[3] != null ? new BigDecimal(row[3].toString()) : null,
                (String) row[4],
                (String) row[5],
                row[6] != null ? ((Number) row[6]).doubleValue() : null
        )).toList();
    }

    @Transactional
    public int embedAllHsCodes() {
        List<HsCodeEntity> unembedded = hsCodeRepo.findByEmbeddedFalse();
        int count = 0;

        for (HsCodeEntity entity : unembedded) {
            try {
                String text = buildEmbeddingText(entity);
                float[] embedding = embeddingService.embed(text);
                String vectorStr = GeminiEmbeddingService.toVectorString(embedding);
                hsCodeRepo.updateEmbedding(entity.getCode(), vectorStr);
                count++;

                if (count % 10 == 0) {
                    log.info("Embedded {}/{} HS codes", count, unembedded.size());
                    Thread.sleep(500);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.error("Failed to embed HS code {}: {}", entity.getCode(), e.getMessage());
            }
        }

        log.info("Embedding complete: {}/{} HS codes", count, unembedded.size());
        return count;
    }

    @Transactional
    public int seedSampleHsCodes() {
        if (hsCodeRepo.count() > 0) {
            return 0;
        }

        Object[][] samples = {
                {"1006.30", "ข้าวกึ่งขาวหรือข้าวขาว", "Semi-milled or wholly milled rice", "30.00", "Cereals"},
                {"1006.10", "ข้าวเปลือก", "Rice in the husk (paddy or rough)", "30.00", "Cereals"},
                {"0207.14", "ชิ้นส่วนไก่แช่แข็ง", "Frozen cuts and offal of chickens", "40.00", "Meat"},
                {"0306.17", "กุ้งแช่แข็ง", "Frozen shrimps and prawns", "5.00", "Seafood"},
                {"4001.22", "ยางแผ่นรมควัน", "Technically specified natural rubber (TSNR)", "0.00", "Rubber"},
                {"8471.30", "เครื่องคอมพิวเตอร์พกพา", "Portable automatic data-processing machines", "0.00", "Electronics"},
                {"8517.12", "โทรศัพท์มือถือ", "Telephones for cellular networks (smartphones)", "0.00", "Electronics"},
                {"8528.72", "เครื่องรับโทรทัศน์สี", "Colour television receivers", "20.00", "Electronics"},
                {"6204.62", "กางเกงสตรีทำจากผ้าฝ้าย", "Women's trousers of cotton", "30.00", "Garments"},
                {"6109.10", "เสื้อยืดผ้าฝ้าย", "T-shirts, singlets of cotton", "30.00", "Garments"},
                {"6110.20", "เสื้อถักจากผ้าฝ้าย", "Jerseys, pullovers of cotton", "30.00", "Garments"},
                {"8703.23", "รถยนต์นั่งเครื่องยนต์ 1500-3000 ซีซี", "Motor cars with engine 1500-3000 cc", "80.00", "Vehicles"},
                {"8704.21", "รถบรรทุกน้ำหนักรวมไม่เกิน 5 ตัน", "Motor vehicles for transport of goods GVW <= 5 tonnes", "40.00", "Vehicles"},
                {"2106.90", "อาหารปรุงแต่งอื่นๆ", "Other food preparations", "30.00", "Food"},
                {"3304.99", "เครื่องสำอางอื่นๆ", "Other beauty or make-up preparations", "30.00", "Cosmetics"},
                {"7113.19", "เครื่องประดับทำจากโลหะมีค่าอื่นๆ", "Articles of jewellery of other precious metal", "20.00", "Jewellery"},
                {"2710.12", "น้ำมันเบนซิน", "Light oils - motor spirit (gasoline)", "10.00", "Petroleum"},
                {"4407.11", "ไม้สนแปรรูป", "Coniferous wood sawn or chipped", "5.00", "Wood"},
                {"7601.10", "อะลูมิเนียมไม่เจือ", "Unwrought aluminium, not alloyed", "1.00", "Metals"},
                {"3004.90", "ยาสำเร็จรูปอื่นๆ", "Other medicaments in measured doses", "10.00", "Pharmaceuticals"},
        };

        int count = 0;
        for (Object[] s : samples) {
            HsCodeEntity e = new HsCodeEntity((String) s[0]);
            e.setDescriptionTh((String) s[1]);
            e.setDescriptionEn((String) s[2]);
            e.setBaseRate(new BigDecimal((String) s[3]));
            e.setCategory((String) s[4]);
            e.setEmbedded(false);
            hsCodeRepo.save(e);
            count++;
        }

        return count;
    }

    private String buildEmbeddingText(HsCodeEntity entity) {
        StringBuilder sb = new StringBuilder();
        sb.append(entity.getCode());
        if (entity.getDescriptionEn() != null) {
            sb.append(" ").append(entity.getDescriptionEn());
        }
        if (entity.getDescriptionTh() != null) {
            sb.append(" ").append(entity.getDescriptionTh());
        }
        if (entity.getCategory() != null) {
            sb.append(" ").append(entity.getCategory());
        }
        return sb.toString();
    }
}
