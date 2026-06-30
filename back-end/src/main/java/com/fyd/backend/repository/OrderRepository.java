package com.fyd.backend.repository;

import com.fyd.backend.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    Optional<Order> findByOrderCode(String orderCode);
    
    Optional<Order> findByTrackingNumber(String trackingNumber);
    
    List<Order> findByStatus(String status);
    
    List<Order> findByCustomerId(Long customerId);
    
    Page<Order> findByCustomerId(Long customerId, Pageable pageable);
    
    @Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items WHERE o.customer.id = :customerId")
    List<Order> findByCustomerIdWithItems(@Param("customerId") Long customerId);
    
    @Query("SELECT o FROM Order o WHERE " +
           "(LOWER(o.orderCode) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(o.shippingName) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(o.shippingPhone) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<Order> search(@Param("q") String q, Pageable pageable);
    
    @Query("SELECT o FROM Order o WHERE o.status = :status")
    Page<Order> findByStatus(@Param("status") String status, Pageable pageable);
    
    @Query("SELECT COUNT(o) FROM Order o WHERE o.status = :status")
    Long countByStatus(@Param("status") String status);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.createdAt >= :from")
    Long countFrom(@Param("from") LocalDateTime from);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.status = :status AND o.createdAt >= :from")
    Long countByStatusFrom(@Param("status") String status, @Param("from") LocalDateTime from);
    
    @Query("SELECT SUM(o.totalAmount) FROM Order o WHERE o.status = 'DELIVERED' OR o.status = 'COMPLETED'")
    BigDecimal getTotalRevenue();
    
    @Query("SELECT SUM(o.totalAmount) FROM Order o WHERE (o.status = 'DELIVERED' OR o.status = 'COMPLETED') AND o.createdAt >= :from")
    BigDecimal getRevenueFrom(@Param("from") LocalDateTime from);
    
    @Query("SELECT SUM(o.totalAmount) FROM Order o WHERE (o.status = 'DELIVERED' OR o.status = 'COMPLETED') AND o.createdAt BETWEEN :from AND :to")
    BigDecimal getRevenueBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
    
    @Query("SELECT o FROM Order o WHERE o.createdAt >= :from ORDER BY o.createdAt DESC")
    List<Order> findRecentOrders(@Param("from") LocalDateTime from);
    
    @Query(value = "SELECT DATE(o.created_at) as date, SUM(o.total_amount) as total FROM orders o " +
           "WHERE (o.status = 'DELIVERED' OR o.status = 'COMPLETED') AND o.created_at >= :from " +
           "GROUP BY DATE(o.created_at) ORDER BY date", nativeQuery = true)
    List<Object[]> getDailyRevenue(@Param("from") LocalDateTime from);
    
    // Check if customer has purchased a specific product (for verified review)
    @Query("SELECT CASE WHEN COUNT(oi) > 0 THEN true ELSE false END FROM OrderItem oi " +
           "JOIN oi.order o WHERE o.customer.id = :customerId " +
           "AND oi.product.id = :productId AND (o.status = 'DELIVERED' OR o.status = 'COMPLETED')")
    boolean existsByCustomerIdAndProductId(@Param("customerId") Long customerId, @Param("productId") Long productId);

    @Query(value = "SELECT DAYOFWEEK(o.created_at) as dow, HOUR(o.created_at) as hr, COUNT(o.id) as order_count " +
           "FROM orders o WHERE o.status = 'DELIVERED' OR o.status = 'COMPLETED' " +
           "GROUP BY dow, hr ORDER BY order_count DESC LIMIT 1", nativeQuery = true)
    List<Object[]> getPeakSalesPeriod();

    @Query("SELECT c.tier.name, AVG(o.totalAmount), COUNT(o.id) " +
           "FROM Order o JOIN o.customer c " +
           "WHERE o.status = 'DELIVERED' OR o.status = 'COMPLETED' " +
           "GROUP BY c.tier.name")
    List<Object[]> getSpendingByTier();

    long countByPromotionCodeIgnoreCase(String promotionCode);
}

