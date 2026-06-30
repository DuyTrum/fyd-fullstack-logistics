package com.fyd.backend.repository;

import com.fyd.backend.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    
    // Find reviews by product
    List<Review> findByProductIdAndStatus(Long productId, String status);
    
    @Query("SELECT r FROM Review r WHERE r.product.id = :productId ORDER BY r.createdAt DESC")
    List<Review> findByProductId(@Param("productId") Long productId);
    
    // Find reviews by customer
    List<Review> findByCustomerId(Long customerId);
    
    // Find reviews by status (for admin moderation)
    Page<Review> findByStatus(String status, Pageable pageable);
    
    // Find all reviews with pagination
    @Query("SELECT r FROM Review r ORDER BY r.createdAt DESC")
    Page<Review> findAllOrdered(Pageable pageable);
    
    // Count reviews by product
    @Query("SELECT COUNT(r) FROM Review r WHERE r.product.id = :productId AND r.status = 'APPROVED'")
    Long countApprovedByProductId(@Param("productId") Long productId);
    
    // Average rating by product
    @Query("SELECT COALESCE(AVG(r.rating), 0) FROM Review r WHERE r.product.id = :productId AND r.status = 'APPROVED'")
    Double getAverageRatingByProductId(@Param("productId") Long productId);
    
    // Check if customer already reviewed product
    boolean existsByProductIdAndCustomerId(Long productId, Long customerId);
    
    // Count pending reviews
    @Query("SELECT COUNT(r) FROM Review r WHERE r.status = 'PENDING'")
    Long countPending();

    @Query("SELECT COUNT(r) FROM Review r WHERE r.status = 'APPROVED'")
    Long countApproved();

    @Query("SELECT COUNT(r) FROM Review r WHERE r.status = 'REJECTED'")
    Long countRejected();

    @Query("SELECT COALESCE(AVG(r.rating), 0) FROM Review r")
    Double getAverageRating();
    
    // Search reviews
    @Query("SELECT r FROM Review r WHERE " +
           "(LOWER(r.content) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(r.title) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(r.product.name) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(r.customer.fullName) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<Review> search(@Param("q") String q, Pageable pageable);

    @Query("SELECT r FROM Review r WHERE r.product.id = :productId AND r.status = 'APPROVED' " +
           "AND (:rating IS NULL OR r.rating = :rating) " +
           "AND (:hasPhotos IS NULL OR (:hasPhotos = true AND r.imageUrls IS NOT NULL AND r.imageUrls <> '' AND r.imageUrls <> '[]'))")
    Page<Review> findProductReviews(
            @Param("productId") Long productId,
            @Param("rating") Integer rating,
            @Param("hasPhotos") Boolean hasPhotos,
            Pageable pageable);

    // Advanced admin filtering
    @Query("SELECT r FROM Review r WHERE " +
           "(:status IS NULL OR r.status = :status) AND " +
           "(:rating IS NULL OR r.rating = :rating) AND " +
           "(:productId IS NULL OR r.product.id = :productId) AND " +
           "(:startDate IS NULL OR r.createdAt >= :startDate) AND " +
           "(:endDate IS NULL OR r.createdAt <= :endDate) AND " +
           "(:q IS NULL OR :q = '' OR " +
           " LOWER(r.content) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           " LOWER(r.title) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           " LOWER(r.product.name) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           " LOWER(r.customer.fullName) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<Review> adminSearch(
            @Param("q") String q,
            @Param("status") String status,
            @Param("rating") Integer rating,
            @Param("productId") Long productId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);
}
