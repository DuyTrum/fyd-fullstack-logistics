package com.fyd.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "flash_sale_configs")
public class FlashSaleConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Column(name = "is_active")
    private Boolean isActive = false;

    @Column(name = "discount_label", length = 100)
    private String discountLabel; // e.g. "FLASH SALE 9.9"

    @Version
    @Column(name = "version")
    private Long version = 0L; // Optimistic locking

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "flashSaleConfig", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<FlashSaleItem> items = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Check if flash sale is currently running
    public boolean isRunning() {
        if (!Boolean.TRUE.equals(isActive)) return false;
        LocalDateTime now = LocalDateTime.now();
        return !now.isBefore(startTime) && !now.isAfter(endTime);
    }

    // Check if flash sale hasn't started yet
    public boolean isUpcoming() {
        if (!Boolean.TRUE.equals(isActive)) return false;
        return LocalDateTime.now().isBefore(startTime);
    }

    // Check if flash sale has ended
    public boolean isEnded() {
        return LocalDateTime.now().isAfter(endTime);
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }
    public LocalDateTime getEndTime() { return endTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    public String getDiscountLabel() { return discountLabel; }
    public void setDiscountLabel(String discountLabel) { this.discountLabel = discountLabel; }
    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public List<FlashSaleItem> getItems() { return items; }
    public void setItems(List<FlashSaleItem> items) { this.items = items; }
}
