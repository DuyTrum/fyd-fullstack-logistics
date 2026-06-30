package com.fyd.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_configs")
public class AiConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String provider; // groq, openai, gemini, anthropic

    @Column(name = "api_key", length = 512)
    private String apiKey;

    @Column(name = "model_name", nullable = false, length = 100)
    private String modelName;

    @Column(nullable = false)
    private Double temperature = 0.7;

    @Column(name = "max_tokens", nullable = false)
    private Integer maxTokens = 2048;

    @Column(name = "monthly_budget_usd", nullable = false)
    private Double monthlyBudgetUsd = 100.0;

    @Column(name = "current_monthly_spend_usd", nullable = false)
    private Double currentMonthlySpendUsd = 0.0;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getModelName() {
        return modelName;
    }

    public void setModelName(String modelName) {
        this.modelName = modelName;
    }

    public Double getTemperature() {
        return temperature;
    }

    public void setTemperature(Double temperature) {
        this.temperature = temperature;
    }

    public Integer getMaxTokens() {
        return maxTokens;
    }

    public void setMaxTokens(Integer maxTokens) {
        this.maxTokens = maxTokens;
    }

    public Double getMonthlyBudgetUsd() {
        return monthlyBudgetUsd;
    }

    public void setMonthlyBudgetUsd(Double monthlyBudgetUsd) {
        this.monthlyBudgetUsd = monthlyBudgetUsd;
    }

    public Double getCurrentMonthlySpendUsd() {
        return currentMonthlySpendUsd;
    }

    public void setCurrentMonthlySpendUsd(Double currentMonthlySpendUsd) {
        this.currentMonthlySpendUsd = currentMonthlySpendUsd;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
