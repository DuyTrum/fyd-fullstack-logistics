package com.fyd.backend.controller;

import com.fyd.backend.annotation.Loggable;
import com.fyd.backend.dto.ProductDTO;
import com.fyd.backend.entity.Product;
import com.fyd.backend.entity.ProductImage;
import com.fyd.backend.entity.ProductVariant;
import com.fyd.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    @Autowired
    private ProductRepository productRepository;
    
    @Autowired
    private ProductVariantRepository variantRepository;
    
    @Autowired
    private CategoryRepository categoryRepository;
    
    @Autowired
    private BrandRepository brandRepository;
    
    @Autowired
    private ProductImageRepository imageRepository;

    @Autowired
    private SizeRepository sizeRepository;

    @Autowired
    private ColorRepository colorRepository;
    
    @Autowired
    private com.fyd.backend.service.ActivityLogService activityLogService;
    
    @Autowired
    private com.fyd.backend.repository.UserRepository userRepository;
    
    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getProducts(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long brandId,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Long colorId,
            @RequestParam(required = false) Long sizeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        
        Sort sort = sortDir.equalsIgnoreCase("asc") 
            ? Sort.by(sortBy).ascending() 
            : Sort.by(sortBy).descending();
        PageRequest pageRequest = PageRequest.of(page, size, sort);
        
        Page<Product> productPage;
        
        // Check if any advanced filters are applied
        boolean hasAdvancedFilters = categoryId != null || brandId != null || 
            minPrice != null || maxPrice != null || colorId != null || sizeId != null;
        
        if (hasAdvancedFilters || !q.isEmpty()) {
            productPage = productRepository.advancedSearch(
                q.isEmpty() ? null : q,
                categoryId, brandId, minPrice, maxPrice, colorId, sizeId,
                pageRequest
            );
        } else {
            productPage = productRepository.findAll(pageRequest);
        }
        
        // Force load lazy collections within transaction
        List<ProductDTO> products = productPage.getContent().stream()
            .map(p -> {
                // Initialize lazy collections
                p.getVariants().size();
                p.getImages().size();
                return ProductDTO.fromEntity(p);
            })
            .collect(Collectors.toList());
        
        Map<String, Object> response = new HashMap<>();
        response.put("products", products);
        response.put("currentPage", productPage.getNumber());
        response.put("totalItems", productPage.getTotalElements());
        response.put("totalPages", productPage.getTotalPages());
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<ProductDTO> getProduct(@PathVariable Long id) {
        return productRepository.findById(id)
            .map(p -> {
                p.getVariants().size();
                p.getImages().size();
                return ProductDTO.fromEntity(p);
            })
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/sku/{sku}")
    @Transactional(readOnly = true)
    public ResponseEntity<ProductDTO> getProductBySku(@PathVariable String sku) {
        return productRepository.findBySku(sku)
            .map(p -> {
                p.getVariants().size();
                p.getImages().size();
                return ProductDTO.fromEntity(p);
            })
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Transactional
    @Loggable(action = "CREATE", entityType = "Product")
    public ResponseEntity<ProductDTO> createProduct(@RequestBody ProductDTO dto) {
        Product product = new Product();
        updateProductFromDTO(product, dto);
        product.setCreatedAt(LocalDateTime.now());
        Product saved = productRepository.save(product);
        
        // Always create at least one variant so it shows up in inventory
        ProductVariant variant = new ProductVariant();
        variant.setProduct(saved);
        variant.setSkuVariant(saved.getSku() + "-DEF");
        
        // Set size if provided
        if (dto.getInitialSizeId() != null) {
            sizeRepository.findById(dto.getInitialSizeId())
                .ifPresent(variant::setSize);
        }
        
        // Set color if provided
        if (dto.getInitialColorId() != null) {
            colorRepository.findById(dto.getInitialColorId())
                .ifPresent(variant::setColor);
        }
        
        variant.setStockQuantity(dto.getInitialStock() != null ? dto.getInitialStock() : 0);
        variant.setPriceAdjustment(BigDecimal.ZERO);
        variant.setCreatedAt(LocalDateTime.now());
        variant.setStatus("ACTIVE");
        variantRepository.save(variant);
        
        // Reload product to include variants
        saved = productRepository.findById(saved.getId()).orElse(saved);
        
        return ResponseEntity.ok(ProductDTO.fromEntity(saved));
    }

    @PutMapping("/{id}")
    @Loggable(action = "UPDATE", entityType = "Product")
    public ResponseEntity<ProductDTO> updateProduct(@PathVariable Long id, @RequestBody ProductDTO dto) {
        return productRepository.findById(id)
            .map(product -> {
                updateProductFromDTO(product, dto);
                product.setUpdatedAt(LocalDateTime.now());
                Product saved = productRepository.save(product);
                return ResponseEntity.ok(ProductDTO.fromEntity(saved));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Loggable(action = "DELETE", entityType = "Product")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id, jakarta.servlet.http.HttpServletRequest request) {
        // Get product info BEFORE checking existence to avoid transaction issues
        Product product = productRepository.findById(id).orElse(null);
        
        if (product == null) {
            System.out.println("=== Product not found: ID=" + id);
            return ResponseEntity.notFound().build();
        }
        
        // Store info before deleting
        String productName = product.getName();
        String productSku = product.getSku();
        Long productId = product.getId();
        
        System.out.println("=== Deleting product: ID=" + productId + ", SKU=" + productSku + ", Name=" + productName);
        
        // Delete the product
        try {
            productRepository.deleteById(id);
            System.out.println("=== Product deleted successfully");
            
            // Log activity AFTER successful deletion
            try {
                // Get current user from security context
                org.springframework.security.core.Authentication auth = 
                    org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                
                com.fyd.backend.entity.User user = null;
                if (auth != null && auth.getPrincipal() != null) {
                    String userId = auth.getPrincipal().toString();
                    user = userRepository.findById(Long.parseLong(userId)).orElse(null);
                }
                
                String ipAddress = request.getRemoteAddr();
                String userAgent = request.getHeader("User-Agent");
                String entityName = productName + " (SKU: " + productSku + ")";
                
                // Create a simple map for old data instead of passing the entity
                Map<String, Object> oldData = new HashMap<>();
                oldData.put("id", productId);
                oldData.put("name", productName);
                oldData.put("sku", productSku);
                
                activityLogService.logActivity(
                    user,
                    "DELETE",
                    "Product",
                    productId,
                    entityName,
                    oldData,
                    null,
                    ipAddress,
                    userAgent
                );
                System.out.println("=== Activity log created successfully");
            } catch (Exception e) {
                System.err.println("=== Failed to create activity log: " + e.getMessage());
                e.printStackTrace();
            }
            
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            System.err.println("=== Failed to delete product: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @PatchMapping("/{id}/stock")
    public ResponseEntity<ProductDTO> updateStock(
            @PathVariable Long id,
            @RequestParam Long variantId,
            @RequestParam int quantity) {
        return variantRepository.findById(variantId)
            .map(variant -> {
                variant.setStockQuantity(Math.max(0, variant.getStockQuantity() + quantity));
                variantRepository.save(variant);
                return productRepository.findById(id)
                    .map(ProductDTO::fromEntity)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/primary-image")
    @Transactional
    public ResponseEntity<ProductDTO> setPrimaryImage(
            @PathVariable Long id,
            @RequestParam Long imageId) {
        return productRepository.findById(id)
            .map(product -> {
                // Clear all primary flags for this product
                imageRepository.clearPrimaryByProductId(id);
                // Set the new primary image
                imageRepository.setPrimaryById(imageId);
                // Reload and return
                product.getImages().size(); // Force load
                return ResponseEntity.ok(ProductDTO.fromEntity(product));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/images")
    @Transactional
    public ResponseEntity<Map<String, Object>> uploadProductImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        
        return productRepository.findById(id)
            .map(product -> {
                try {
                    // Validate file
                    if (file.isEmpty()) {
                        return ResponseEntity.badRequest().<Map<String, Object>>body(Map.of("error", "File is empty"));
                    }
                    
                    // Create upload directory if not exists
                    Path uploadPath = Paths.get(uploadDir, "products");
                    if (!Files.exists(uploadPath)) {
                        Files.createDirectories(uploadPath);
                    }
                    
                    // Generate unique filename with .webp extension
                    String newFilename = "product_" + id + "_" + UUID.randomUUID().toString().substring(0, 8) + ".webp";
                    Path filePath = uploadPath.resolve(newFilename);

                    // Convert and compress to WebP
                    try (var inputStream = file.getInputStream()) {
                        BufferedImage image = ImageIO.read(inputStream);
                        if (image == null) {
                            return ResponseEntity.badRequest().<Map<String, Object>>body(Map.of("error", "Invalid or unsupported image format"));
                        }
                        
                        // Save as WebP
                        boolean written = ImageIO.write(image, "webp", filePath.toFile());
                        if (!written) {
                            // Fallback if webp writer is not found (though dependency should provide it)
                            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
                        }
                    }
                    
                    // Create ProductImage entity
                    ProductImage productImage = new ProductImage();
                    productImage.setProduct(product);
                    productImage.setImageUrl("/uploads/products/" + newFilename);
                    productImage.setSortOrder(product.getImages().size());
                    productImage.setIsPrimary(product.getImages().isEmpty()); // First image is primary
                    productImage.setCreatedAt(LocalDateTime.now());
                    
                    ProductImage savedImage = imageRepository.save(productImage);
                    
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", true);
                    response.put("imageId", savedImage.getId());
                    response.put("imageUrl", savedImage.getImageUrl());
                    
                    return ResponseEntity.ok(response);
                } catch (IOException e) {
                    return ResponseEntity.internalServerError().<Map<String, Object>>body(Map.of("error", "Upload failed: " + e.getMessage()));
                }
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{productId}/images/{imageId}")
    @Transactional
    public ResponseEntity<Void> deleteProductImage(
            @PathVariable Long productId,
            @PathVariable Long imageId) {
        return imageRepository.findById(imageId)
            .map(image -> {
                if (image.getProduct().getId().equals(productId)) {
                    imageRepository.delete(image);
                    return ResponseEntity.ok().<Void>build();
                }
                return ResponseEntity.badRequest().<Void>build();
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/list/featured")
    @Transactional(readOnly = true)
    public ResponseEntity<List<ProductDTO>> getFeaturedProducts() {
        List<ProductDTO> products = productRepository.findFeatured().stream()
            .map(p -> {
                p.getVariants().size();
                p.getImages().size();
                return ProductDTO.fromEntity(p);
            })
            .collect(Collectors.toList());
        return ResponseEntity.ok(products);
    }

    @GetMapping("/list/new")
    @Transactional(readOnly = true)
    public ResponseEntity<List<ProductDTO>> getNewProducts() {
        List<ProductDTO> products = productRepository.findNewArrivals().stream()
            .map(p -> {
                p.getVariants().size();
                p.getImages().size();
                return ProductDTO.fromEntity(p);
            })
            .collect(Collectors.toList());
        return ResponseEntity.ok(products);
    }

    @GetMapping("/list/top-selling")
    @Transactional(readOnly = true)
    public ResponseEntity<List<ProductDTO>> getTopSelling(@RequestParam(defaultValue = "10") int limit) {
        List<ProductDTO> products = productRepository.findTopSelling(PageRequest.of(0, limit)).stream()
            .map(p -> {
                p.getVariants().size();
                p.getImages().size();
                return ProductDTO.fromEntity(p);
            })
            .collect(Collectors.toList());
        return ResponseEntity.ok(products);
    }

    private void updateProductFromDTO(Product product, ProductDTO dto) {
        product.setSku(dto.getSku());
        product.setName(dto.getName());
        product.setSlug(dto.getSlug() != null ? dto.getSlug() : dto.getSku().toLowerCase());
        product.setBasePrice(dto.getBasePrice());
        product.setSalePrice(dto.getSalePrice());
        product.setDescription(dto.getDescription());
        product.setShortDescription(dto.getShortDescription());
        product.setMaterial(dto.getMaterial());
        product.setStatus(dto.getStatus() != null ? dto.getStatus() : "ACTIVE");
        product.setIsFeatured(dto.getIsFeatured() != null ? dto.getIsFeatured() : false);
        product.setIsNew(dto.getIsNew() != null ? dto.getIsNew() : false);

        if (dto.getCategoryId() != null) {
            categoryRepository.findById(dto.getCategoryId())
                .ifPresent(product::setCategory);
        }
        if (dto.getBrandId() != null) {
            brandRepository.findById(dto.getBrandId())
                .ifPresent(product::setBrand);
        }
    }
}
