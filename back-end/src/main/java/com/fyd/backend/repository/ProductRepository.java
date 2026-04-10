package com.fyd.backend.repository;

import com.fyd.backend.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findBySku(String sku);
    Optional<Product> findBySlug(String slug);
    boolean existsBySku(String sku);
    
    @Query("SELECT p FROM Product p WHERE p.status = 'ACTIVE'")
    List<Product> findAllActive();
    
    @Query("SELECT p FROM Product p WHERE p.isFeatured = true AND p.status = 'ACTIVE'")
    List<Product> findFeatured();
    
    @Query("SELECT p FROM Product p WHERE p.isNew = true AND p.status = 'ACTIVE'")
    List<Product> findNewArrivals();
    
    @Query("SELECT p FROM Product p WHERE p.category.id = :categoryId AND p.status = 'ACTIVE'")
    List<Product> findByCategory(@Param("categoryId") Long categoryId);
    
    @Query("SELECT p FROM Product p WHERE " +
           "(LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(p.sku) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(p.category.name) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<Product> search(@Param("q") String q, Pageable pageable);
    
    @Query("SELECT DISTINCT p FROM Product p " +
           "LEFT JOIN p.variants v " +
           "WHERE p.status = 'ACTIVE' " +
           "AND (:q IS NULL OR :q = '' OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :q, '%'))) " +
           "AND (:categoryId IS NULL OR p.category.id = :categoryId) " +
           "AND (:brandId IS NULL OR p.brand.id = :brandId) " +
           "AND (:minPrice IS NULL OR p.basePrice >= :minPrice) " +
           "AND (:maxPrice IS NULL OR p.basePrice <= :maxPrice) " +
           "AND (:colorId IS NULL OR v.color.id = :colorId) " +
           "AND (:sizeId IS NULL OR v.size.id = :sizeId)")
    Page<Product> advancedSearch(
        @Param("q") String q,
        @Param("categoryId") Long categoryId,
        @Param("brandId") Long brandId,
        @Param("minPrice") java.math.BigDecimal minPrice,
        @Param("maxPrice") java.math.BigDecimal maxPrice,
        @Param("colorId") Long colorId,
        @Param("sizeId") Long sizeId,
        Pageable pageable
    );
    
    @Query("SELECT p FROM Product p ORDER BY p.soldCount DESC")
    List<Product> findTopSelling(Pageable pageable);

    @Query("SELECT COUNT(p) FROM Product p WHERE p.updatedAt >= :from")
    Long countUpdatedFrom(@Param("from") java.time.LocalDateTime from);
}
