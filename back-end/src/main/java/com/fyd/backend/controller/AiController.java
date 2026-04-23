package com.fyd.backend.controller;

import com.fyd.backend.dto.AiAdminSummary;
import com.fyd.backend.dto.AiChatRequest;
import com.fyd.backend.dto.AiChatResponse;
import com.fyd.backend.dto.AiProductRequest;
import com.fyd.backend.dto.AiProductResponse;
import com.fyd.backend.dto.AnomalyReport;
import com.fyd.backend.service.AiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    @Autowired
    private AiService aiService;

    /**
     * Chat endpoint for both shop and admin contexts
     */
    @PostMapping("/chat")
    public ResponseEntity<AiChatResponse> chat(@RequestBody AiChatRequest request) {
        String context = request.getContext() != null ? request.getContext() : "shop";
        
        AiChatResponse response;
        if ("admin".equalsIgnoreCase(context)) {
            response = aiService.chatForAdmin(request.getMessage());
        } else {
            response = aiService.chatForShop(request.getMessage());
        }
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get auto-generated admin summary with AI insights
     */
    @GetMapping("/admin-summary")
    public ResponseEntity<AiAdminSummary> getAdminSummary() {
        AiAdminSummary summary = aiService.getAdminSummary();
        return ResponseEntity.ok(summary);
    }

    /**
     * Quick chat for shop - alternative simple endpoint
     */
    @PostMapping("/shop-chat")
    public ResponseEntity<AiChatResponse> shopChat(@RequestBody AiChatRequest request) {
        AiChatResponse response = aiService.chatForShop(request.getMessage(), request.getCustomerId());
        return ResponseEntity.ok(response);
    }

    /**
     * AI Size Advisor - suggests best size based on customer measurements
     * Supports category-specific measurements: bust (shirts), waist (pants), footLength (shoes)
     */
    @GetMapping("/size-advisor")
    public ResponseEntity<AiChatResponse> sizeAdvisor(
            @RequestParam Long productId,
            @RequestParam Double height,
            @RequestParam Double weight,
            @RequestParam(required = false, defaultValue = "regular") String fit,
            @RequestParam(required = false) Double bust,
            @RequestParam(required = false) Double waist,
            @RequestParam(required = false) Double footLength) {
        AiChatResponse response = aiService.suggestSize(productId, height, weight, fit, bust, waist, footLength);
        return ResponseEntity.ok(response);
    }

    /**
     * AI Flash Sale Suggestions - analyzes sales data to recommend products for flash sales
     */
    @GetMapping("/flash-sale-suggestions")
    public ResponseEntity<AiChatResponse> getFlashSaleSuggestions() {
        AiChatResponse response = aiService.suggestFlashSaleProducts();
        return ResponseEntity.ok(response);
    }

    /**
     * Quick chat for admin - alternative simple endpoint
     */
    @PostMapping("/admin-chat")
    public ResponseEntity<AiChatResponse> adminChat(@RequestBody AiChatRequest request) {
        AiChatResponse response = aiService.chatForAdmin(request.getMessage());
        return ResponseEntity.ok(response);
    }

    /**
     * Generate product description using AI
     */
    @PostMapping("/generate-description")
    public ResponseEntity<AiProductResponse> generateDescription(@RequestBody AiProductRequest request) {
        AiProductResponse response = aiService.generateProductDescription(
            request.getProductName(),
            request.getCategory()
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Suggest category and keywords for a product
     */
    @PostMapping("/suggest-category")
    public ResponseEntity<AiProductResponse> suggestCategory(@RequestBody AiProductRequest request) {
        AiProductResponse response = aiService.suggestCategoryAndKeywords(
            request.getProductName(),
            request.getDescription()
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Get anomaly alerts for business monitoring
     */
    @GetMapping("/anomalies")
    public ResponseEntity<java.util.List<AnomalyReport>> getAnomalies() {
        java.util.List<AnomalyReport> anomalies = aiService.detectAnomalies();
        return ResponseEntity.ok(anomalies);
    }
}
