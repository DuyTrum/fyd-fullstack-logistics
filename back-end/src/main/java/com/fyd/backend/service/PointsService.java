package com.fyd.backend.service;

import com.fyd.backend.entity.Customer;
import com.fyd.backend.entity.CustomerTier;
import com.fyd.backend.repository.CustomerRepository;
import com.fyd.backend.repository.CustomerTierRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class PointsService {

    private static final int POINTS_PER_10K = 1; // 10,000 VND = 1 point
    private static final int VND_PER_POINT = 1000; // 1 point = 1,000 VND discount

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private CustomerTierRepository tierRepository;

    /**
     * Calculate points earned from order amount
     * 10,000 VND = 1 point
     */
    public int calculatePointsEarned(BigDecimal orderAmount) {
        return orderAmount.divide(BigDecimal.valueOf(10000)).intValue() * POINTS_PER_10K;
    }

    /**
     * Calculate discount amount from points
     * 1 point = 1,000 VND
     */
    public BigDecimal calculatePointsDiscount(int points) {
        return BigDecimal.valueOf(points * VND_PER_POINT);
    }

    /**
     * Get max points customer can use for an order
     */
    public int getMaxUsablePoints(Customer customer, BigDecimal orderSubtotal) {
        int availablePoints = customer.getPoints() != null ? customer.getPoints() : 0;
        // Max discount is 50% of order subtotal
        int maxPointsByOrder = orderSubtotal.divide(BigDecimal.valueOf(2)).divide(BigDecimal.valueOf(VND_PER_POINT)).intValue();
        return Math.min(availablePoints, maxPointsByOrder);
    }

    /**
     * Add earned points to customer and update total
     */
    @Transactional
    public void earnPoints(Customer customer, int pointsEarned) {
        int currentPoints = customer.getPoints() != null ? customer.getPoints() : 0;
        int currentTotal = customer.getTotalPoints() != null ? customer.getTotalPoints() : 0;
        
        customer.setPoints(currentPoints + pointsEarned);
        customer.setTotalPoints(currentTotal + pointsEarned);
        
        customerRepository.save(customer);
        
        // Check and upgrade tier
        checkAndUpgradeTier(customer);
    }

    /**
     * Use points for discount
     */
    @Transactional
    public void usePoints(Customer customer, int pointsToUse) {
        int currentPoints = customer.getPoints() != null ? customer.getPoints() : 0;
        if (pointsToUse > currentPoints) {
            throw new IllegalArgumentException("Insufficient points");
        }
        customer.setPoints(currentPoints - pointsToUse);
        customerRepository.save(customer);
    }

    /**
     * Check if customer qualifies for tier upgrade and perform upgrade
     */
    @Transactional
    public void checkAndUpgradeTier(Customer customer) {
        int totalPoints = customer.getTotalPoints() != null ? customer.getTotalPoints() : 0;
        
        List<CustomerTier> tiers = tierRepository.findAllByOrderBySortOrderDesc();
        
        for (CustomerTier tier : tiers) {
            int minPoints = tier.getMinPoints() != null ? tier.getMinPoints() : 0;
            if (totalPoints >= minPoints) {
                if (customer.getTier() == null || !customer.getTier().getId().equals(tier.getId())) {
                    customer.setTier(tier);
                    customerRepository.save(customer);
                }
                break;
            }
        }
    }

    /**
     * Get customer's current tier discount percent
     */
    public BigDecimal getTierDiscountPercent(Customer customer) {
        if (customer.getTier() != null && customer.getTier().getDiscountPercent() != null) {
            return customer.getTier().getDiscountPercent();
        }
        return BigDecimal.ZERO;
    }

    /**
     * Refund used points to customer balance (e.g. on order cancellation)
     */
    @Transactional
    public void refundPoints(Customer customer, int pointsToRefund) {
        if (customer == null) {
            System.err.println("Warning: Cannot refund " + pointsToRefund + " points to a null customer.");
            return;
        }
        if (pointsToRefund <= 0) return;
        
        int currentPoints = customer.getPoints() != null ? customer.getPoints() : 0;
        customer.setPoints(currentPoints + pointsToRefund);
        customerRepository.save(customer);
        System.out.println("Refunded " + pointsToRefund + " points to customer " + customer.getId());
    }

    /**
     * Calculate tier discount for order
     */
    public BigDecimal calculateTierDiscount(Customer customer, BigDecimal orderSubtotal) {
        BigDecimal discountPercent = getTierDiscountPercent(customer);
        return orderSubtotal.multiply(discountPercent).divide(BigDecimal.valueOf(100));
    }
}
