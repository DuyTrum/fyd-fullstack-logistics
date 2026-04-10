package com.fyd.backend.controller;

import com.fyd.backend.entity.FlashSaleConfig;
import com.fyd.backend.entity.FlashSaleItem;
import com.fyd.backend.service.FlashSaleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/flash-sale")
public class AdminFlashSaleController {

    @Autowired
    private FlashSaleService flashSaleService;

    // ==================== CONFIG ENDPOINTS ====================

    @GetMapping("/configs")
    public ResponseEntity<List<Map<String, Object>>> getAllConfigs() {
        List<FlashSaleConfig> configs = flashSaleService.getAllConfigs();
        List<Map<String, Object>> result = configs.stream().map(this::configToMap).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/configs/{id}")
    public ResponseEntity<Map<String, Object>> getConfig(@PathVariable Long id) {
        return flashSaleService.getConfig(id)
                .map(config -> ResponseEntity.ok(configToMap(config)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/configs")
    public ResponseEntity<?> createConfig(@RequestBody Map<String, Object> body) {
        try {
            FlashSaleConfig config = new FlashSaleConfig();
            updateConfigFields(config, body);
            FlashSaleConfig saved = flashSaleService.saveConfig(config);
            return ResponseEntity.ok(configToMap(saved));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/configs/{id}")
    public ResponseEntity<?> updateConfig(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return flashSaleService.getConfig(id)
                .map(config -> {
                    try {
                        updateConfigFields(config, body);
                        FlashSaleConfig saved = flashSaleService.saveConfig(config);
                        return ResponseEntity.ok(configToMap(saved));
                    } catch (Exception e) {
                        return ResponseEntity.badRequest().body((Object) Map.of("error", e.getMessage()));
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/configs/{id}")
    public ResponseEntity<?> deleteConfig(@PathVariable Long id) {
        try {
            flashSaleService.deleteConfig(id);
            return ResponseEntity.ok(Map.of("message", "Deleted config and all items"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ==================== ITEM ENDPOINTS ====================

    @GetMapping("/items")
    public ResponseEntity<List<Map<String, Object>>> getItems(@RequestParam Long configId) {
        List<FlashSaleItem> items = flashSaleService.getItems(configId);
        List<Map<String, Object>> result = items.stream().map(this::itemToMap).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/items")
    public ResponseEntity<?> addItem(@RequestBody Map<String, Object> body) {
        try {
            Long configId = toLong(body.get("configId"));
            Long productId = toLong(body.get("productId"));
            BigDecimal salePrice = toBigDecimal(body.get("salePrice"));

            FlashSaleItem saved = flashSaleService.addItem(configId, productId, salePrice);
            return ResponseEntity.ok(itemToMap(saved));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/items/{id}")
    public ResponseEntity<?> updateItem(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            BigDecimal salePrice = toBigDecimal(body.get("salePrice"));
            FlashSaleItem updated = flashSaleService.updateItemPrice(id, salePrice);
            return ResponseEntity.ok(itemToMap(updated));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/items/{id}")
    public ResponseEntity<?> deleteItem(@PathVariable Long id) {
        try {
            flashSaleService.deleteItem(id);
            return ResponseEntity.ok(Map.of("message", "Deleted item"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ==================== HELPERS ====================

    private void updateConfigFields(FlashSaleConfig config, Map<String, Object> body) {
        if (body.containsKey("name")) config.setName((String) body.get("name"));
        if (body.containsKey("startTime")) config.setStartTime(parseDate(body.get("startTime")));
        if (body.containsKey("endTime")) config.setEndTime(parseDate(body.get("endTime")));
        if (body.containsKey("isActive")) config.setIsActive((Boolean) body.get("isActive"));
        if (body.containsKey("discountLabel")) config.setDiscountLabel((String) body.get("discountLabel"));
    }

    private Map<String, Object> configToMap(FlashSaleConfig config) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", config.getId());
        map.put("name", config.getName());
        map.put("startTime", config.getStartTime());
        map.put("endTime", config.getEndTime());
        map.put("isActive", config.getIsActive());
        map.put("discountLabel", config.getDiscountLabel());
        map.put("status", config.isRunning() ? "RUNNING" : config.isUpcoming() ? "UPCOMING" : config.isEnded() ? "ENDED" : "INACTIVE");
        map.put("itemCount", config.getItems() != null ? config.getItems().size() : 0);
        map.put("serverTime", LocalDateTime.now());
        return map;
    }

    private Map<String, Object> itemToMap(FlashSaleItem item) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", item.getId());
        map.put("configId", item.getFlashSaleConfig().getId());
        map.put("salePrice", item.getSalePrice());
        
        var product = item.getProduct();
        if (product != null) {
            map.put("productId", product.getId());
            map.put("productName", product.getName());
            map.put("productSku", product.getSku());
            map.put("basePrice", product.getBasePrice());
            map.put("category", product.getCategory() != null ? product.getCategory().getName() : null);
            
            if (product.getImages() != null && !product.getImages().isEmpty()) {
                map.put("imageUrl", product.getImages().get(0).getImageUrl());
            }
            
            if (product.getBasePrice() != null && product.getBasePrice().compareTo(BigDecimal.ZERO) > 0) {
                int discountPercent = 100 - item.getSalePrice()
                        .multiply(BigDecimal.valueOf(100))
                        .divide(product.getBasePrice(), 0, java.math.RoundingMode.HALF_UP)
                        .intValue();
                map.put("discountPercent", discountPercent);
            }
        }
        return map;
    }

    private LocalDateTime parseDate(Object obj) {
        if (obj == null) return null;
        if (obj instanceof String) {
            String str = (String) obj;
            if (str.length() == 16) str += ":00"; // Handle yyyy-MM-ddTHH:mm
            return LocalDateTime.parse(str.replace(" ", "T"));
        }
        return null;
    }

    private Long toLong(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Number) return ((Number) obj).longValue();
        if (obj instanceof String) return Long.parseLong((String) obj);
        return null;
    }

    private BigDecimal toBigDecimal(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Number) return BigDecimal.valueOf(((Number) obj).doubleValue());
        if (obj instanceof String) return new BigDecimal((String) obj);
        return null;
    }
}
