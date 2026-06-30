package com.fyd.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity for customer_coupons table.
 * Represents a discount coupon that is bound to a specific customer.
 */
@Entity
@Table(name = "customer_coupons")
public class CustomerCoupon {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "program_id")
    private LuckySpinProgram program;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reward_id")
    private LuckySpinReward reward;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "discount_type", nullable = false, length = 20)
    private String discountType; // PERCENT, FIXED

    @Column(name = "discount_value", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountValue;

    @Column(name = "max_discount", precision = 12, scale = 2)
    private BigDecimal maxDiscount;

    @Column(name = "min_order_amount", precision = 12, scale = 2)
    private BigDecimal minOrderAmount = BigDecimal.ZERO;

    @Column(name = "expired_at", nullable = false)
    private LocalDateTime expiredAt;

    @Column(length = 20)
    private String status = "ACTIVE"; // ACTIVE, USED, EXPIRED

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "used_order_id")
    private Order usedOrder;

    /**
     * Event type that generated this coupon (null if from Lucky Spin)
     */
    @Column(name = "event_type", length = 30)
    private String eventType;



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

    /**
     * Check if coupon is currently valid for use
     */
    public boolean isValid() {
        if (!"ACTIVE".equals(status)) return false;
        return LocalDateTime.now().isBefore(expiredAt);
    }

    /**
     * Check if coupon qualifies for the given order amount
     */
    public boolean qualifiesForAmount(BigDecimal orderAmount) {
        if (minOrderAmount == null) return true;
        return orderAmount.compareTo(minOrderAmount) >= 0;
    }

    /**
     * Calculate discount amount for given order subtotal
     */
    public BigDecimal calculateDiscount(BigDecimal orderSubtotal) {
        if (!qualifiesForAmount(orderSubtotal)) {
            return BigDecimal.ZERO;
        }

        BigDecimal discount;
        if ("PERCENT".equals(discountType)) {
            discount = orderSubtotal.multiply(discountValue).divide(BigDecimal.valueOf(100));
            if (maxDiscount != null && discount.compareTo(maxDiscount) > 0) {
                discount = maxDiscount;
            }
        } else {
            discount = discountValue;
        }

        // Discount cannot exceed order subtotal
        if (discount.compareTo(orderSubtotal) > 0) {
            discount = orderSubtotal;
        }

        return discount;
    }

    /**
     * Mark coupon as used
     */
    public void markAsUsed(Order order) {
        this.status = "USED";
        this.usedAt = LocalDateTime.now();
        this.usedOrder = order;
    }

    /**
     * Mark coupon as expired
     */
    public void markAsExpired() {
        this.status = "EXPIRED";
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }

    public LuckySpinProgram getProgram() { return program; }
    public void setProgram(LuckySpinProgram program) { this.program = program; }

    public LuckySpinReward getReward() { return reward; }
    public void setReward(LuckySpinReward reward) { this.reward = reward; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getDiscountType() { return discountType; }
    public void setDiscountType(String discountType) { this.discountType = discountType; }

    public BigDecimal getDiscountValue() { return discountValue; }
    public void setDiscountValue(BigDecimal discountValue) { this.discountValue = discountValue; }

    public BigDecimal getMaxDiscount() { return maxDiscount; }
    public void setMaxDiscount(BigDecimal maxDiscount) { this.maxDiscount = maxDiscount; }

    public BigDecimal getMinOrderAmount() { return minOrderAmount; }
    public void setMinOrderAmount(BigDecimal minOrderAmount) { this.minOrderAmount = minOrderAmount; }

    public LocalDateTime getExpiredAt() { return expiredAt; }
    public void setExpiredAt(LocalDateTime expiredAt) { this.expiredAt = expiredAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getUsedAt() { return usedAt; }
    public void setUsedAt(LocalDateTime usedAt) { this.usedAt = usedAt; }

    public Order getUsedOrder() { return usedOrder; }
    public void setUsedOrder(Order usedOrder) { this.usedOrder = usedOrder; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }


}
