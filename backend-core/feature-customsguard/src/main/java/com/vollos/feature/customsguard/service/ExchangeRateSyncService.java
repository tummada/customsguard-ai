package com.vollos.feature.customsguard.service;

import com.vollos.feature.customsguard.entity.ExchangeRateEntity;
import com.vollos.feature.customsguard.repository.ExchangeRateRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Auto-syncs exchange rates from กรมศุลกากร (Thai Customs Department)
 * Runs daily at 08:27 AM Bangkok time.
 * Source: customs.go.th
 */
@Service
public class ExchangeRateSyncService {

    private static final Logger log = LoggerFactory.getLogger(ExchangeRateSyncService.class);

    private static final String CUSTOMS_URL =
            "https://www.customs.go.th/content_special.php?link=exch_search.php&lang=en";

    /** Currencies we care about for customs duty calculation */
    private static final Set<String> TARGET_CURRENCIES = Set.of(
            "USD", "EUR", "JPY", "GBP", "CNY", "KRW",
            "SGD", "HKD", "AUD", "CHF", "CAD", "NZD",
            "TWD", "MYR", "IDR", "INR", "VND", "PHP",
            "AED" // UAE — คู่ค้าสำคัญ
    );

    private final ExchangeRateRepository exchangeRateRepo;
    private final HttpClient httpClient;

    /** Track consecutive sync failures for alerting */
    private int consecutiveFailures = 0;
    private static final int ALERT_THRESHOLD = 3;

    public ExchangeRateSyncService(ExchangeRateRepository exchangeRateRepo) {
        this.exchangeRateRepo = exchangeRateRepo;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    /**
     * Run daily at 08:27 Bangkok time (GMT+7).
     * Customs department publishes rates early morning.
     */
    @Scheduled(cron = "0 27 8 * * *", zone = "Asia/Bangkok")
    public void syncDaily() {
        log.info("ExchangeRate sync started");
        try {
            int count = syncFromCustomsDept();
            if (count > 0) {
                consecutiveFailures = 0;
                log.info("ExchangeRate sync completed: {} rates updated", count);
            } else {
                consecutiveFailures++;
                log.warn("ExchangeRate sync returned 0 rates (consecutive failures: {})", consecutiveFailures);
                checkAndAlert();
            }
        } catch (org.springframework.dao.DataAccessException e) {
            consecutiveFailures++;
            log.error("ALERT: ExchangeRate sync DB error — possible data inconsistency (consecutive failures: {}): {}",
                    consecutiveFailures, e.getMessage(), e);
            checkAndAlert();
        } catch (Exception e) {
            consecutiveFailures++;
            log.error("ExchangeRate sync unexpected error (consecutive failures: {}): {}",
                    consecutiveFailures, e.getMessage(), e);
            checkAndAlert();
        }
    }

    private void checkAndAlert() {
        if (consecutiveFailures >= ALERT_THRESHOLD) {
            log.error("ALERT: ExchangeRate sync failed {} consecutive days! " +
                    "อัตราแลกเปลี่ยนศุลกากรอาจไม่เป็นปัจจุบัน — ตรวจสอบ customs.go.th หรือ sync ด้วยมือ",
                    consecutiveFailures);
        }
    }

    /**
     * Fetch and parse exchange rates from customs.go.th.
     * Returns number of rates upserted.
     */
    @Transactional
    public int syncFromCustomsDept() {
        String html = fetchCustomsPage();
        if (html == null || html.isBlank()) {
            log.warn("Empty response from customs.go.th");
            return 0;
        }

        List<ParsedRate> rates = parseRatesFromHtml(html);
        if (rates.isEmpty()) {
            log.warn("No rates parsed from customs.go.th HTML");
            return 0;
        }

        int upserted = 0;
        for (ParsedRate parsed : rates) {
            if (!TARGET_CURRENCIES.contains(parsed.currencyCode)) {
                continue;
            }
            try {
                upsertRate(parsed);
                upserted++;
            } catch (org.springframework.dao.DataAccessException e) {
                log.error("DB error upserting rate for {}: {}", parsed.currencyCode, e.getMessage());
            } catch (Exception e) {
                log.warn("Failed to upsert rate for {} ({}): {}", parsed.currencyCode, e.getClass().getSimpleName(), e.getMessage());
            }
        }
        return upserted;
    }

    private String fetchCustomsPage() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(CUSTOMS_URL))
                    .timeout(Duration.ofSeconds(30))
                    .header("User-Agent", "VOLLOS-CustomsGuard/1.0")
                    .header("Accept", "text/html")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.warn("customs.go.th returned status {}", response.statusCode());
                return null;
            }
            return response.body();
        } catch (java.net.http.HttpTimeoutException e) {
            log.warn("Timeout fetching customs.go.th: {}", e.getMessage());
            return null;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Interrupted fetching customs.go.th");
            return null;
        } catch (java.io.IOException e) {
            log.warn("I/O error fetching customs.go.th: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Parse HTML table from customs.go.th.
     * Table format: Country | Currency Name | Code | Export Rate | Import Rate
     */
    List<ParsedRate> parseRatesFromHtml(String html) {
        List<ParsedRate> rates = new ArrayList<>();

        // Extract effective date from page (format varies)
        LocalDate effectiveDate = extractEffectiveDate(html);
        if (effectiveDate == null) {
            effectiveDate = LocalDate.now();
        }

        // Match table rows: <td>Country</td><td>Name</td><td>Code</td><td>ExportRate</td><td>ImportRate</td>
        // customs.go.th uses various table formats; we try multiple patterns
        Pattern rowPattern = Pattern.compile(
                "<tr[^>]*>\\s*" +
                "<td[^>]*>([^<]*)</td>\\s*" +  // Country
                "<td[^>]*>([^<]*)</td>\\s*" +  // Currency Name
                "<td[^>]*>([A-Z]{3})</td>\\s*" +  // Currency Code
                "<td[^>]*>([\\d.,]+)</td>\\s*" +  // Export Rate
                "<td[^>]*>([\\d.,]+)</td>\\s*" +  // Import Rate
                "</tr>",
                Pattern.CASE_INSENSITIVE | Pattern.DOTALL
        );

        Matcher matcher = rowPattern.matcher(html);
        while (matcher.find()) {
            try {
                String code = matcher.group(3).trim().toUpperCase();
                String name = matcher.group(2).trim();
                String importRateStr = matcher.group(5).trim().replace(",", "");
                BigDecimal importRate = new BigDecimal(importRateStr);

                if (importRate.compareTo(BigDecimal.ZERO) > 0) {
                    rates.add(new ParsedRate(code, name, importRate, effectiveDate));
                }
            } catch (NumberFormatException e) {
                // Skip malformed rows
            }
        }

        // Fallback: try simpler pattern if strict pattern found nothing
        if (rates.isEmpty()) {
            Pattern simplePattern = Pattern.compile(
                    "([A-Z]{3})\\s*</td>\\s*<td[^>]*>\\s*([\\d.,]+)\\s*</td>\\s*<td[^>]*>\\s*([\\d.,]+)",
                    Pattern.CASE_INSENSITIVE
            );
            Matcher simpleMatcher = simplePattern.matcher(html);
            while (simpleMatcher.find()) {
                try {
                    String code = simpleMatcher.group(1).trim().toUpperCase();
                    String importRateStr = simpleMatcher.group(3).trim().replace(",", "");
                    BigDecimal importRate = new BigDecimal(importRateStr);

                    if (importRate.compareTo(BigDecimal.ZERO) > 0 && TARGET_CURRENCIES.contains(code)) {
                        rates.add(new ParsedRate(code, code, importRate, effectiveDate));
                    }
                } catch (NumberFormatException e) {
                    // Skip malformed entries
                }
            }
        }

        log.info("Parsed {} exchange rates from customs.go.th (effective: {})", rates.size(), effectiveDate);
        return rates;
    }

    private LocalDate extractEffectiveDate(String html) {
        // Try to find date in format dd/mm/yyyy or yyyy-mm-dd
        Pattern datePattern = Pattern.compile(
                "(\\d{1,2})/(\\d{1,2})/(\\d{4})"
        );
        Matcher matcher = datePattern.matcher(html);

        // Look for a date near "effective" or "ประจำวันที่" keywords
        int searchStart = html.indexOf("effective");
        if (searchStart < 0) searchStart = html.indexOf("ประจำวันที่");
        if (searchStart < 0) searchStart = html.indexOf("วันที่");
        if (searchStart < 0) searchStart = 0;

        String searchRegion = html.substring(searchStart, Math.min(searchStart + 500, html.length()));
        Matcher regionMatcher = datePattern.matcher(searchRegion);

        if (regionMatcher.find()) {
            try {
                int day = Integer.parseInt(regionMatcher.group(1));
                int month = Integer.parseInt(regionMatcher.group(2));
                int year = Integer.parseInt(regionMatcher.group(3));
                // Convert Buddhist Era to CE if needed
                if (year > 2500) year -= 543;
                return LocalDate.of(year, month, day);
            } catch (Exception e) {
                // Fall through
            }
        }
        return null;
    }

    private void upsertRate(ParsedRate parsed) {
        Optional<ExchangeRateEntity> existing = exchangeRateRepo
                .findLatestByCurrency(parsed.currencyCode);

        ExchangeRateEntity entity;
        if (existing.isPresent()) {
            entity = existing.get();
        } else {
            entity = new ExchangeRateEntity();
            entity.setCurrencyCode(parsed.currencyCode);
        }

        entity.setCurrencyName(parsed.currencyName);
        entity.setMidRate(parsed.importRate);
        entity.setEffectiveDate(parsed.effectiveDate);
        entity.setSource("CUSTOMS_DEPT");
        exchangeRateRepo.save(entity);
    }

    record ParsedRate(
            String currencyCode,
            String currencyName,
            BigDecimal importRate,
            LocalDate effectiveDate
    ) {}
}
