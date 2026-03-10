package com.vollos.feature.customsguard.service;

import com.vollos.feature.customsguard.dto.TaxCalculationResponse;
import com.vollos.feature.customsguard.entity.ExciseRateEntity;
import com.vollos.feature.customsguard.repository.ExciseRateRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * คำนวณภาษีนำเข้าตามลำดับ: อากรขาเข้า → สรรพสามิต → มหาดไทย → VAT
 * รองรับ: อากรขาเข้า + สรรพสามิต (AD_VALOREM/SPECIFIC/COMPOUND) + ภาษีมหาดไทย + VAT 7%
 */
@Service
public class TaxCalculationService {

    private static final Logger log = LoggerFactory.getLogger(TaxCalculationService.class);

    private static final BigDecimal VAT_RATE = new BigDecimal("0.07");
    private static final BigDecimal MUNICIPAL_TAX_RATE = new BigDecimal("0.10"); // 10% of excise

    private final ExciseRateRepository exciseRateRepo;

    public TaxCalculationService(ExciseRateRepository exciseRateRepo) {
        this.exciseRateRepo = exciseRateRepo;
    }

    /**
     * คำนวณภาษีนำเข้าแบบง่าย (ไม่มี excise) — backward compatible
     */
    public TaxCalculationResponse calculate(BigDecimal cifAmount, BigDecimal dutyRatePercent) {
        return calculateFull(cifAmount, dutyRatePercent, null, null);
    }

    /**
     * คำนวณภาษีนำเข้าครบลำดับ: อากร → สรรพสามิต → มหาดไทย → VAT
     * @param cifAmount ราคา CIF (บาท)
     * @param dutyRatePercent อัตราอากรขาเข้า เช่น 5 = 5%
     * @param hsCode พิกัดศุลกากร สำหรับ lookup excise rate (nullable)
     * @param quantity จำนวน สำหรับ specific duty (nullable)
     */
    public TaxCalculationResponse calculateFull(BigDecimal cifAmount, BigDecimal dutyRatePercent,
                                                String hsCode, BigDecimal quantity) {
        // 1. อากรขาเข้า = CIF × (rate/100) ปัดสตางค์ทิ้ง
        BigDecimal dutyRate = dutyRatePercent.divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP);
        BigDecimal dutyAmount = cifAmount.multiply(dutyRate)
                .setScale(2, RoundingMode.DOWN);

        // 2. สรรพสามิต (ถ้ามี — lookup จาก excise rate table)
        BigDecimal exciseAmount = BigDecimal.ZERO;
        BigDecimal municipalTaxAmount = BigDecimal.ZERO;
        String note = null;

        if (hsCode != null && !hsCode.isBlank()) {
            String normalized = hsCode.trim().replaceAll("[^0-9]", "");
            List<ExciseRateEntity> exciseRates = exciseRateRepo.findByHsCodePrefix(normalized);

            if (!exciseRates.isEmpty()) {
                ExciseRateEntity excise = exciseRates.get(0); // most specific match
                BigDecimal exciseBase = cifAmount.add(dutyAmount);
                exciseAmount = calculateExcise(exciseBase, excise, quantity);

                // 3. ภาษีมหาดไทย = สรรพสามิต × 10%
                municipalTaxAmount = exciseAmount.multiply(MUNICIPAL_TAX_RATE)
                        .setScale(2, RoundingMode.HALF_UP);

                note = "สรรพสามิต: " + excise.getProductCategory()
                        + " (" + excise.getCalculationMethod() + ")";
                log.info("Excise applied: HS={}, category={}, method={}, excise={}, municipal={}",
                        hsCode, excise.getProductCategory(), excise.getCalculationMethod(),
                        exciseAmount, municipalTaxAmount);
            }
        }

        // 4. VAT = (CIF + อากร + สรรพสามิต + มหาดไทย) × 7%
        BigDecimal vatBase = cifAmount.add(dutyAmount).add(exciseAmount).add(municipalTaxAmount);
        BigDecimal vatAmount = vatBase.multiply(VAT_RATE)
                .setScale(2, RoundingMode.HALF_UP);

        // 5. รวม = อากร + สรรพสามิต + มหาดไทย + VAT
        BigDecimal totalTaxDue = dutyAmount.add(exciseAmount).add(municipalTaxAmount).add(vatAmount);

        return new TaxCalculationResponse(
                cifAmount,
                dutyRatePercent,
                dutyAmount,
                exciseAmount,
                municipalTaxAmount,
                vatBase,
                vatAmount,
                totalTaxDue,
                note
        );
    }

    /**
     * คำนวณสรรพสามิตตาม calculation method:
     * AD_VALOREM: excise = base × rate%
     * SPECIFIC: excise = quantity × specific rate
     * COMPOUND: excise = MAX(ad_valorem, specific)
     */
    private BigDecimal calculateExcise(BigDecimal exciseBase, ExciseRateEntity excise, BigDecimal quantity) {
        String method = excise.getCalculationMethod();
        if (method == null) method = "AD_VALOREM";

        BigDecimal adValorem = BigDecimal.ZERO;
        if (excise.getExciseRate() != null) {
            adValorem = exciseBase.multiply(excise.getExciseRate().divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP))
                    .setScale(2, RoundingMode.DOWN);
        }

        BigDecimal specific = BigDecimal.ZERO;
        if (excise.getExciseRateSpecific() != null && quantity != null) {
            try {
                String rateStr = excise.getExciseRateSpecific().trim();
                // Handle range format "100-150" → use the higher rate (conservative)
                if (rateStr.matches("\\d+\\.?\\d*\\s*-\\s*\\d+\\.?\\d*")) {
                    String[] parts = rateStr.split("\\s*-\\s*");
                    rateStr = parts[parts.length - 1]; // take higher bound
                    log.info("Excise specific rate range detected '{}' → using upper bound: {}", excise.getExciseRateSpecific(), rateStr);
                }
                BigDecimal specificRate = new BigDecimal(rateStr.replaceAll("[^\\d.]", ""));
                specific = quantity.multiply(specificRate).setScale(2, RoundingMode.DOWN);
            } catch (NumberFormatException e) {
                log.warn("Cannot parse excise specific rate: {}", excise.getExciseRateSpecific());
            }
        }

        return switch (method.toUpperCase()) {
            case "SPECIFIC" -> specific;
            case "COMPOUND" -> adValorem.max(specific);
            default -> adValorem; // AD_VALOREM
        };
    }
}
