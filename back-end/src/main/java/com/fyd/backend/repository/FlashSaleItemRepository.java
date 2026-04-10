package com.fyd.backend.repository;

import com.fyd.backend.entity.FlashSaleItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FlashSaleItemRepository extends JpaRepository<FlashSaleItem, Long> {

    List<FlashSaleItem> findByFlashSaleConfigId(Long configId);

    @Query("SELECT i FROM FlashSaleItem i WHERE i.flashSaleConfig.id = :configId AND i.product.id = :productId")
    java.util.Optional<FlashSaleItem> findByConfigIdAndProductId(@Param("configId") Long configId, @Param("productId") Long productId);

    boolean existsByFlashSaleConfigIdAndProductId(Long configId, Long productId);

    void deleteByFlashSaleConfigIdAndProductId(Long configId, Long productId);

    @Query("SELECT i FROM FlashSaleItem i " +
           "JOIN FETCH i.product p " +
           "LEFT JOIN FETCH p.images " +
           "WHERE i.flashSaleConfig.id = :configId")
    List<FlashSaleItem> findItemsWithProductsByConfigId(@Param("configId") Long configId);
}
