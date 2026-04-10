package com.fyd.backend.service;

import com.fyd.backend.dto.ProductDTO;
import com.fyd.backend.entity.FlashSaleConfig;
import com.fyd.backend.entity.FlashSaleItem;
import com.fyd.backend.entity.Product;
import com.fyd.backend.repository.FlashSaleConfigRepository;
import com.fyd.backend.repository.FlashSaleItemRepository;
import com.fyd.backend.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class FlashSaleService {

    @Autowired
    private FlashSaleConfigRepository configRepository;

    @Autowired
    private FlashSaleItemRepository itemRepository;

    @Autowired
    private ProductRepository productRepository;

    // ============ ADMIN METHODS ============

    @Transactional(readOnly = true)
    public List<FlashSaleConfig> getAllConfigs() {
        return configRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public Optional<FlashSaleConfig> getConfig(Long id) {
        return configRepository.findById(id);
    }

    @Transactional
    public FlashSaleConfig saveConfig(FlashSaleConfig config) {
        return configRepository.save(config);
    }

    @Transactional
    public void deleteConfig(Long id) {
        configRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<FlashSaleItem> getItems(Long configId) {
        return itemRepository.findItemsWithProductsByConfigId(configId);
    }

    @Transactional
    public FlashSaleItem addItem(Long configId, Long productId, BigDecimal salePrice) {
        FlashSaleConfig config = configRepository.findById(configId)
                .orElseThrow(() -> new IllegalArgumentException("Flash Sale config not found"));
        
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));

        if (itemRepository.existsByFlashSaleConfigIdAndProductId(configId, productId)) {
            throw new IllegalStateException("Product already exists in this Flash Sale");
        }

        FlashSaleItem item = new FlashSaleItem();
        item.setFlashSaleConfig(config);
        item.setProduct(product);
        item.setSalePrice(salePrice);

        return itemRepository.save(item);
    }

    @Transactional
    public void deleteItem(Long id) {
        itemRepository.deleteById(id);
    }

    @Transactional
    public FlashSaleItem updateItemPrice(Long id, BigDecimal salePrice) {
        FlashSaleItem item = itemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Flash Sale item not found"));
        item.setSalePrice(salePrice);
        return itemRepository.save(item);
    }

    // ============ PUBLIC METHODS ============

    @Transactional(readOnly = true)
    public Map<String, Object> getActiveFlashSaleResponse() {
        Map<String, Object> response = new LinkedHashMap<>();
        LocalDateTime now = LocalDateTime.now();
        response.put("serverTime", now);

        // 1. Try to find the active campaign
        Optional<FlashSaleConfig> activeConfigOpt = configRepository.findFirstActiveRunning(now);

        if (activeConfigOpt.isPresent()) {
            FlashSaleConfig config = activeConfigOpt.get();
            response.put("status", "RUNNING");
            response.put("config", serializeConfig(config));
            response.put("products", fetchAndSerializeItems(config.getId()));
            response.put("legacy", false);
            return response;
        }

        // 2. Check for upcoming
        List<FlashSaleConfig> allConfigs = configRepository.findAllByOrderByCreatedAtDesc();
        Optional<FlashSaleConfig> upcomingOpt = allConfigs.stream()
                .filter(c -> Boolean.TRUE.equals(c.getIsActive()) && c.isUpcoming())
                .findFirst();

        if (upcomingOpt.isPresent()) {
            FlashSaleConfig config = upcomingOpt.get();
            response.put("status", "UPCOMING");
            response.put("config", serializeConfig(config));
            response.put("products", Collections.emptyList());
            response.put("legacy", false);
            return response;
        }

        response.put("status", "NONE");
        return response;
    }

    private Map<String, Object> serializeConfig(FlashSaleConfig config) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", config.getId());
        map.put("name", config.getName());
        map.put("startTime", config.getStartTime());
        map.put("endTime", config.getEndTime());
        map.put("discountLabel", config.getDiscountLabel());
        return map;
    }

    private List<Map<String, Object>> fetchAndSerializeItems(Long configId) {
        List<FlashSaleItem> items = itemRepository.findItemsWithProductsByConfigId(configId);
        return items.stream().map(item -> {
            Product p = item.getProduct();
            ProductDTO dto = ProductDTO.fromEntity(p);
            Map<String, Object> pMap = new LinkedHashMap<>();
            pMap.put("id", p.getId());
            pMap.put("sku", p.getSku());
            pMap.put("name", p.getName());
            pMap.put("slug", p.getSlug());
            pMap.put("basePrice", p.getBasePrice());
            pMap.put("salePrice", item.getSalePrice());
            pMap.put("images", dto.getImages());
            pMap.put("category", p.getCategory() != null ? p.getCategory().getName() : null);
            pMap.put("isFlashSale", true);
            return pMap;
        }).collect(Collectors.toList());
    }


}
