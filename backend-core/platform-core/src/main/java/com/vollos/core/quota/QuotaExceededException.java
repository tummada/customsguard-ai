package com.vollos.core.quota;

/**
 * Thrown when a tenant exceeds their subscription plan's usage quota.
 */
public class QuotaExceededException extends RuntimeException {

    private final String usageType;
    private final int currentCount;
    private final int limit;
    private final String planId;

    public QuotaExceededException(String usageType, int currentCount, int limit, String planId) {
        super("Quota exceeded for " + usageType + ": " + currentCount + "/" + limit + " (plan=" + planId + ")");
        this.usageType = usageType;
        this.currentCount = currentCount;
        this.limit = limit;
        this.planId = planId;
    }

    public String getUsageType() { return usageType; }
    public int getCurrentCount() { return currentCount; }
    public int getLimit() { return limit; }
    public String getPlanId() { return planId; }
}
