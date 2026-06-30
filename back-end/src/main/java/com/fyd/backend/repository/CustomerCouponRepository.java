package com.fyd.backend.repository;

import com.fyd.backend.entity.CustomerCoupon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for CustomerCoupon entity.
 */
@Repository
public interface CustomerCouponRepository extends JpaRepository<CustomerCoupon, Long> {

    /**
     * Find coupons by customer ID and status
     */
    List<CustomerCoupon> findByCustomerIdAndStatusOrderByCreatedAtDesc(Long customerId, String status);

    /**
     * Find all coupons for a customer
     */
    List<CustomerCoupon> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    /**
     * Find coupon by code and customer ID (for validation)
     */
    Optional<CustomerCoupon> findByCodeAndCustomerId(String code, Long customerId);

    /**
     * Find coupon by code only
     */
    Optional<CustomerCoupon> findByCode(String code);

    /**
     * Find all ACTIVE coupons that have expired (for scheduled job)
     */
    @Query("SELECT c FROM CustomerCoupon c WHERE c.status = 'ACTIVE' AND c.expiredAt < :now")
    List<CustomerCoupon> findExpiredActiveCoupons(LocalDateTime now);

    /**
     * Count active coupons by customer
     */
    int countByCustomerIdAndStatus(Long customerId, String status);

    /**
     * Check if coupon code exists
     */
    boolean existsByCode(String code);

    /**
     * Check if customer already has a coupon for specific event type this year
     */
    @Query("SELECT COUNT(c) > 0 FROM CustomerCoupon c WHERE c.customer.id = :customerId " +
           "AND c.eventType = :eventType AND YEAR(c.createdAt) = :year")
    boolean existsByCustomerAndEventTypeInYear(Long customerId, String eventType, int year);
}
