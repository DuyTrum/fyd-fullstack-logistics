package com.fyd.backend.controller;

import com.fyd.backend.dto.*;
import com.fyd.backend.entity.AiConfig;
import com.fyd.backend.entity.AiUsageLog;
import com.fyd.backend.service.AiManagementService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai-mgmt")
public class AiManagementController {

    @Autowired
    private AiManagementService aiManagementService;

    @GetMapping("/metrics")
    public ResponseEntity<AiMetricsDto> getMetrics() {
        return ResponseEntity.ok(aiManagementService.getMetrics());
    }

    @GetMapping("/logs")
    public ResponseEntity<Page<AiUsageLog>> getLogs(
            @RequestParam(required = false) String feature,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(aiManagementService.getUsageLogs(feature, status, pageable));
    }

    @GetMapping("/config")
    public ResponseEntity<AiConfig> getConfig() {
        return ResponseEntity.ok(aiManagementService.getActiveConfig());
    }

    @PutMapping("/config")
    public ResponseEntity<AiConfig> updateConfig(@RequestBody AiConfig config) {
        return ResponseEntity.ok(aiManagementService.updateConfig(config));
    }

    @PostMapping("/generate")
    public ResponseEntity<AiFullProductGenResponse> generateProductContent(
            @RequestBody AiFullProductGenRequest request) {
        return ResponseEntity.ok(aiManagementService.generateProductContent(request));
    }

    @PostMapping("/assistant")
    public ResponseEntity<AiChatResponse> chatAssistant(@RequestBody AiChatRequest request) {
        String reply = aiManagementService.chatAssistant(request.getMessage());
        return ResponseEntity.ok(AiChatResponse.success(reply));
    }

    @GetMapping("/recommendations")
    public ResponseEntity<List<Map<String, Object>>> getRecommendations(
            @RequestParam(defaultValue = "BEST_SELLING") String type) {
        return ResponseEntity.ok(aiManagementService.getRecommendationReport(type));
    }
}
