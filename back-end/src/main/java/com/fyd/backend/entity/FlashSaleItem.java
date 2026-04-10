package com.fyd.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "flash_sale_items", uniqueConstraints = {
    @UniqueConstraint(name = "uk_flash_sale_product_variant", columnNames = {"flash_sale_config_id", "product_id", "variant_id"})
}, indexes = {
    @Index(name = "idx_flash_sale_lookup", columnList = "flash_sale_config_id, product_id")
})
public class FlashSaleItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "flash_sale_config_id", nullable = false)
    private FlashSaleConfig flashSaleConfig;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "variant_id")
    private ProductVariant variant;

    @Column(name = "sale_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal salePrice;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public FlashSaleConfig getFlashSaleConfig() { return flashSaleConfig; }
    public void setFlashSaleConfig(FlashSaleConfig flashSaleConfig) { this.flashSaleConfig = flashSaleConfig; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public BigDecimal getSalePrice() { return salePrice; }
    public void setSalePrice(BigDecimal salePrice) { this.salePrice = salePrice; }
    public ProductVariant getVariant() { return variant; }
    public void setVariant(ProductVariant variant) { this.variant = variant; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
