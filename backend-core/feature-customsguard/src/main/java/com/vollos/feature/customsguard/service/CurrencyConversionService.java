package com.vollos.feature.customsguard.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

/**
 * C1: แปลงสกุลเงินต่างประเทศเป็น THB โดยใช้อัตราแลกเปลี่ยนศุลกากร
 * เรียกใช้ก่อน TaxCalculationService เพื่อให้ CIF เป็นบาทเสมอ
 */
@Service
public class CurrencyConversionService {

    private static final Logger log = LoggerFactory.getLogger(CurrencyConversionService.class);

    private final ExchangeRateService exchangeRateService;

    public CurrencyConversionService(ExchangeRateService exchangeRateService) {
        this.exchangeRateService = exchangeRateService;
    }

    /**
     * แปลง amount จากสกุลเงินต้นทางเป็น THB
     *
     * @param amount          จำนวนเงิน
     * @param currency        สกุลเงินต้นทาง (เช่น "USD", "EUR")
     * @param declarationType ประเภทใบขน (IMPORT/EXPORT/TRANSIT/TRANSSHIPMENT)
     * @return ผลลัพธ์การแปลงสกุลเงิน
     */
    public ConversionResult convertToThb(BigDecimal amount, String currency, String declarationType) {
        if (amount == null) {
            return ConversionResult.error(BigDecimal.ZERO, "ไม่มีจำนวนเงินสำหรับแปลงสกุลเงิน");
        }

        if (currency == null || currency.isBlank()) {
            // ไม่ระบุสกุลเงิน → สมมุติเป็น THB
            return ConversionResult.unchanged(amount);
        }

        String upperCurrency = currency.toUpperCase().trim();

        if ("THB".equals(upperCurrency) || "BAHT".equals(upperCurrency)) {
            return ConversionResult.unchanged(amount);
        }

        Optional<BigDecimal> rateOpt = exchangeRateService.getRateForDeclaration(upperCurrency, declarationType);

        if (rateOpt.isEmpty()) {
            log.warn("C1: ไม่พบอัตราแลกเปลี่ยนสกุล {} — ใช้ค่า CIF ตามเดิมพร้อม warning", upperCurrency);
            return ConversionResult.warning(amount,
                    "ไม่พบอัตราแลกเปลี่ยนสกุล " + upperCurrency + " กรุณาตรวจสอบ");
        }

        BigDecimal rate = rateOpt.get();
        BigDecimal thbAmount = amount.multiply(rate).setScale(2, RoundingMode.HALF_UP);
        log.info("C1: แปลงสกุลเงิน {} {} × {} = {} THB (declarationType={})",
                amount, upperCurrency, rate, thbAmount, declarationType);
        return ConversionResult.converted(thbAmount, rate, upperCurrency);
    }

    /**
     * ผลลัพธ์การแปลงสกุลเงิน
     */
    public record ConversionResult(
            BigDecimal amountThb,
            BigDecimal exchangeRate,
            String originalCurrency,
            String warning,
            boolean converted
    ) {
        static ConversionResult unchanged(BigDecimal amount) {
            return new ConversionResult(amount, null, "THB", null, false);
        }

        static ConversionResult converted(BigDecimal thbAmount, BigDecimal rate, String currency) {
            return new ConversionResult(thbAmount, rate, currency, null, true);
        }

        static ConversionResult warning(BigDecimal originalAmount, String warningMsg) {
            return new ConversionResult(originalAmount, null, null, warningMsg, false);
        }

        static ConversionResult error(BigDecimal amount, String warningMsg) {
            return new ConversionResult(amount, null, null, warningMsg, false);
        }

        public boolean hasWarning() {
            return warning != null && !warning.isBlank();
        }
    }
}
