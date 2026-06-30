package com.fyd.backend.repository;

import com.fyd.backend.entity.AiUsageLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Repository
public interface AiUsageLogRepository extends JpaRepository<AiUsageLog, Long> {

    Page<AiUsageLog> findAllByOrderByTimestampDesc(Pageable pageable);

    @Query("SELECT al FROM AiUsageLog al WHERE " +
           "(:feature IS NULL OR al.feature = :feature) AND " +
           "(:status IS NULL OR al.status = :status) " +
           "ORDER BY al.timestamp DESC")
    Page<AiUsageLog> findWithFilters(
        @Param("feature") String feature,
        @Param("status") String status,
        Pageable pageable
    );

    @Query("SELECT COUNT(al) FROM AiUsageLog al")
    Long countTotalRequests();

    @Query("SELECT COUNT(al) FROM AiUsageLog al WHERE al.status = 'SUCCESS'")
    Long countSuccessRequests();

    @Query("SELECT AVG(al.latencyMs) FROM AiUsageLog al WHERE al.status = 'SUCCESS'")
    Double getAverageLatency();

    @Query("SELECT SUM(al.totalTokens) FROM AiUsageLog al")
    Long sumTotalTokens();

    @Query("SELECT SUM(al.estimatedCostUsd) FROM AiUsageLog al")
    Double sumTotalCost();

    @Query("SELECT SUM(al.estimatedCostUsd) FROM AiUsageLog al WHERE al.timestamp >= :since")
    Double sumTotalCostSince(@Param("since") LocalDateTime since);

    @Query("SELECT al.feature as feature, COUNT(al) as count FROM AiUsageLog al GROUP BY al.feature")
    List<Map<String, Object>> countRequestsByFeature();

    @Query("SELECT DATE(al.timestamp) as date, COUNT(al) as count, SUM(al.totalTokens) as tokens, SUM(al.estimatedCostUsd) as cost " +
           "FROM AiUsageLog al " +
           "WHERE al.timestamp >= :since " +
           "GROUP BY DATE(al.timestamp) " +
           "ORDER BY DATE(al.timestamp) ASC")
    List<Map<String, Object>> getDailyUsageMetrics(@Param("since") LocalDateTime since);
}
