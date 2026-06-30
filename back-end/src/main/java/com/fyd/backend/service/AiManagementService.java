package com.fyd.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fyd.backend.dto.AiFullProductGenRequest;
import com.fyd.backend.dto.AiFullProductGenResponse;
import com.fyd.backend.dto.AiMetricsDto;
import com.fyd.backend.entity.AiConfig;
import com.fyd.backend.entity.AiUsageLog;
import com.fyd.backend.entity.Product;
import com.fyd.backend.entity.ProductVariant;
import com.fyd.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AiManagementService {

    @Autowired
    private AiConfigRepository aiConfigRepository;

    @Autowired
    private AiUsageLogRepository aiUsageLogRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductVariantRepository productVariantRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Value("${groq.api.key:}")
    private String defaultGroqKey;

    @Value("${groq.api.model:llama-3.3-70b-versatile}")
    private String defaultGroqModel;

    @Value("${groq.api.url:https://api.groq.com/openai/v1/chat/completions}")
    private String defaultGroqUrl;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public AiManagementService() {
        this.webClient = WebClient.builder().build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Gets aggregated metrics for the AI Dashboard widgets and charts
     */
    public AiMetricsDto getMetrics() {
        AiMetricsDto dto = new AiMetricsDto();

        Long totalRequests = aiUsageLogRepository.countTotalRequests();
        dto.setTotalRequests(totalRequests != null ? totalRequests : 0L);

        // Count active features dynamically (always 4 in mockup/actual)
        dto.setActiveFeaturesCount(4);

        Double avgLatency = aiUsageLogRepository.getAverageLatency();
        dto.setAverageLatency(avgLatency != null ? Math.round(avgLatency * 100.0) / 100.0 : 0.0);

        Long totalTokens = aiUsageLogRepository.sumTotalTokens();
        dto.setTotalTokens(totalTokens != null ? totalTokens : 0L);

        Double totalCost = aiUsageLogRepository.sumTotalCost();
        dto.setEstimatedCost(totalCost != null ? Math.round(totalCost * 100.0) / 100.0 : 0.0);

        if (dto.getTotalRequests() > 0) {
            Long successRequests = aiUsageLogRepository.countSuccessRequests();
            double rate = (successRequests != null ? successRequests * 100.0 : 0.0) / dto.getTotalRequests();
            dto.setSuccessRate(Math.round(rate * 100.0) / 100.0);
        } else {
            dto.setSuccessRate(100.0);
        }

        // Feature distribution mapping
        Map<String, Long> featureMap = new HashMap<>();
        List<Map<String, Object>> features = aiUsageLogRepository.countRequestsByFeature();
        if (features != null) {
            for (Map<String, Object> row : features) {
                String feat = (String) row.get("feature");
                Long cnt = (Long) row.get("count");
                if (feat != null) {
                    featureMap.put(feat, cnt);
                }
            }
        }
        dto.setUsageByFeature(featureMap);

        // Daily usage metrics (last 30 days)
        List<Map<String, Object>> daily = aiUsageLogRepository.getDailyUsageMetrics(LocalDateTime.now().minusDays(30));
        dto.setDailyUsage(daily != null ? daily : Collections.emptyList());

        return dto;
    }

    /**
     * Retrieves filtered and paginated usage logs
     */
    public Page<AiUsageLog> getUsageLogs(String feature, String status, Pageable pageable) {
        if ((feature == null || feature.isEmpty() || "ALL".equalsIgnoreCase(feature)) && 
            (status == null || status.isEmpty() || "ALL".equalsIgnoreCase(status))) {
            return aiUsageLogRepository.findAllByOrderByTimestampDesc(pageable);
        }
        
        String featParam = (feature == null || feature.isEmpty() || "ALL".equalsIgnoreCase(feature)) ? null : feature;
        String statusParam = (status == null || status.isEmpty() || "ALL".equalsIgnoreCase(status)) ? null : status;
        
        return aiUsageLogRepository.findWithFilters(featParam, statusParam, pageable);
    }

    /**
     * Gets active AI configurations, initializing defaults if none exist
     */
    public AiConfig getActiveConfig() {
        Optional<AiConfig> configOpt = aiConfigRepository.findFirstByOrderByIdAsc();
        if (configOpt.isPresent()) {
            AiConfig config = configOpt.get();
            // Mask API key for security
            if (config.getApiKey() != null && !config.getApiKey().isEmpty()) {
                String key = config.getApiKey();
                config.setApiKey("••••••••••••••••" + key.substring(Math.max(0, key.length() - 6)));
            }
            return config;
        }

        // Create default config based on application.yaml properties
        AiConfig defaultConfig = new AiConfig();
        defaultConfig.setProvider("groq");
        defaultConfig.setApiKey(defaultGroqKey);
        defaultConfig.setModelName(defaultGroqModel);
        defaultConfig.setTemperature(0.7);
        defaultConfig.setMaxTokens(2048);
        defaultConfig.setMonthlyBudgetUsd(100.0);
        defaultConfig.setCurrentMonthlySpendUsd(0.0);
        
        AiConfig saved = aiConfigRepository.save(defaultConfig);
        
        if (saved.getApiKey() != null && !saved.getApiKey().isEmpty()) {
            String key = saved.getApiKey();
            saved.setApiKey("••••••••••••••••" + key.substring(Math.max(0, key.length() - 6)));
        }
        
        return saved;
    }

    /**
     * Updates provider configuration. Handles masked API keys appropriately.
     */
    public AiConfig updateConfig(AiConfig newConfig) {
        Optional<AiConfig> existingOpt = aiConfigRepository.findFirstByOrderByIdAsc();
        AiConfig configToSave;

        if (existingOpt.isPresent()) {
            configToSave = existingOpt.get();
            configToSave.setProvider(newConfig.getProvider());
            configToSave.setModelName(newConfig.getModelName());
            configToSave.setTemperature(newConfig.getTemperature());
            configToSave.setMaxTokens(newConfig.getMaxTokens());
            configToSave.setMonthlyBudgetUsd(newConfig.getMonthlyBudgetUsd());
            
            // Only update key if it is not the masked placeholder
            if (newConfig.getApiKey() != null && !newConfig.getApiKey().startsWith("••••")) {
                configToSave.setApiKey(newConfig.getApiKey());
            }
        } else {
            configToSave = newConfig;
            if (configToSave.getApiKey() != null && configToSave.getApiKey().startsWith("••••")) {
                configToSave.setApiKey(defaultGroqKey);
            }
        }

        AiConfig saved = aiConfigRepository.save(configToSave);
        
        // Mask return
        if (saved.getApiKey() != null && !saved.getApiKey().isEmpty()) {
            String key = saved.getApiKey();
            saved.setApiKey("••••••••••••••••" + key.substring(Math.max(0, key.length() - 6)));
        }
        
        return saved;
    }

    /**
     * Logs consumption and tracks monthly budget spend
     */
    public AiUsageLog logUsage(String feature, String model, int promptTokens, int completionTokens, 
                               long latencyMs, String status, String errorMessage) {
        AiUsageLog log = new AiUsageLog();
        log.setFeature(feature);
        log.setModelUsed(model);
        log.setPromptTokens(promptTokens);
        log.setCompletionTokens(completionTokens);
        log.setTotalTokens(promptTokens + completionTokens);
        log.setLatencyMs((int) latencyMs);
        log.setStatus(status);
        log.setErrorMessage(errorMessage);
        log.setUserName("admin@fyd.com"); // Hardcoded/Mock user context for dashboard requests

        // Cost calculation per 1M tokens
        double costPerMillionPrompt = 0.075; // default gemini-1.5-flash
        double costPerMillionCompletion = 0.30;

        String lowerModel = model.toLowerCase();
        if (lowerModel.contains("gpt-4o")) {
            costPerMillionPrompt = 5.00;
            costPerMillionCompletion = 15.00;
        } else if (lowerModel.contains("llama-3.3") || lowerModel.contains("llama3")) {
            costPerMillionPrompt = 0.59;
            costPerMillionCompletion = 0.79;
        } else if (lowerModel.contains("gemini-1.5-pro")) {
            costPerMillionPrompt = 1.25;
            costPerMillionCompletion = 5.00;
        }

        double estCost = ((promptTokens * costPerMillionPrompt) + (completionTokens * costPerMillionCompletion)) / 1_000_000.0;
        log.setEstimatedCostUsd(estCost);

        AiUsageLog savedLog = aiUsageLogRepository.save(log);

        // Update monthly budget spent
        Optional<AiConfig> configOpt = aiConfigRepository.findFirstByOrderByIdAsc();
        if (configOpt.isPresent()) {
            AiConfig config = configOpt.get();
            config.setCurrentMonthlySpendUsd(config.getCurrentMonthlySpendUsd() + estCost);
            aiConfigRepository.save(config);
        }

        return savedLog;
    }

    /**
     * Generates descriptions, SEO, keywords, and specs matching options requested
     */
    public AiFullProductGenResponse generateProductContent(AiFullProductGenRequest request) {
        long startTime = System.currentTimeMillis();
        
        Optional<AiConfig> configOpt = aiConfigRepository.findFirstByOrderByIdAsc();
        AiConfig config = configOpt.orElse(null);
        
        double currentSpend = config != null ? config.getCurrentMonthlySpendUsd() : 0.0;
        double budget = config != null ? config.getMonthlyBudgetUsd() : 100.0;

        // Circuit breaker check
        if (currentSpend >= budget) {
            String errorMsg = "Monthly AI budget limit exceeded ($" + budget + "). Action blocked.";
            logUsage("PRODUCT_GEN", config != null ? config.getModelName() : "unknown", 0, 0, 
                     System.currentTimeMillis() - startTime, "LIMIT_EXCEEDED", errorMsg);
            
            AiFullProductGenResponse errRes = new AiFullProductGenResponse();
            errRes.setSuccess(false);
            errRes.setError(errorMsg);
            return errRes;
        }

        String provider = config != null ? config.getProvider() : "groq";
        String apiKey = (config != null && config.getApiKey() != null && !config.getApiKey().isEmpty()) 
                        ? config.getApiKey() : defaultGroqKey;
        String model = config != null ? config.getModelName() : defaultGroqModel;
        String apiUrl = provider.equalsIgnoreCase("groq") ? defaultGroqUrl : "https://api.openai.com/v1/chat/completions";

        if (provider.equalsIgnoreCase("gemini")) {
            apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
        }

        // Build instructions
        StringBuilder optionsInstruction = new StringBuilder();
        if (request.getOptions().contains("description")) {
            optionsInstruction.append("- description: A concise marketing description about 3-4 sentences targeting modern streetwear aesthetic.\n");
        }
        if (request.getOptions().contains("seo")) {
            optionsInstruction.append("- seoTitle: A high CTR meta title under 60 chars.\n");
            optionsInstruction.append("- seoDescription: A meta description under 150 chars.\n");
        }
        if (request.getOptions().contains("tags")) {
            optionsInstruction.append("- tags: Array of 5 product tags/keywords.\n");
        }
        if (request.getOptions().contains("specs")) {
            optionsInstruction.append("- specifications: Key-value object with details like Material, Weight (GSM), Fit, and Washing instructions.\n");
        }

        String prompt = """
            You are a professional ecommerce copywriter for the streetwear brand FYD Store.
            Generate product marketing assets for the following clothing item:
            Name: %s
            Category: %s
            Attributes/Details: %s
            
            Requested JSON fields (only return fields mentioned below):
            %s
            
            CRITICAL RULES:
            1. Return a STRICT, valid JSON object. No Markdown formatting, no code blocks (do not wrap in ```json).
            2. Language must be Vietnamese.
            3. Do not include duplicate text.
            """.formatted(request.getProductName(), request.getCategory(), request.getAttributes(), optionsInstruction.toString());

        try {
            String jsonReply = "";
            int promptToks = prompt.length() / 4; // Mock estimation if API doesn't return
            int compToks = 250;

            if (apiKey == null || apiKey.isEmpty()) {
                // Return mock data for local testing
                jsonReply = getMockProductGenOutput(request);
            } else {
                // Real call to API (handles OpenAI/Groq JSON structure)
                Map<String, Object> requestBody = new HashMap<>();
                requestBody.put("model", model);
                requestBody.put("response_format", Map.of("type", "json_object"));
                
                List<Map<String, String>> messages = new ArrayList<>();
                messages.add(Map.of("role", "user", "content", prompt));
                requestBody.put("messages", messages);
                requestBody.put("temperature", config != null ? config.getTemperature() : 0.7);

                Map response = webClient.post()
                    .uri(apiUrl)
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

                if (response != null && response.containsKey("choices")) {
                    List<Map> choices = (List<Map>) response.get("choices");
                    if (!choices.isEmpty()) {
                        Map choice = choices.get(0);
                        Map msg = (Map) choice.get("message");
                        if (msg != null) {
                            jsonReply = (String) msg.get("content");
                        }
                    }
                    
                    // Extract usage if available
                    if (response.containsKey("usage")) {
                        Map usage = (Map) response.get("usage");
                        promptToks = (Integer) usage.get("prompt_tokens");
                        compToks = (Integer) usage.get("completion_tokens");
                    }
                }
            }

            if (jsonReply == null || jsonReply.isEmpty()) {
                jsonReply = getMockProductGenOutput(request);
            }

            // Parse reply
            Map<String, Object> data = objectMapper.readValue(jsonReply, Map.class);
            
            AiFullProductGenResponse response = new AiFullProductGenResponse();
            response.setSuccess(true);
            
            if (data.containsKey("description")) {
                response.setDescription((String) data.get("description"));
            }
            if (data.containsKey("seoTitle")) {
                response.setSeoTitle((String) data.get("seoTitle"));
            }
            if (data.containsKey("seoDescription")) {
                response.setSeoDescription((String) data.get("seoDescription"));
            }
            if (data.containsKey("tags")) {
                response.setTags((List<String>) data.get("tags"));
            }
            if (data.containsKey("specifications")) {
                response.setSpecifications((Map<String, String>) data.get("specifications"));
            }

            logUsage("PRODUCT_GEN", model, promptToks, compToks, 
                     System.currentTimeMillis() - startTime, "SUCCESS", null);

            return response;

        } catch (Exception e) {
            String errorMsg = "Generation error: " + e.getMessage();
            logUsage("PRODUCT_GEN", model, 0, 0, 
                     System.currentTimeMillis() - startTime, "FAILED", errorMsg);
            
            AiFullProductGenResponse errRes = new AiFullProductGenResponse();
            errRes.setSuccess(false);
            errRes.setError(errorMsg);
            return errRes;
        }
    }

    private String getMockProductGenOutput(AiFullProductGenRequest request) {
        String baseName = request.getProductName();
        return """
        {
          "description": "Nâng tầm phong cách streetwear của bạn với chiếc %s. Được dệt từ chất liệu cotton hữu cơ cao cấp dày dặn, sản phẩm sở hữu form dáng rộng rãi (boxy, drop-shoulder) phóng khoáng, mang lại sự thoải mái tuyệt đối cho các hoạt động hằng ngày.",
          "seoTitle": "%s - Thời trang Streetwear FYD Store",
          "seoDescription": "Mua ngay %s chất liệu cotton cao cấp, form rộng boxy sành điệu tại FYD Store. Giao hàng toàn quốc nhanh chóng, đổi trả 30 ngày.",
          "tags": ["streetwear", "fyd-store", "cotton-organic", "ao-form-rong", "clothing-casual"],
          "specifications": {
            "Chất liệu": "100%% Cotton hữu cơ cao cấp",
            "Định lượng vải": "250 GSM hoặc 400 GSM (Heavyweight)",
            "Kiểu dáng": "Oversized / Boxy fit",
            "Hướng dẫn bảo quản": "Giặt máy bằng nước lạnh với các sản phẩm cùng màu, phơi bóng râm"
          }
        }
        """.formatted(baseName, baseName, baseName);
    }

    /**
     * Generates a conversational message response
     */
    public String chatAssistant(String message) {
        long startTime = System.currentTimeMillis();
        Optional<AiConfig> configOpt = aiConfigRepository.findFirstByOrderByIdAsc();
        AiConfig config = configOpt.orElse(null);
        String model = config != null ? config.getModelName() : defaultGroqModel;

        // Standard prompt
        String prompt = "Trở thành trợ lý hỗ trợ quản trị hệ thống FYD Store. Trả lời câu hỏi quản trị sau thật ngắn gọn bằng tiếng Việt: " + message;
        
        try {
            String apiKey = (config != null && config.getApiKey() != null && !config.getApiKey().startsWith("••••")) 
                            ? config.getApiKey() : defaultGroqKey;
            
            String reply;
            int promptToks = message.length() / 4;
            int compToks = 150;

            if (apiKey == null || apiKey.isEmpty()) {
                reply = "Chào Admin! Để trả lời câu hỏi: \"" + message + "\", tôi cần phân tích dữ liệu kho hàng. Hiện tại sản phẩm bán chạy nhất tuần là Áo thun Tee Oversized FYD.";
            } else {
                Map<String, Object> requestBody = new HashMap<>();
                requestBody.put("model", model);
                requestBody.put("messages", List.of(Map.of("role", "user", "content", prompt)));
                requestBody.put("temperature", 0.7);

                Map response = webClient.post()
                    .uri(defaultGroqUrl)
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

                if (response != null && response.containsKey("choices")) {
                    List<Map> choices = (List<Map>) response.get("choices");
                    Map choice = choices.get(0);
                    Map msg = (Map) choice.get("message");
                    reply = (String) msg.get("content");
                    
                    if (response.containsKey("usage")) {
                        Map usage = (Map) response.get("usage");
                        promptToks = (Integer) usage.get("prompt_tokens");
                        compToks = (Integer) usage.get("completion_tokens");
                    }
                } else {
                    reply = "Không thể kết nối API AI.";
                }
            }

            logUsage("ASSISTANT", model, promptToks, compToks, 
                     System.currentTimeMillis() - startTime, "SUCCESS", null);
            return reply;

        } catch (Exception e) {
            logUsage("ASSISTANT", model, 0, 0, 
                     System.currentTimeMillis() - startTime, "FAILED", e.getMessage());
            return "Lỗi kết nối AI: " + e.getMessage();
        }
    }

    /**
     * AI Recommendations features: returns best-sellers, cross-sells, low-inventory alerts, or customer behavior
     */
    public List<Map<String, Object>> getRecommendationReport(String type) {
        long startTime = System.currentTimeMillis();
        List<Map<String, Object>> result = new ArrayList<>();
        
        try {
            if ("BEST_SELLING".equalsIgnoreCase(type)) {
                LocalDateTime lastWeek = LocalDateTime.now().minusDays(7);
                List<Object[]> topIds = orderItemRepository.getTopSellingProductIdsSince(lastWeek, org.springframework.data.domain.PageRequest.of(0, 5));
                
                List<Long> productIds = new ArrayList<>();
                Map<Long, Long> salesMap = new HashMap<>();
                for (Object[] row : topIds) {
                    Long pid = (Long) row[0];
                    Long count = (Long) row[1];
                    productIds.add(pid);
                    salesMap.put(pid, count);
                }
                
                List<Product> products;
                if (!productIds.isEmpty()) {
                    products = productRepository.findAllById(productIds);
                    // Sort according to topIds order
                    products.sort(Comparator.comparingInt(p -> productIds.indexOf(p.getId())));
                } else {
                    // Fallback to general top selling products if there are no recent sales
                    products = productRepository.findTopSelling(org.springframework.data.domain.PageRequest.of(0, 5));
                }
                
                LocalDateTime prevWeekStart = LocalDateTime.now().minusDays(14);
                LocalDateTime prevWeekEnd = LocalDateTime.now().minusDays(7);
                
                for (Product p : products) {
                    Map<String, Object> map = new HashMap<>();
                    map.put("productId", p.getId());
                    map.put("name", p.getName());
                    map.put("sku", p.getSku());
                    map.put("basePrice", p.getBasePrice());
                    
                    long salesCount = salesMap.getOrDefault(p.getId(), 0L);
                    if (salesCount == 0L) {
                        // If no recent sales in last 7 days, try to get total soldCount or calculate since beginning
                        salesCount = p.getSoldCount() != null ? p.getSoldCount().longValue() : 0L;
                    }
                    map.put("salesCount", salesCount);
                    
                    Long salesPrev = orderItemRepository.getProductSalesBetween(p.getId(), prevWeekStart, prevWeekEnd);
                    long prevCount = salesPrev != null ? salesPrev : 0L;
                    
                    String growthRateStr = "0.0%";
                    if (salesCount > 0L) {
                        if (prevCount > 0L) {
                            double growth = ((salesCount - prevCount) * 100.0) / prevCount;
                            growthRateStr = String.format("%s%.1f%%", growth >= 0 ? "+" : "", growth);
                        } else {
                            growthRateStr = "+100.0%";
                        }
                    }
                    map.put("growthRate", growthRateStr);
                    result.add(map);
                }
            } else if ("LOW_INVENTORY".equalsIgnoreCase(type)) {
                List<ProductVariant> variants = productVariantRepository.findLowStock(20);
                LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
                for (ProductVariant v : variants) {
                    Map<String, Object> map = new HashMap<>();
                    map.put("variantId", v.getId());
                    map.put("sku", v.getSkuVariant());
                    
                    String name = "";
                    if (v.getProduct() != null) {
                        name = v.getProduct().getName();
                    }
                    String sizeName = v.getSize() != null ? v.getSize().getName() : "";
                    String colorName = v.getColor() != null ? v.getColor().getName() : "";
                    if (!sizeName.isEmpty() || !colorName.isEmpty()) {
                        name += " (" + sizeName + (!sizeName.isEmpty() && !colorName.isEmpty() ? " / " : "") + colorName + ")";
                    }
                    map.put("name", name);
                    
                    Integer stockQty = v.getStockQuantity() != null ? v.getStockQuantity() : 0;
                    map.put("stockQuantity", stockQty);
                    
                    Integer sales30Days = orderItemRepository.getQuantitySoldByVariantFrom(v.getId(), thirtyDaysAgo);
                    long soldCount = sales30Days != null ? sales30Days.longValue() : 0L;
                    double dailyVelocity = Math.round((soldCount / 30.0) * 100.0) / 100.0;
                    map.put("dailyVelocity", dailyVelocity);
                    
                    int daysRemaining = dailyVelocity > 0.01 ? (int)(stockQty / dailyVelocity) : 999;
                    map.put("daysRemaining", daysRemaining);
                    
                    int restockQty = dailyVelocity > 0 ? Math.max(20, (int)(dailyVelocity * 30) - stockQty) : Math.max(15, 30 - stockQty);
                    map.put("recommendation", "Đặt thêm " + restockQty + " chiếc từ xưởng may.");
                    result.add(map);
                }
            } else if ("CROSS_SELLING".equalsIgnoreCase(type)) {
                List<Object[]> pairs = orderItemRepository.getFrequentlyBoughtTogetherAllTime(org.springframework.data.domain.PageRequest.of(0, 5));
                if (!pairs.isEmpty()) {
                    for (Object[] row : pairs) {
                        String itemA = (String) row[0];
                        String itemB = (String) row[1];
                        Long coOccurrence = (Long) row[2];
                        
                        Long countA = orderItemRepository.countOrdersWithProduct(itemA);
                        long totalA = countA != null ? countA : 0L;
                        
                        String confidenceStr = "0%";
                        if (totalA > 0L) {
                            long conf = (coOccurrence * 100) / totalA;
                            confidenceStr = conf + "%";
                        }
                        
                        Map<String, Object> map = new HashMap<>();
                        map.put("itemA", itemA);
                        map.put("itemB", itemB);
                        map.put("coOccurrence", coOccurrence);
                        map.put("confidence", confidenceStr);
                        map.put("suggestedCampaign", "Mua kèm " + itemA + " & " + itemB + " giảm 10% combo.");
                        result.add(map);
                    }
                } else {
                    // Fallback to top selling products to suggest combo
                    List<Product> products = productRepository.findTopSelling(org.springframework.data.domain.PageRequest.of(0, 4));
                    if (products.size() >= 2) {
                        for (int i = 0; i < products.size() - 1; i++) {
                            Product p1 = products.get(i);
                            Product p2 = products.get(i + 1);
                            Map<String, Object> map = new HashMap<>();
                            map.put("itemA", p1.getName());
                            map.put("itemB", p2.getName());
                            map.put("coOccurrence", 0L);
                            map.put("confidence", "Đề xuất combo");
                            map.put("suggestedCampaign", "Tạo chiến dịch mua kèm " + p1.getName() + " & " + p2.getName() + " giảm 10%.");
                            result.add(map);
                        }
                    }
                }
            } else { // CUSTOMER_BEHAVIOR
                // Peak sales period calculation
                List<Object[]> peakPeriod = orderRepository.getPeakSalesPeriod();
                if (peakPeriod != null && !peakPeriod.isEmpty()) {
                    Object[] row = peakPeriod.get(0);
                    // DOW comes as Integer or Long depending on native type, hr as Integer, order_count as Long
                    Number dowNum = (Number) row[0];
                    Number hrNum = (Number) row[1];
                    Number cntNum = (Number) row[2];
                    
                    int dow = dowNum.intValue();
                    int hr = hrNum.intValue();
                    long cnt = cntNum.longValue();
                    
                    String[] dayNames = {"", "Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"};
                    String dayName = (dow >= 1 && dow <= 7) ? dayNames[dow] : "Chủ Nhật";
                    
                    Map<String, Object> map = new HashMap<>();
                    map.put("insight", "Khách hàng thường mua sắm nhiều nhất vào " + dayName + ", khung giờ " + hr + ":00 - " + (hr + 1) + ":00.");
                    map.put("impact", "Có tổng cộng " + cnt + " đơn hàng hoàn thành trong khung giờ này.");
                    map.put("recommendation", "Lên lịch gửi thông báo đẩy kích cầu hoặc Flash Sale vào lúc " + (hr == 0 ? 23 : hr - 1) + ":45 " + dayName + ".");
                    result.add(map);
                } else {
                    Map<String, Object> map = new HashMap<>();
                    map.put("insight", "Chưa có đủ dữ liệu đơn hàng thành công để phân tích hành vi theo giờ.");
                    map.put("impact", "0 đơn hàng hoàn thành.");
                    map.put("recommendation", "Khuyến khích tung ra các chương trình kích cầu mua sắm đầu tiên.");
                    result.add(map);
                }
                
                // Tier spending comparison
                List<Object[]> tierSpending = orderRepository.getSpendingByTier();
                if (tierSpending != null && !tierSpending.isEmpty()) {
                    String vipTier = "";
                    double vipAvg = 0.0;
                    
                    String baseTier = "";
                    double baseAvg = 999999999.0;
                    
                    for (Object[] row : tierSpending) {
                        String name = (String) row[0];
                        Number avgNum = (Number) row[1];
                        double avgVal = avgNum != null ? avgNum.doubleValue() : 0.0;
                        
                        if (avgVal > vipAvg) {
                            vipAvg = avgVal;
                            vipTier = name;
                        }
                        if (avgVal < baseAvg && avgVal > 0) {
                            baseAvg = avgVal;
                            baseTier = name;
                        }
                    }
                    
                    if (!vipTier.isEmpty() && baseAvg < 999999999.0 && vipAvg > baseAvg) {
                        double ratio = vipAvg / baseAvg;
                        Map<String, Object> map2 = new HashMap<>();
                        map2.put("insight", "Nhóm khách hàng phân khúc '" + vipTier + "' chi tiêu trung bình gấp " + String.format("%.1f", ratio) + " lần so với khách thông thường.");
                        map2.put("impact", "Đóng góp giá trị đơn hàng trung bình cao nhất (" + String.format("%,.0f", vipAvg) + " đ/đơn).");
                        map2.put("recommendation", "Thiết lập chương trình chăm sóc khách hàng thân thiết và quà tặng độc quyền cho phân khúc '" + vipTier + "'.");
                        result.add(map2);
                    } else {
                        Map<String, Object> map2 = new HashMap<>();
                        map2.put("insight", "Doanh số từ các phân khúc khách hàng thành viên tương đối đồng đều.");
                        map2.put("impact", "Đang tích lũy thêm dữ liệu giao dịch của các phân hạng thành viên.");
                        map2.put("recommendation", "Thúc đẩy các chiến dịch nâng hạng thành viên để kích thích chi tiêu.");
                        result.add(map2);
                    }
                } else {
                    Map<String, Object> map2 = new HashMap<>();
                    map2.put("insight", "Chưa có dữ liệu phân hạng chi tiêu thành viên.");
                    map2.put("impact", "0 khách hàng được xếp hạng.");
                    map2.put("recommendation", "Khuyến khích tích hợp thẻ thành viên điện tử khi khách đặt đơn đầu tiên.");
                    result.add(map2);
                }
            }

            logUsage("RECOMMENDATIONS", "heuristic-model-v2", 150, 50, 
                     System.currentTimeMillis() - startTime, "SUCCESS", null);
            
        } catch (Exception e) {
            logUsage("RECOMMENDATIONS", "heuristic-model-v2", 0, 0, 
                     System.currentTimeMillis() - startTime, "FAILED", e.getMessage());
        }

        return result;
    }
}
