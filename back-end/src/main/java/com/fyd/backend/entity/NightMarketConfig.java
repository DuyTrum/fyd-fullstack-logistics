package com.fyd.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Entity to store Night Market configuration settings.
 */
@Entity
@Table(name = "night_market_configs")
public class NightMarketConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "min_offers")
    private Integer minOffers = 5;

    @Column(name = "max_offers")
    private Integer maxOffers = 8;

    @Column(name = "min_discount_percent")
    private Integer minDiscountPercent = 10;

    @Column(name = "max_discount_percent")
    private Integer maxDiscountPercent = 70;

    @Column(name = "offer_duration_days")
    private Integer offerDurationDays = 7;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Integer getMinOffers() { return minOffers; }
    public void setMinOffers(Integer minOffers) { this.minOffers = minOffers; }

    public Integer getMaxOffers() { return maxOffers; }
    public void setMaxOffers(Integer maxOffers) { this.maxOffers = maxOffers; }

    public Integer getMinDiscountPercent() { return minDiscountPercent; }
    public void setMinDiscountPercent(Integer minDiscountPercent) { this.minDiscountPercent = minDiscountPercent; }

    public Integer getMaxDiscountPercent() { return maxDiscountPercent; }
    public void setMaxDiscountPercent(Integer maxDiscountPercent) { this.maxDiscountPercent = maxDiscountPercent; }

    public Integer getOfferDurationDays() { return offerDurationDays; }
    public void setOfferDurationDays(Integer offerDurationDays) { this.offerDurationDays = offerDurationDays; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }

    public LocalDateTime getEndTime() { return endTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
