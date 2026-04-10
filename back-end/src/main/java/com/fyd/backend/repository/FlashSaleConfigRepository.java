package com.fyd.backend.repository;

import com.fyd.backend.entity.FlashSaleConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FlashSaleConfigRepository extends JpaRepository<FlashSaleConfig, Long> {
    
    @Query("SELECT c FROM FlashSaleConfig c WHERE c.isActive = true AND c.startTime <= :now AND c.endTime >= :now ORDER BY c.startTime DESC")
    List<FlashSaleConfig> findActiveRunning(@Param("now") java.time.LocalDateTime now);

    @Query("SELECT c FROM FlashSaleConfig c WHERE c.isActive = true AND c.startTime <= :now AND c.endTime >= :now ORDER BY c.startTime DESC")
    List<FlashSaleConfig> findActiveRunningPaged(@Param("now") java.time.LocalDateTime now, Pageable pageable);

    default Optional<FlashSaleConfig> findFirstActiveRunning(java.time.LocalDateTime now) {
        List<FlashSaleConfig> result = findActiveRunningPaged(now, Pageable.ofSize(1));
        return result.isEmpty() ? Optional.empty() : Optional.of(result.get(0));
    }

    List<FlashSaleConfig> findAllByOrderByCreatedAtDesc();
}
