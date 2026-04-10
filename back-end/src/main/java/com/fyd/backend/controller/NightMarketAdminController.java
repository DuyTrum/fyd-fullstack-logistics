package com.fyd.backend.controller;

import com.fyd.backend.entity.NightMarketConfig;
import com.fyd.backend.repository.NightMarketConfigRepository;
import com.fyd.backend.service.NightMarketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/night-market")
public class NightMarketAdminController {

    @Autowired
    private NightMarketConfigRepository configRepository;

    @Autowired
    private NightMarketService nightMarketService;

    @GetMapping("/config")
    public ResponseEntity<?> getConfig() {
        NightMarketConfig config = configRepository.findAll().stream().findFirst()
                .orElseGet(() -> {
                    NightMarketConfig newConfig = new NightMarketConfig();
                    return configRepository.save(newConfig);
                });
        return ResponseEntity.ok(config);
    }

    @PutMapping("/config")
    @Transactional
    public ResponseEntity<?> updateConfig(@RequestBody NightMarketConfig config) {
        NightMarketConfig existing = configRepository.findAll().stream().findFirst()
                .orElseGet(NightMarketConfig::new);
        
        // Track if discount range changed to trigger sync
        boolean syncNeeded = !existing.getMinDiscountPercent().equals(config.getMinDiscountPercent()) ||
                             !existing.getMaxDiscountPercent().equals(config.getMaxDiscountPercent());

        existing.setMinOffers(config.getMinOffers());
        existing.setMaxOffers(config.getMaxOffers());
        existing.setMinDiscountPercent(config.getMinDiscountPercent());
        existing.setMaxDiscountPercent(config.getMaxDiscountPercent());
        existing.setOfferDurationDays(config.getOfferDurationDays());
        existing.setIsActive(config.getIsActive());
        existing.setStartTime(config.getStartTime());
        existing.setEndTime(config.getEndTime());
        
        NightMarketConfig saved = configRepository.save(existing);
        
        int updatedCount = 0;
        if (syncNeeded) {
            updatedCount = nightMarketService.syncUnrevealedOffers();
        }
        
        return ResponseEntity.ok(Map.of(
            "config", saved,
            "syncedCount", updatedCount,
            "message", syncNeeded ? "Config saved and " + updatedCount + " unrevealed offers synced." : "Config saved."
        ));
    }
}
