package com.fyd.backend.controller;

import com.fyd.backend.service.FlashSaleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/flash-sale")
public class FlashSaleController {

    @Autowired
    private FlashSaleService flashSaleService;

    /**
     * Public endpoint: Get the currently active flash sale with products.
     * Delegates to FlashSaleService for business logic and legacy fallback.
     */
    @GetMapping("/active")
    public ResponseEntity<Map<String, Object>> getActiveFlashSale() {
        return ResponseEntity.ok(flashSaleService.getActiveFlashSaleResponse());
    }
}
