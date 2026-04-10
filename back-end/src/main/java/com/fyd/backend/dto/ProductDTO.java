package com.fyd.backend.dto;

import com.fyd.backend.entity.Product;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class ProductDTO {
    private Long id;
    private String sku;
    private String name;
    private String slug;
    private String category;
    private Long categoryId;
    private String brand;
    private Long brandId;
    private BigDecimal basePrice;
    private BigDecimal salePrice;
    private String description;
    private String shortDescription;
    private String material;
    private String status;
    private Boolean isFeatured;
    private Boolean isNew;
    private Integer viewCount;
    private Integer soldCount;
    private Integer totalStock;
    private List<VariantDTO> variants;
    private List<ImageDTO> images;
    private String thumbnail;
    private Integer initialStock;
    private Long initialSizeId;
    private Long initialColorId;

    public static ProductDTO fromEntity(Product p) {
        ProductDTO dto = new ProductDTO();
        dto.setId(p.getId());
        dto.setSku(p.getSku());
        dto.setName(p.getName());
        dto.setSlug(p.getSlug());
        dto.setCategory(p.getCategory() != null ? p.getCategory().getName() : null);
        dto.setCategoryId(p.getCategory() != null ? p.getCategory().getId() : null);
        dto.setBrand(p.getBrand() != null ? p.getBrand().getName() : null);
        dto.setBrandId(p.getBrand() != null ? p.getBrand().getId() : null);
        dto.setBasePrice(p.getBasePrice());
        dto.setSalePrice(p.getSalePrice());
        dto.setDescription(p.getDescription());
        dto.setShortDescription(p.getShortDescription());
        dto.setMaterial(p.getMaterial());
        dto.setStatus(p.getStatus());
        dto.setIsFeatured(p.getIsFeatured());
        dto.setIsNew(p.getIsNew());
        dto.setViewCount(p.getViewCount());
        dto.setSoldCount(p.getSoldCount());
        
        if (p.getVariants() != null) {
            dto.setTotalStock(p.getVariants().stream()
                .mapToInt(v -> v.getStockQuantity() != null ? v.getStockQuantity() : 0)
                .sum());
            dto.setVariants(p.getVariants().stream()
                .map(VariantDTO::fromEntity)
                .collect(Collectors.toList()));
        }
        
        if (p.getImages() != null && !p.getImages().isEmpty()) {
            dto.setImages(p.getImages().stream()
                .map(ImageDTO::fromEntity)
                .collect(Collectors.toList()));
            dto.setThumbnail(p.getImages().stream()
                .filter(img -> Boolean.TRUE.equals(img.getIsPrimary()))
                .findFirst()
                .map(img -> img.getImageUrl())
                .orElse(p.getImages().get(0).getImageUrl()));
        }
        
        return dto;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }
    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }
    public Long getBrandId() { return brandId; }
    public void setBrandId(Long brandId) { this.brandId = brandId; }
    public BigDecimal getBasePrice() { return basePrice; }
    public void setBasePrice(BigDecimal basePrice) { this.basePrice = basePrice; }
    public BigDecimal getSalePrice() { return salePrice; }
    public void setSalePrice(BigDecimal salePrice) { this.salePrice = salePrice; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getShortDescription() { return shortDescription; }
    public void setShortDescription(String shortDescription) { this.shortDescription = shortDescription; }
    public String getMaterial() { return material; }
    public void setMaterial(String material) { this.material = material; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Boolean getIsFeatured() { return isFeatured; }
    public void setIsFeatured(Boolean isFeatured) { this.isFeatured = isFeatured; }
    public Boolean getIsNew() { return isNew; }
    public void setIsNew(Boolean isNew) { this.isNew = isNew; }
    public Integer getViewCount() { return viewCount; }
    public void setViewCount(Integer viewCount) { this.viewCount = viewCount; }
    public Integer getSoldCount() { return soldCount; }
    public void setSoldCount(Integer soldCount) { this.soldCount = soldCount; }
    public Integer getTotalStock() { return totalStock; }
    public void setTotalStock(Integer totalStock) { this.totalStock = totalStock; }
    public List<VariantDTO> getVariants() { return variants; }
    public void setVariants(List<VariantDTO> variants) { this.variants = variants; }
    public List<ImageDTO> getImages() { return images; }
    public void setImages(List<ImageDTO> images) { this.images = images; }
    public String getThumbnail() { return thumbnail; }
    public void setThumbnail(String thumbnail) { this.thumbnail = thumbnail; }
    public Integer getInitialStock() { return initialStock; }
    public void setInitialStock(Integer initialStock) { this.initialStock = initialStock; }
    public Long getInitialSizeId() { return initialSizeId; }
    public void setInitialSizeId(Long initialSizeId) { this.initialSizeId = initialSizeId; }
    public Long getInitialColorId() { return initialColorId; }
    public void setInitialColorId(Long initialColorId) { this.initialColorId = initialColorId; }
}
