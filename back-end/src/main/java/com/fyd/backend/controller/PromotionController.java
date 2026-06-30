package com.fyd.backend.controller;

import com.fyd.backend.entity.Promotion;
import com.fyd.backend.repository.PromotionRepository;
import com.fyd.backend.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/promotions")
public class PromotionController {

    @Autowired
    private PromotionRepository promotionRepository;

    @Autowired
    private OrderRepository orderRepository;

    private void syncUsedCount(Promotion p) {
        if (p != null) {
            long realCount = orderRepository.countByPromotionCodeIgnoreCase(p.getCode());
            if (p.getUsedCount() == null || p.getUsedCount() != (int) realCount) {
                p.setUsedCount((int) realCount);
                promotionRepository.save(p);
            }
        }
    }

    private void syncUsedCount(List<Promotion> promotions) {
        for (Promotion p : promotions) {
            syncUsedCount(p);
        }
    }

    // Get all promotions (admin)
    @GetMapping
    public ResponseEntity<List<Promotion>> getAllPromotions() {
        List<Promotion> list = promotionRepository.findAll();
        syncUsedCount(list);
        return ResponseEntity.ok(list);
    }

    // Get active promotions
    @GetMapping("/list/active")
    public ResponseEntity<List<Promotion>> getActivePromotions() {
        List<Promotion> list = promotionRepository.findAllValidPromotions();
        syncUsedCount(list);
        return ResponseEntity.ok(list);
    }

    // Get active flash sales
    @GetMapping("/list/flash-sale")
    public ResponseEntity<List<Promotion>> getFlashSales() {
        List<Promotion> list = promotionRepository.findActiveFlashSales();
        syncUsedCount(list);
        return ResponseEntity.ok(list);
    }

    // Get promotion by ID
    @GetMapping("/{id}")
    public ResponseEntity<Promotion> getPromotion(@PathVariable Long id) {
        return promotionRepository.findById(id)
                .map(p -> {
                    syncUsedCount(p);
                    return ResponseEntity.ok(p);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Create promotion (admin)
    @PostMapping
    public ResponseEntity<Promotion> createPromotion(@RequestBody Promotion promotion) {
        if (promotionRepository.existsByCode(promotion.getCode())) {
            return ResponseEntity.badRequest().build();
        }
        Promotion saved = promotionRepository.save(promotion);
        return ResponseEntity.ok(saved);
    }

    // Update promotion (admin)
    @PutMapping("/{id}")
    public ResponseEntity<Promotion> updatePromotion(@PathVariable Long id, @RequestBody Promotion promotion) {
        return promotionRepository.findById(id)
                .map(existing -> {
                    existing.setName(promotion.getName());
                    existing.setDescription(promotion.getDescription());
                    existing.setDiscountType(promotion.getDiscountType());
                    existing.setDiscountValue(promotion.getDiscountValue());
                    existing.setMinOrderAmount(promotion.getMinOrderAmount());
                    existing.setMaxDiscount(promotion.getMaxDiscount());
                    existing.setUsageLimit(promotion.getUsageLimit());
                    existing.setStartDate(promotion.getStartDate());
                    existing.setEndDate(promotion.getEndDate());
                    existing.setIsActive(promotion.getIsActive());
                    existing.setIsFlashSale(promotion.getIsFlashSale());
                    return ResponseEntity.ok(promotionRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Delete promotion (admin)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePromotion(@PathVariable Long id) {
        if (promotionRepository.existsById(id)) {
            promotionRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    // Validate promotion code (shop)
    @PostMapping("/validate")
    public ResponseEntity<Map<String, Object>> validatePromotion(@RequestBody Map<String, Object> request) {
        String code = (String) request.get("code");
        BigDecimal orderSubtotal = new BigDecimal(request.get("subtotal").toString());

        Map<String, Object> response = new HashMap<>();
        
        Optional<Promotion> promoOpt = promotionRepository.findByCodeIgnoreCase(code);
        
        if (promoOpt.isEmpty()) {
            response.put("valid", false);
            response.put("message", "Ma khuyen mai khong ton tai");
            return ResponseEntity.ok(response);
        }

        Promotion promotion = promoOpt.get();
        syncUsedCount(promotion);
        
        if (!promotion.isValid()) {
            response.put("valid", false);
            response.put("message", "Ma khuyen mai da het han hoac da su dung het");
            return ResponseEntity.ok(response);
        }

        if (orderSubtotal.compareTo(promotion.getMinOrderAmount()) < 0) {
            response.put("valid", false);
            response.put("message", "Don hang chua dat gia tri toi thieu " + promotion.getMinOrderAmount() + " VND");
            return ResponseEntity.ok(response);
        }

        BigDecimal discount = promotion.calculateDiscount(orderSubtotal);
        
        response.put("valid", true);
        response.put("code", promotion.getCode());
        response.put("name", promotion.getName());
        response.put("discountType", promotion.getDiscountType());
        response.put("discountValue", promotion.getDiscountValue());
        response.put("discountAmount", discount);
        response.put("message", "Ap dung thanh cong!");
        
        return ResponseEntity.ok(response);
    }

    // Apply promotion (increment used count)
    @PostMapping("/apply")
    public ResponseEntity<Void> applyPromotion(@RequestBody Map<String, String> request) {
        String code = request.get("code");
        
        return promotionRepository.findByCodeIgnoreCase(code)
                .map(promotion -> {
                    long realCount = orderRepository.countByPromotionCodeIgnoreCase(promotion.getCode());
                    promotion.setUsedCount((int) realCount + 1);
                    promotionRepository.save(promotion);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
