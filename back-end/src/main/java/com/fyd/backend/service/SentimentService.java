package com.fyd.backend.service;

import com.fyd.backend.entity.Review;
import com.fyd.backend.repository.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * Service for AI-powered sentiment analysis of product reviews.
 * Uses Groq API (or other LLM) to analyze customer sentiment.
 */
@Service
public class SentimentService {

    @Value("${groq.api.key}")
    private String apiKey;

    @Value("${groq.api.model}")
    private String model;

    @Value("${groq.api.url}")
    private String apiUrl;

    @Autowired
    private ReviewRepository reviewRepository;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Sentiment analysis result.
     */
    public static class SentimentResult {
        private String label; // POSITIVE, NEUTRAL, NEGATIVE
        private double score; // 0.0 to 1.0 confidence score
        private String summary; // Short summary of key points

        public SentimentResult() {}

        public SentimentResult(String label, double score, String summary) {
            this.label = label;
            this.score = score;
            this.summary = summary;
        }

        public String getLabel() { return label; }
        public void setLabel(String label) { this.label = label; }
        public double getScore() { return score; }
        public void setScore(double score) { this.score = score; }
        public String getSummary() { return summary; }
        public void setSummary(String summary) { this.summary = summary; }
    }

    /**
     * Analyze sentiment of a review text.
     * 
     * @param reviewText The review content to analyze
     * @return SentimentResult with label, score, and summary
     */
    public SentimentResult analyzeSentiment(String reviewText) {
        if (reviewText == null || reviewText.trim().isEmpty()) {
            return new SentimentResult("NEUTRAL", 0.5, "Không có nội dung để phân tích");
        }

        try {
            String prompt = buildSentimentPrompt(reviewText);
            String response = callGroqAPI(prompt);
            return parseSentimentResponse(response);
        } catch (Exception e) {
            System.err.println("Sentiment analysis failed: " + e.getMessage());
            // Fallback to simple keyword-based analysis
            return fallbackSentimentAnalysis(reviewText);
        }
    }

    /**
     * Analyze sentiment of a review and update the entity.
     * 
     * @param review The review entity
     * @return Updated review with sentiment data
     */
    public Review analyzeAndUpdateReview(Review review) {
        if (review.getContent() == null || review.getContent().trim().isEmpty()) {
            return review;
        }

        SentimentResult result = analyzeSentiment(review.getContent());
        // Note: You would need to add sentimentLabel, sentimentScore fields to Review entity
        // review.setSentimentLabel(result.getLabel());
        // review.setSentimentScore(result.getScore());
        // return reviewRepository.save(review);
        
        return review;
    }

    /**
     * Get sentiment statistics for a product's reviews.
     * 
     * @param productId The product ID
     * @return Map with sentiment breakdown
     */
    public Map<String, Object> getProductSentimentStats(Long productId) {
        List<Review> reviews = reviewRepository.findByProductIdAndStatus(productId, "APPROVED");
        
        if (reviews.isEmpty()) {
            return Map.of(
                "totalReviews", 0,
                "positive", 0,
                "neutral", 0,
                "negative", 0,
                "overallSentiment", "NEUTRAL"
            );
        }

        int positive = 0, neutral = 0, negative = 0;
        List<String> highlights = new ArrayList<>();

        for (Review review : reviews) {
            // Use rating as a proxy for sentiment if no content analysis
            if (review.getRating() >= 4) {
                positive++;
            } else if (review.getRating() == 3) {
                neutral++;
            } else {
                negative++;
            }
        }

        String overallSentiment;
        if (positive > negative && positive > neutral) {
            overallSentiment = "POSITIVE";
        } else if (negative > positive && negative > neutral) {
            overallSentiment = "NEGATIVE";
        } else {
            overallSentiment = "NEUTRAL";
        }

        return Map.of(
            "totalReviews", reviews.size(),
            "positive", positive,
            "neutral", neutral,
            "negative", negative,
            "positivePercent", Math.round((positive * 100.0) / reviews.size()),
            "neutralPercent", Math.round((neutral * 100.0) / reviews.size()),
            "negativePercent", Math.round((negative * 100.0) / reviews.size()),
            "overallSentiment", overallSentiment
        );
    }

    /**
     * Get sentiment trends over time for admin dashboard.
     */
    public Map<String, Object> getSentimentTrends() {
        List<Review> recentReviews = reviewRepository.findAll()
                .stream()
                .filter(r -> "APPROVED".equals(r.getStatus()))
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(100)
                .toList();

        long positive = recentReviews.stream().filter(r -> r.getRating() >= 4).count();
        long negative = recentReviews.stream().filter(r -> r.getRating() <= 2).count();
        long neutral = recentReviews.size() - positive - negative;

        // Calculate average rating
        double avgRating = recentReviews.stream()
                .mapToInt(Review::getRating)
                .average()
                .orElse(0.0);

        return Map.of(
            "period", "Last 100 reviews",
            "positive", positive,
            "neutral", neutral,
            "negative", negative,
            "averageRating", Math.round(avgRating * 10) / 10.0,
            "sentiment", positive > negative ? "POSITIVE" : (negative > positive ? "NEGATIVE" : "NEUTRAL")
        );
    }

    private String buildSentimentPrompt(String reviewText) {
        return String.format("""
            Analyze the sentiment of this Vietnamese product review.
            
            Review: "%s"
            
            Respond in this exact JSON format only:
            {
                "label": "POSITIVE" or "NEUTRAL" or "NEGATIVE",
                "score": 0.0 to 1.0 (confidence),
                "summary": "key points in Vietnamese (max 50 chars)"
            }
            """, reviewText);
    }

    private String callGroqAPI(String prompt) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> message = new HashMap<>();
        message.put("role", "user");
        message.put("content", prompt);

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", List.of(message));
        body.put("max_tokens", 200);
        body.put("temperature", 0.1);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        
        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                apiUrl, HttpMethod.POST, request, Map.class
            );
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> respBody = response.getBody();
                List<Map<String, Object>> choices = (List<Map<String, Object>>) respBody.get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> msgResp = (Map<String, Object>) choices.get(0).get("message");
                    return (String) msgResp.get("content");
                }
            }
        } catch (Exception e) {
            String errorMsg = e.getMessage();
            System.err.println("Sentiment API Error: " + errorMsg);
            
            // Handle DNS resolution error
            if (errorMsg != null && (errorMsg.contains("Failed to resolve") || errorMsg.contains("UnknownHostException"))) {
                System.err.println("⚠️ DNS Resolution Error for api.groq.com");
                throw new RuntimeException("Lỗi kết nối mạng: Không thể kết nối đến API Groq", e);
            }
            
            throw new RuntimeException("API call failed: " + errorMsg, e);
        }
        
        return null;
    }

    private SentimentResult parseSentimentResponse(String response) {
        try {
            // Simple JSON parsing
            String label = "NEUTRAL";
            double score = 0.5;
            String summary = "";

            if (response != null) {
                if (response.contains("\"POSITIVE\"") || response.contains("POSITIVE")) {
                    label = "POSITIVE";
                    score = 0.8;
                } else if (response.contains("\"NEGATIVE\"") || response.contains("NEGATIVE")) {
                    label = "NEGATIVE";
                    score = 0.8;
                }
                
                // Extract summary if present
                int summaryStart = response.indexOf("\"summary\":");
                if (summaryStart > 0) {
                    int valueStart = response.indexOf("\"", summaryStart + 10) + 1;
                    int valueEnd = response.indexOf("\"", valueStart);
                    if (valueEnd > valueStart) {
                        summary = response.substring(valueStart, valueEnd);
                    }
                }
            }

            return new SentimentResult(label, score, summary);
        } catch (Exception e) {
            return new SentimentResult("NEUTRAL", 0.5, "Không thể phân tích");
        }
    }

    private SentimentResult fallbackSentimentAnalysis(String text) {
        String lowerText = text.toLowerCase();
        
        // Vietnamese positive keywords
        String[] positiveWords = {"tốt", "đẹp", "chất lượng", "hài lòng", "tuyệt vời", "xuất sắc",
                "nhanh", "đúng", "thích", "yêu", "ok", "ổn", "đẹp", "mượt", "rẻ", "giá tốt"};
        
        // Vietnamese negative keywords  
        String[] negativeWords = {"tệ", "xấu", "kém", "chậm", "lỗi", "hỏng", "thất vọng",
                "không đẹp", "không tốt", "dở", "tồi", "không hài lòng", "đắt"};

        int positiveCount = 0, negativeCount = 0;
        
        for (String word : positiveWords) {
            if (lowerText.contains(word)) positiveCount++;
        }
        for (String word : negativeWords) {
            if (lowerText.contains(word)) negativeCount++;
        }

        if (positiveCount > negativeCount) {
            return new SentimentResult("POSITIVE", 0.7, "Đánh giá tích cực");
        } else if (negativeCount > positiveCount) {
            return new SentimentResult("NEGATIVE", 0.7, "Đánh giá tiêu cực");
        } else {
            return new SentimentResult("NEUTRAL", 0.5, "Đánh giá trung lập");
        }
    }
}
