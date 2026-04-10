package com.fyd.backend.repository;

import com.fyd.backend.entity.Customer;
import com.fyd.backend.entity.NightMarketOffer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NightMarketOfferRepository extends JpaRepository<NightMarketOffer, Long> {
    List<NightMarketOffer> findByCustomer(Customer customer);
    
    void deleteByCustomer(Customer customer);

    @Modifying
    @Query(value = "UPDATE night_market_customer_offers SET discount_percent = (FLOOR(RAND() * (:max - :min + 1)) + :min) WHERE is_revealed = false OR is_revealed IS NULL", nativeQuery = true)
    int updateUnrevealedDiscounts(@Param("min") int min, @Param("max") int max);
}
