package com.fyd.backend.dto;

import java.util.List;
import java.util.Map;

public class AiMetricsDto {
    private Long totalRequests;
    private Integer activeFeaturesCount;
    private Double averageLatency;
    private Long totalTokens;
    private Double estimatedCost;
    private Double successRate;
    private Map<String, Long> usageByFeature;
    private List<Map<String, Object>> dailyUsage;

    public Long getTotalRequests() {
        return totalRequests;
    }

    public void setTotalRequests(Long totalRequests) {
        this.totalRequests = totalRequests;
    }

    public Integer getActiveFeaturesCount() {
        return activeFeaturesCount;
    }

    public void setActiveFeaturesCount(Integer activeFeaturesCount) {
        this.activeFeaturesCount = activeFeaturesCount;
    }

    public Double getAverageLatency() {
        return averageLatency;
    }

    public void setAverageLatency(Double averageLatency) {
        this.averageLatency = averageLatency;
    }

    public Long getTotalTokens() {
        return totalTokens;
    }

    public void setTotalTokens(Long totalTokens) {
        this.totalTokens = totalTokens;
    }

    public Double getEstimatedCost() {
        return estimatedCost;
    }

    public void setEstimatedCost(Double estimatedCost) {
        this.estimatedCost = estimatedCost;
    }

    public Double getSuccessRate() {
        return successRate;
    }

    public void setSuccessRate(Double successRate) {
        this.successRate = successRate;
    }

    public Map<String, Long> getUsageByFeature() {
        return usageByFeature;
    }

    public void setUsageByFeature(Map<String, Long> usageByFeature) {
        this.usageByFeature = usageByFeature;
    }

    public List<Map<String, Object>> getDailyUsage() {
        return dailyUsage;
    }

    public void setDailyUsage(List<Map<String, Object>> dailyUsage) {
        this.dailyUsage = dailyUsage;
    }
}
