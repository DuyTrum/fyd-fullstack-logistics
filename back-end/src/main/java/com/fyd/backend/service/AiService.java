package com.fyd.backend.service;

import com.fyd.backend.dto.AiAdminSummary;
import com.fyd.backend.dto.AiChatResponse;
import com.fyd.backend.dto.AiProductResponse;
import com.fyd.backend.dto.AnomalyReport;
import com.fyd.backend.entity.Customer;
import com.fyd.backend.entity.Order;
import com.fyd.backend.entity.Product;
import com.fyd.backend.entity.ProductVariant;
import com.fyd.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AiService {

    @Value("${groq.api.key}")
    private String apiKey;

    @Value("${groq.api.model}")
    private String model;

    @Value("${groq.api.url}")
    private String apiUrl;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductVariantRepository variantRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    private CustomerRepository customerRepository;

    private final WebClient webClient;

    public AiService() {
        this.webClient = WebClient.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
                .build();
    }

    /**
     * Chat with AI for shop customers - answers questions about products
     * Supports personalized responses when customerId is provided
     */
    public AiChatResponse chatForShop(String userMessage) {
        return chatForShop(userMessage, null);
    }

    /**
     * Chat with AI for shop customers with personalization
     */
    public AiChatResponse chatForShop(String userMessage, Long customerId) {
        try {
            // Get product context
            String productContext = buildProductContext();
            
            // Get customer context if logged in
            String customerContext = buildCustomerContext(customerId);
            
            String systemPrompt = """
                Bạn là trợ lý FYD Shop. Trả lời ngắn gọn, thân thiện.
                
                %s
                
                SẢN PHẨM:
                %s
                
                CHÍNH SÁCH CỬA HÀNG:
                - Miễn phí ship cho đơn từ 500.000đ
                - Thành viên Vàng/Kim Cương được miễn phí ship mọi đơn
                - Đổi trả miễn phí trong 30 ngày
                - Tích điểm 1%% giá trị đơn hàng
                
                QUY TẮC BẮT BUỘC:
                1. Khi giới thiệu sản phẩm, PHẢI dùng CHÍNH XÁC format này: PRODUCT[ID|Tên|Giá|Ảnh]
                2. ID là số, Giá là số không có dấu phẩy, Ảnh là URL
                3. VÍ DỤ ĐÚNG: "Dạ có PRODUCT[5|Áo Polo|450000|http://localhost:8080/uploads/polo.jpg] ạ!"
                4. KHÔNG được viết tên sản phẩm ra ngoài format PRODUCT[...]
                5. Mỗi sản phẩm phải nằm trong PRODUCT[...]
                6. Nếu khách hỏi về hạng thành viên/điểm/ưu đãi, hãy trả lời dựa trên thông tin khách hàng ở trên
                """.formatted(customerContext, productContext);

            String fullPrompt = systemPrompt + "\n\nKhách: " + userMessage;
            
            return callGroqAPI(fullPrompt);
        } catch (Exception e) {
            return AiChatResponse.error("Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.");
        }
    }

    /**
     * Build customer context for personalized AI responses
     */
    private String buildCustomerContext(Long customerId) {
        if (customerId == null) {
            return "KHÁCH HÀNG: Khách vãng lai (chưa đăng nhập)";
        }
        
        try {
            Optional<Customer> customerOpt = customerRepository.findById(customerId);
            if (customerOpt.isEmpty()) {
                return "KHÁCH HÀNG: Khách vãng lai (chưa đăng nhập)";
            }
            
            Customer customer = customerOpt.get();
            NumberFormat vndFormat = NumberFormat.getInstance(new Locale("vi", "VN"));
            
            StringBuilder context = new StringBuilder();
            context.append("KHÁCH HÀNG ĐANG CHAT:\n");
            context.append("- Tên: ").append(customer.getFullName()).append("\n");
            
            if (customer.getTier() != null) {
                context.append("- Hạng thành viên: ").append(customer.getTier().getName());
                if (customer.getTier().getDiscountPercent() != null && 
                    customer.getTier().getDiscountPercent().compareTo(BigDecimal.ZERO) > 0) {
                    context.append(" (giảm ").append(customer.getTier().getDiscountPercent()).append("% mỗi đơn)");
                }
                context.append("\n");
                if (customer.getTier().getBenefits() != null) {
                    context.append("- Quyền lợi: ").append(customer.getTier().getBenefits()).append("\n");
                }
            } else {
                context.append("- Hạng thành viên: Thành viên mới\n");
            }
            
            context.append("- Điểm tích lũy: ").append(customer.getPoints() != null ? customer.getPoints() : 0).append(" điểm\n");
            context.append("- Tổng chi tiêu: ").append(vndFormat.format(customer.getTotalSpent() != null ? customer.getTotalSpent() : BigDecimal.ZERO)).append("đ\n");
            context.append("- Số đơn hàng: ").append(customer.getTotalOrders() != null ? customer.getTotalOrders() : 0).append(" đơn");
            
            // Get recent orders
            List<Order> recentOrders = orderRepository.findByCustomerId(customerId);
            if (recentOrders != null && !recentOrders.isEmpty()) {
                context.append("\n- Đơn gần đây: ");
                recentOrders.stream()
                    .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                    .limit(3)
                    .forEach(order -> {
                        context.append(order.getOrderCode()).append(" (").append(order.getStatus()).append("), ");
                    });
            }
            
            return context.toString();
        } catch (Exception e) {
            return "KHÁCH HÀNG: Đã đăng nhập";
        }
    }

    /**
     * AI Size Advisor - suggests size based on height/weight and category-specific measurements
     */
    public AiChatResponse suggestSize(Long productId, Double heightCm, Double weightKg, String preferredFit,
                                       Double bust, Double waist, Double footLength) {
        try {
            Optional<Product> productOpt = productRepository.findById(productId);
            if (productOpt.isEmpty()) {
                return AiChatResponse.error("Không tìm thấy sản phẩm");
            }
            
            Product product = productOpt.get();
            
            // Get available sizes
            List<String> availableSizes = product.getVariants() != null 
                ? product.getVariants().stream()
                    .filter(v -> v.getStockQuantity() > 0 && v.getSize() != null)
                    .map(v -> v.getSize().getName())
                    .distinct()
                    .collect(Collectors.toList())
                : Collections.emptyList();
            
            if (availableSizes.isEmpty()) {
                return AiChatResponse.error("Sản phẩm hiện không có size nào còn hàng");
            }
            
            String fit = preferredFit != null ? preferredFit : "regular";
            String categoryName = product.getCategory() != null ? product.getCategory().getName() : "Thời trang";
            
            // Build category-specific size chart and measurements
            String sizeChart = buildCategorySizeChart(categoryName);
            String additionalMeasurements = buildAdditionalMeasurements(categoryName, bust, waist, footLength);
            
            String prompt = """
                Bạn là chuyên gia tư vấn size quần áo Việt Nam. Dựa trên thông tin sau, hãy gợi ý SIZE PHÙ HỢP NHẤT:
                
                THÔNG TIN KHÁCH HÀNG:
                - Chiều cao: %.0f cm
                - Cân nặng: %.0f kg
                - Kiểu dáng mong muốn: %s (regular = vừa vặn, slim = ôm, loose = rộng thoải mái)
                %s
                
                SẢN PHẨM: %s
                DANH MỤC: %s
                CÁC SIZE CÒN HÀNG: %s
                
                BẢNG SIZE THAM KHẢO THEO LOẠI SẢN PHẨM:
                %s
                
                QUY TẮC TRẢ LỜI:
                1. Chỉ gợi ý 1 size cụ thể từ danh sách có sẵn
                2. Giải thích ngắn gọn lý do (2-3 câu)
                3. Đề cập nếu size này có thể hơi rộng/chật dựa trên số đo
                4. Nếu khách chọn kiểu slim, gợi ý size nhỏ hơn 1 bậc; nếu loose, gợi ý size lớn hơn 1 bậc
                5. Lưu ý đặc thù size Việt Nam (thường nhỏ hơn size Âu-Mỹ)
                6. Format: "👕 Size [X] sẽ phù hợp với bạn. [Lý do chi tiết dựa trên số đo]"
                """.formatted(
                    heightCm, weightKg, fit,
                    additionalMeasurements,
                    product.getName(),
                    categoryName,
                    String.join(", ", availableSizes),
                    sizeChart
                );
            
            return callGroqAPI(prompt);
        } catch (Exception e) {
            return AiChatResponse.error("Lỗi khi tư vấn size: " + e.getMessage());
        }
    }
    
    /**
     * Build category-specific size chart for AI prompt
     */
    private String buildCategorySizeChart(String categoryName) {
        String lowerCategory = categoryName.toLowerCase();
        
        if (lowerCategory.contains("áo") || lowerCategory.contains("shirt") || lowerCategory.contains("polo") 
            || lowerCategory.contains("hoodie") || lowerCategory.contains("jacket") || lowerCategory.contains("khoác")) {
            return """
                ÁO (Size Việt Nam):
                | Size | Chiều cao | Cân nặng | Ngực (cm) | Vai (cm) |
                |------|-----------|----------|-----------|----------|
                | S    | 155-162   | 45-55    | 84-88     | 38-40    |
                | M    | 160-168   | 55-65    | 88-92     | 40-42    |
                | L    | 165-175   | 65-75    | 92-96     | 42-44    |
                | XL   | 170-180   | 75-85    | 96-100    | 44-46    |
                | XXL  | 175-185   | 85-95    | 100-106   | 46-48    |
                """;
        }
        
        if (lowerCategory.contains("quần") || lowerCategory.contains("pants") || lowerCategory.contains("jean")
            || lowerCategory.contains("short") || lowerCategory.contains("jogger")) {
            return """
                QUẦN (Size Việt Nam):
                | Size | Chiều cao | Cân nặng | Vòng eo (cm) | Vòng hông (cm) |
                |------|-----------|----------|-------------|----------------|
                | S/28 | 155-162   | 45-55    | 68-72       | 86-90          |
                | M/29 | 160-168   | 55-65    | 72-76       | 90-94          |
                | L/30 | 165-175   | 65-75    | 76-82       | 94-98          |
                | XL/31| 170-180   | 75-85    | 82-88       | 98-102         |
                | XXL/32| 175-185  | 85-95    | 88-94       | 102-106        |
                """;
        }
        
        if (lowerCategory.contains("giày") || lowerCategory.contains("shoe") || lowerCategory.contains("sneaker")
            || lowerCategory.contains("boot") || lowerCategory.contains("sandal") || lowerCategory.contains("dép")) {
            return """
                GIÀY (Size Việt Nam/EU):
                | Size VN | Size EU | Chiều dài bàn chân (cm) |
                |---------|---------|------------------------|
                | 38      | 38      | 24.0-24.5              |
                | 39      | 39      | 24.5-25.0              |
                | 40      | 40      | 25.0-25.5              |
                | 41      | 41      | 25.5-26.0              |
                | 42      | 42      | 26.0-26.5              |
                | 43      | 43      | 26.5-27.0              |
                | 44      | 44      | 27.0-27.5              |
                * Nếu bàn chân rộng, nên tăng 0.5 size
                """;
        }
        
        // Default general size chart
        return """
            SIZE CHUNG (Thời trang Việt Nam):
            | Size | Chiều cao | Cân nặng |
            |------|-----------|----------|
            | S    | 155-162   | 45-55    |
            | M    | 160-168   | 55-65    |
            | L    | 165-175   | 65-75    |
            | XL   | 170-180   | 75-85    |
            | XXL  | 175-185   | 85-95    |
            """;
    }
    
    /**
     * Build additional measurements prompt section
     */
    private String buildAdditionalMeasurements(String categoryName, Double bust, Double waist, Double footLength) {
        StringBuilder sb = new StringBuilder();
        String lowerCategory = categoryName.toLowerCase();
        
        if (bust != null && (lowerCategory.contains("áo") || lowerCategory.contains("shirt"))) {
            sb.append("- Vòng ngực: ").append(String.format("%.0f", bust)).append(" cm\n");
        }
        if (waist != null && (lowerCategory.contains("quần") || lowerCategory.contains("pants") || lowerCategory.contains("jean"))) {
            sb.append("- Vòng eo: ").append(String.format("%.0f", waist)).append(" cm\n");
        }
        if (footLength != null && (lowerCategory.contains("giày") || lowerCategory.contains("shoe") || lowerCategory.contains("sneaker"))) {
            sb.append("- Chiều dài bàn chân: ").append(String.format("%.1f", footLength)).append(" cm\n");
        }
        
        return sb.length() > 0 ? sb.toString() : "";
    }

    /**
     * Chat with AI for admin - answers questions about business metrics
     */
    public AiChatResponse chatForAdmin(String userMessage) {
        try {
            String businessContext = buildBusinessContext();
            String productContext = buildProductContextForAdmin();
            
            String systemPrompt = """
                Bạn là trợ lý phân tích kinh doanh cho FYD. Trả lời ngắn gọn, đi thẳng vào vấn đề.
                
                DỮ LIỆU KINH DOANH:
                %s
                
                SẢN PHẨM:
                %s
                
                QUY TẮC TRẢ LỜI:
                - KHÔNG chào hỏi, trả lời thẳng câu hỏi
                - Dựa vào dữ liệu thực tế
                - Đưa con số cụ thể
                - Gợi ý hành động nếu cần
                - Tối đa 3-4 câu
                
                QUY TẮC HIỂN THỊ SẢN PHẨM:
                Khi nhắc đến sản phẩm cụ thể, PHẢI dùng format: PRODUCT[ID|Tên|Giá|Ảnh]
                VÍ DỤ: "Sản phẩm PRODUCT[5|Áo Polo|450000|http://localhost:8080/uploads/polo.jpg] sắp hết"
                """.formatted(businessContext, productContext);

            String fullPrompt = systemPrompt + "\n\nCâu hỏi: " + userMessage;
            
            return callGroqAPI(fullPrompt);
        } catch (Exception e) {
            return AiChatResponse.error("Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.");
        }
    }

    /**
     * Get auto-generated admin summary
     */
    public AiAdminSummary getAdminSummary() {
        AiAdminSummary summary = new AiAdminSummary();
        
        LocalDateTime todayStart = LocalDateTime.now().with(LocalTime.MIN);
        LocalDateTime yesterdayStart = todayStart.minusDays(1);
        
        // Today's revenue
        BigDecimal todayRevenue = orderRepository.getRevenueFrom(todayStart);
        if (todayRevenue == null) todayRevenue = BigDecimal.ZERO;
        summary.setTodayRevenue(todayRevenue);
        
        // Today's orders count
        Long todayOrderCount = orderRepository.countFrom(todayStart);
        summary.setTodayOrders(todayOrderCount != null ? todayOrderCount.intValue() : 0);
        
        // Pending orders
        Long pendingCount = orderRepository.countByStatus("PENDING");
        summary.setPendingOrders(pendingCount != null ? pendingCount.intValue() : 0);
        
        // Revenue change
        BigDecimal yesterdayRevenue = orderRepository.getRevenueBetween(yesterdayStart, todayStart);
        if (yesterdayRevenue == null || yesterdayRevenue.compareTo(BigDecimal.ZERO) == 0) {
            summary.setRevenueChange("N/A");
        } else {
            BigDecimal change = todayRevenue.subtract(yesterdayRevenue)
                .divide(yesterdayRevenue, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
            String sign = change.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "";
            summary.setRevenueChange(sign + change.setScale(1, RoundingMode.HALF_UP) + "%");
        }
        
        // Top products (last 7 days)
        LocalDateTime weekAgo = todayStart.minusDays(7);
        List<Object[]> topProducts = orderItemRepository.getTopProductsByRevenueFrom(weekAgo);
        summary.setTopProducts(topProducts.stream()
            .limit(3)
            .map(row -> row[1].toString())
            .collect(Collectors.toList()));
        
        // Low stock alerts
        List<ProductVariant> lowStock = variantRepository.findLowStock(6);
        summary.setInventoryAlerts(lowStock.stream()
            .limit(3)
            .map(v -> v.getProduct().getName() + " (" + v.getSkuVariant() + ") - còn " + v.getStockQuantity())
            .collect(Collectors.toList()));
        
        // Generate AI summary text
        try {
            String summaryPrompt = buildSummaryPrompt(summary);
            AiChatResponse aiResponse = callGroqAPI(summaryPrompt);
            if (aiResponse.isSuccess()) {
                summary.setSummaryText(aiResponse.getReply());
            } else {
                summary.setSummaryText(buildFallbackSummary(summary));
            }
        } catch (Exception e) {
            summary.setSummaryText(buildFallbackSummary(summary));
        }
        
        return summary;
    }

    private String buildProductContext() {
        List<Product> products = productRepository.findAll();
        StringBuilder context = new StringBuilder();
        
        NumberFormat vndFormat = NumberFormat.getInstance(new Locale("vi", "VN"));
        
        for (Product p : products) {
            context.append("- ").append(p.getName());
            context.append(" | ID: ").append(p.getId());
            context.append(" | Giá: ").append(vndFormat.format(p.getBasePrice())).append("đ");
            context.append(" | SKU: ").append(p.getSku());
            
            // Add primary image URL
            if (p.getImages() != null && !p.getImages().isEmpty()) {
                p.getImages().stream()
                    .filter(img -> Boolean.TRUE.equals(img.getIsPrimary()))
                    .findFirst()
                    .ifPresent(img -> context.append(" | Ảnh: ").append(img.getImageUrl()));
            }
            
            if (p.getVariants() != null && !p.getVariants().isEmpty()) {
                List<String> variants = p.getVariants().stream()
                    .filter(v -> v.getStockQuantity() > 0)
                    .map(v -> v.getSize() + "/" + v.getColor() + "(còn " + v.getStockQuantity() + ")")
                    .limit(5)
                    .collect(Collectors.toList());
                if (!variants.isEmpty()) {
                    context.append(" | Có sẵn: ").append(String.join(", ", variants));
                }
            }
            context.append("\n");
            
            if (context.length() > 5000) break; // Increase limit for images
        }
        
        return context.toString();
    }

    private String buildProductContextForAdmin() {
        List<Product> products = productRepository.findAll();
        StringBuilder context = new StringBuilder();
        
        for (Product p : products) {
            context.append("- ID: ").append(p.getId());
            context.append(" | ").append(p.getName());
            context.append(" | Giá: ").append(p.getBasePrice().intValue());
            context.append(" | SKU: ").append(p.getSku());
            
            // Add primary image URL
            if (p.getImages() != null && !p.getImages().isEmpty()) {
                p.getImages().stream()
                    .filter(img -> Boolean.TRUE.equals(img.getIsPrimary()))
                    .findFirst()
                    .or(() -> p.getImages().stream().findFirst())
                    .ifPresent(img -> context.append(" | Ảnh: ").append(img.getImageUrl()));
            }
            
            // Add stock info
            if (p.getVariants() != null && !p.getVariants().isEmpty()) {
                int totalStock = p.getVariants().stream()
                    .mapToInt(v -> v.getStockQuantity() != null ? v.getStockQuantity() : 0)
                    .sum();
                context.append(" | Tồn kho: ").append(totalStock);
            }
            
            context.append("\n");
            
            if (context.length() > 3000) break; // Limit for token size
        }
        
        return context.toString();
    }

    private String buildBusinessContext() {
        StringBuilder context = new StringBuilder();
        
        LocalDateTime todayStart = LocalDateTime.now().with(LocalTime.MIN);
        LocalDateTime weekAgo = todayStart.minusDays(7);
        
        NumberFormat vndFormat = NumberFormat.getInstance(new Locale("vi", "VN"));
        
        // Revenue
        BigDecimal todayRevenue = orderRepository.getRevenueFrom(todayStart);
        if (todayRevenue == null) todayRevenue = BigDecimal.ZERO;
        context.append("Doanh thu hôm nay: ").append(vndFormat.format(todayRevenue)).append("đ\n");
        
        BigDecimal weekRevenue = orderRepository.getRevenueFrom(weekAgo);
        if (weekRevenue == null) weekRevenue = BigDecimal.ZERO;
        context.append("Doanh thu 7 ngày qua: ").append(vndFormat.format(weekRevenue)).append("đ\n");
        
        // Orders
        context.append("Đơn chờ xử lý: ").append(orderRepository.countByStatus("PENDING")).append("\n");
        context.append("Đơn đang giao: ").append(orderRepository.countByStatus("SHIPPING")).append("\n");
        context.append("Đơn hoàn thành: ").append(orderRepository.countByStatus("DELIVERED")).append("\n");
        
        // Low stock - with full product info for PRODUCT format
        List<ProductVariant> lowStock = variantRepository.findLowStock(6);
        context.append("Sản phẩm sắp hết hàng: ").append(lowStock.size()).append(" items\n");
        for (ProductVariant v : lowStock.stream().limit(5).collect(Collectors.toList())) {
            Product p = v.getProduct();
            String imageUrl = "";
            if (p.getImages() != null && !p.getImages().isEmpty()) {
                imageUrl = p.getImages().stream()
                    .filter(img -> Boolean.TRUE.equals(img.getIsPrimary()))
                    .findFirst()
                    .or(() -> p.getImages().stream().findFirst())
                    .map(img -> img.getImageUrl())
                    .orElse("");
            }
            // Provide complete info for PRODUCT format: ID|Name|Price|Image
            context.append("  - PRODUCT[").append(p.getId())
                   .append("|").append(p.getName())
                   .append("|").append(p.getBasePrice().intValue())
                   .append("|").append(imageUrl).append("]")
                   .append(" (SKU: ").append(v.getSkuVariant())
                   .append(", còn ").append(v.getStockQuantity()).append(")\n");
        }
        
        // Top products
        List<Object[]> topProducts = orderItemRepository.getTopProductsByRevenueFrom(weekAgo);
        context.append("Top sản phẩm tuần này:\n");
        for (int i = 0; i < Math.min(3, topProducts.size()); i++) {
            Object[] row = topProducts.get(i);
            context.append("  ").append(i + 1).append(". ").append(row[1])
                   .append(" - ").append(row[2]).append(" đơn, ")
                   .append(vndFormat.format(((Number) row[3]).longValue())).append("đ\n");
        }
        
        return context.toString();
    }

    private String buildSummaryPrompt(AiAdminSummary data) {
        NumberFormat vndFormat = NumberFormat.getInstance(new Locale("vi", "VN"));
        
        return """
            Hãy tạo một bản tóm tắt ngắn gọn (2-3 câu) về tình hình kinh doanh hôm nay dựa trên dữ liệu:
            - Doanh thu: %sđ (%s so với hôm qua)
            - Số đơn hàng: %d đơn (%d đơn chờ xử lý)
            - Sản phẩm bán chạy: %s
            - Cảnh báo tồn kho: %d sản phẩm sắp hết
            
            Hãy viết ngắn gọn, chuyên nghiệp, bằng tiếng Việt.
            """.formatted(
                vndFormat.format(data.getTodayRevenue()),
                data.getRevenueChange(),
                data.getTodayOrders(),
                data.getPendingOrders(),
                data.getTopProducts().isEmpty() ? "Chưa có" : String.join(", ", data.getTopProducts()),
                data.getInventoryAlerts().size()
            );
    }

    private String buildFallbackSummary(AiAdminSummary data) {
        NumberFormat vndFormat = NumberFormat.getInstance(new Locale("vi", "VN"));
        return String.format(
            "Hôm nay: Doanh thu %sđ với %d đơn hàng. Có %d đơn đang chờ xử lý và %d sản phẩm cần bổ sung tồn kho.",
            vndFormat.format(data.getTodayRevenue()),
            data.getTodayOrders(),
            data.getPendingOrders(),
            data.getInventoryAlerts().size()
        );
    }

    private AiChatResponse callGroqAPI(String prompt) {
        try {
            // Build OpenAI-compatible request for Groq
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            
            List<Map<String, String>> messages = new ArrayList<>();
            messages.add(Map.of("role", "user", "content", prompt));
            requestBody.put("messages", messages);
            
            requestBody.put("temperature", 0.7);
            requestBody.put("max_tokens", 2000);

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
                    Map message = (Map) choice.get("message");
                    if (message != null) {
                        String text = (String) message.get("content");
                        if (text != null && !text.isEmpty()) {
                            return AiChatResponse.success(text.trim());
                        }
                    }
                }
            }
            
            // Check for error in response
            if (response != null && response.containsKey("error")) {
                Map errorMap = (Map) response.get("error");
                String errorMessage = errorMap.get("message").toString();
                System.err.println("Groq API Error: " + errorMessage);
                return AiChatResponse.error("Lỗi từ AI: " + errorMessage);
            }
            
            return AiChatResponse.error("Không nhận được phản hồi từ AI");
        } catch (Exception e) {
            e.printStackTrace();
            String errorMsg = e.getMessage();
            
            // Handle 429 rate limit error
            if (errorMsg != null && errorMsg.contains("429")) {
                return AiChatResponse.error("AI đang bận, vui lòng đợi 1-2 phút rồi thử lại.");
            }
            
            // Handle 401 unauthorized
            if (errorMsg != null && errorMsg.contains("401")) {
                return AiChatResponse.error("API key không hợp lệ.");
            }
            
            return AiChatResponse.error("Lỗi kết nối AI: " + errorMsg);
        }
    }

    /**
     * Generate product description using AI
     */
    public AiProductResponse generateProductDescription(String productName, String category) {
        try {
            String prompt = """
                Bạn là chuyên gia viết mô tả sản phẩm thời trang. Hãy viết mô tả sản phẩm hấp dẫn cho:
                
                Tên sản phẩm: %s
                Danh mục: %s
                
                Yêu cầu:
                - Mô tả ngắn gọn, 2-3 câu
                - Nhấn mạnh chất liệu, kiểu dáng, phong cách
                - Sử dụng ngôn ngữ bán hàng chuyên nghiệp
                - Viết bằng tiếng Việt
                - KHÔNG thêm tiêu đề hay định dạng đặc biệt
                """.formatted(productName, category != null ? category : "Thời trang");

            AiChatResponse response = callGroqAPI(prompt);
            if (response.isSuccess()) {
                return AiProductResponse.descriptionOnly(response.getReply());
            }
            return AiProductResponse.error(response.getError());
        } catch (Exception e) {
            return AiProductResponse.error("Lỗi khi sinh mô tả: " + e.getMessage());
        }
    }

    /**
     * Suggest category and keywords for a product
     */
    public AiProductResponse suggestCategoryAndKeywords(String productName, String description) {
        try {
            // Get existing categories
            List<String> existingCategories = productRepository.findAll().stream()
                .map(p -> p.getCategory() != null ? p.getCategory().getName() : null)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

            String categoriesList = existingCategories.isEmpty() 
                ? "Áo, Quần, Giày, Túi, Phụ kiện" 
                : String.join(", ", existingCategories);

            String prompt = """
                Phân tích sản phẩm thời trang sau và gợi ý danh mục phù hợp:
                
                Tên sản phẩm: %s
                Mô tả: %s
                
                Các danh mục có sẵn: %s
                
                Trả lời theo format CHÍNH XÁC như sau (không thêm gì khác):
                CATEGORY: [tên danh mục phù hợp nhất]
                KEYWORDS: [từ khóa 1], [từ khóa 2], [từ khóa 3]
                """.formatted(
                    productName, 
                    description != null ? description : "Chưa có mô tả",
                    categoriesList
                );

            AiChatResponse response = callGroqAPI(prompt);
            if (response.isSuccess()) {
                String reply = response.getReply();
                String category = "";
                List<String> keywords = new ArrayList<>();

                // Parse response
                String[] lines = reply.split("\n");
                for (String line : lines) {
                    if (line.toUpperCase().startsWith("CATEGORY:")) {
                        category = line.substring(9).trim();
                    } else if (line.toUpperCase().startsWith("KEYWORDS:")) {
                        String keywordsStr = line.substring(9).trim();
                        keywords = Arrays.stream(keywordsStr.split(","))
                            .map(String::trim)
                            .filter(s -> !s.isEmpty())
                            .collect(Collectors.toList());
                    }
                }

                return AiProductResponse.categoryOnly(category, keywords);
            }
            return AiProductResponse.error(response.getError());
        } catch (Exception e) {
            return AiProductResponse.error("Lỗi khi gợi ý danh mục: " + e.getMessage());
        }
    }

    /**
     * Detect anomalies in business data
     */
    public List<AnomalyReport> detectAnomalies() {
        List<AnomalyReport> anomalies = new ArrayList<>();
        
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime todayStart = now.with(LocalTime.MIN);
        LocalDateTime yesterdayStart = todayStart.minusDays(1);
        LocalDateTime weekAgo = todayStart.minusDays(7);
        
        NumberFormat vndFormat = NumberFormat.getInstance(new Locale("vi", "VN"));

        // 1. Check revenue anomalies
        try {
            BigDecimal todayRevenue = orderRepository.getRevenueFrom(todayStart);
            BigDecimal yesterdayRevenue = orderRepository.getRevenueBetween(yesterdayStart, todayStart);
            
            if (todayRevenue == null) todayRevenue = BigDecimal.ZERO;
            if (yesterdayRevenue == null) yesterdayRevenue = BigDecimal.ZERO;
            
            // Revenue drop more than 50%
            if (yesterdayRevenue.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal dropPercent = yesterdayRevenue.subtract(todayRevenue)
                    .divide(yesterdayRevenue, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
                
                if (dropPercent.compareTo(BigDecimal.valueOf(50)) > 0) {
                    anomalies.add(new AnomalyReport(
                        AnomalyReport.AnomalyType.REVENUE,
                        AnomalyReport.Severity.HIGH,
                        "Doanh thu giảm mạnh",
                        "Doanh thu hôm nay giảm " + dropPercent.setScale(0, RoundingMode.HALF_UP) + "% so với hôm qua",
                        vndFormat.format(todayRevenue) + "đ",
                        "Kiểm tra các chiến dịch marketing hoặc vấn đề kỹ thuật"
                    ));
                }
            }
            
            // No revenue today but had yesterday
            if (todayRevenue.compareTo(BigDecimal.ZERO) == 0 && 
                yesterdayRevenue.compareTo(BigDecimal.ZERO) > 0 && 
                now.getHour() >= 12) {
                anomalies.add(new AnomalyReport(
                    AnomalyReport.AnomalyType.REVENUE,
                    AnomalyReport.Severity.MEDIUM,
                    "Chưa có doanh thu hôm nay",
                    "Đã qua nửa ngày nhưng chưa có đơn hàng nào hoàn tất",
                    "0đ",
                    "Kiểm tra trạng thái website và đơn hàng đang chờ xử lý"
                ));
            }
        } catch (Exception e) {
            // Skip revenue anomaly check on error
        }

        // 2. Check order anomalies
        try {
            Long pendingCancelCount = orderRepository.countByStatus("PENDING_CANCEL");
            if (pendingCancelCount != null && pendingCancelCount >= 3) {
                anomalies.add(new AnomalyReport(
                    AnomalyReport.AnomalyType.ORDER,
                    AnomalyReport.Severity.MEDIUM,
                    "Nhiều đơn hàng chờ hủy",
                    pendingCancelCount + " đơn hàng đang chờ xác nhận hủy",
                    pendingCancelCount + " đơn",
                    "Xem xét và xử lý các yêu cầu hủy đơn"
                ));
            }

            Long pendingCount = orderRepository.countByStatus("PENDING");
            if (pendingCount != null && pendingCount >= 10) {
                anomalies.add(new AnomalyReport(
                    AnomalyReport.AnomalyType.ORDER,
                    AnomalyReport.Severity.MEDIUM,
                    "Tồn đọng đơn hàng",
                    pendingCount + " đơn hàng đang chờ xử lý",
                    pendingCount + " đơn",
                    "Cần xử lý đơn hàng để tránh delay giao hàng"
                ));
            }
        } catch (Exception e) {
            // Skip order anomaly check on error
        }

        // 3. Check inventory anomalies
        try {
            List<ProductVariant> outOfStock = variantRepository.findLowStock(0);
            if (outOfStock != null && outOfStock.size() >= 5) {
                anomalies.add(new AnomalyReport(
                    AnomalyReport.AnomalyType.INVENTORY,
                    AnomalyReport.Severity.HIGH,
                    "Nhiều sản phẩm hết hàng",
                    outOfStock.size() + " biến thể sản phẩm đã hết hàng hoàn toàn",
                    outOfStock.size() + " SKU",
                    "Liên hệ nhà cung cấp để nhập thêm hàng"
                ));
            }

            List<ProductVariant> lowStock = variantRepository.findLowStock(6);
            int criticalLowStock = (int) lowStock.stream()
                .filter(v -> v.getStockQuantity() <= 2 && v.getStockQuantity() > 0)
                .count();
            
            if (criticalLowStock >= 5) {
                anomalies.add(new AnomalyReport(
                    AnomalyReport.AnomalyType.INVENTORY,
                    AnomalyReport.Severity.MEDIUM,
                    "Sản phẩm sắp hết hàng",
                    criticalLowStock + " biến thể sản phẩm còn dưới 3 sản phẩm",
                    criticalLowStock + " SKU",
                    "Lên kế hoạch nhập hàng bổ sung"
                ));
            }
        } catch (Exception e) {
            // Skip inventory anomaly check on error
        }

        return anomalies;
    }

    /**
     * AI Flash Sale Suggestions - analyzes sales data and inventory to recommend products for flash sales
     */
    public AiChatResponse suggestFlashSaleProducts() {
        try {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime weekAgo = now.minusDays(7);
            LocalDateTime monthAgo = now.minusDays(30);
            
            NumberFormat vndFormat = NumberFormat.getInstance(new Locale("vi", "VN"));
            
            StringBuilder dataContext = new StringBuilder();
            
            // 1. Top selling products (last 7 days)
            List<Object[]> topProducts = orderItemRepository.getTopProductsByRevenueFrom(weekAgo);
            dataContext.append("TOP SẢN PHẨM BÁN CHẠY (7 ngày qua):\n");
            for (int i = 0; i < Math.min(10, topProducts.size()); i++) {
                Object[] row = topProducts.get(i);
                dataContext.append(String.format("  %d. ID:%s | %s | %s đơn | Doanh thu: %sđ\n",
                    i + 1, row[0], row[1], row[2], vndFormat.format(((Number) row[3]).longValue())));
            }
            
            // 2. Products with high stock (slow-moving, potential flash sale candidates)
            List<Product> allProducts = productRepository.findAll();
            dataContext.append("\nSẢN PHẨM TỒN KHO CAO (cần đẩy hàng):\n");
            List<Product> highStockProducts = allProducts.stream()
                .filter(p -> p.getVariants() != null && !p.getVariants().isEmpty())
                .sorted((a, b) -> {
                    int stockA = a.getVariants().stream().mapToInt(v -> v.getStockQuantity() != null ? v.getStockQuantity() : 0).sum();
                    int stockB = b.getVariants().stream().mapToInt(v -> v.getStockQuantity() != null ? v.getStockQuantity() : 0).sum();
                    return stockB - stockA;
                })
                .limit(10)
                .collect(Collectors.toList());
            
            for (Product p : highStockProducts) {
                int totalStock = p.getVariants().stream()
                    .mapToInt(v -> v.getStockQuantity() != null ? v.getStockQuantity() : 0).sum();
                String categoryName = p.getCategory() != null ? p.getCategory().getName() : "N/A";
                dataContext.append(String.format("  - ID:%d | %s | Danh mục: %s | Giá: %sđ | Tồn kho: %d\n",
                    p.getId(), p.getName(), categoryName, vndFormat.format(p.getBasePrice()), totalStock));
            }
            
            // 3. Revenue summary
            BigDecimal weekRevenue = orderRepository.getRevenueFrom(weekAgo);
            BigDecimal monthRevenue = orderRepository.getRevenueFrom(monthAgo);
            dataContext.append(String.format("\nDOANH THU:\n  - 7 ngày qua: %sđ\n  - 30 ngày qua: %sđ\n",
                vndFormat.format(weekRevenue != null ? weekRevenue : BigDecimal.ZERO),
                vndFormat.format(monthRevenue != null ? monthRevenue : BigDecimal.ZERO)));
            
            // 4. All available products for selection
            dataContext.append("\nDANH SÁCH SẢN PHẨM (để chọn Flash Sale):\n");
            for (Product p : allProducts) {
                int totalStock = p.getVariants() != null 
                    ? p.getVariants().stream().mapToInt(v -> v.getStockQuantity() != null ? v.getStockQuantity() : 0).sum() 
                    : 0;
                if (totalStock > 0) {
                    dataContext.append(String.format("  - ID:%d | %s | Giá: %sđ | Tồn: %d\n",
                        p.getId(), p.getName(), vndFormat.format(p.getBasePrice()), totalStock));
                }
            }
            
            String prompt = """
                Bạn là chuyên gia phân tích kinh doanh thời trang. Dựa trên dữ liệu doanh số và tồn kho dưới đây, 
                hãy đề xuất 5-8 sản phẩm nên đưa vào Flash Sale tiếp theo.
                
                %s
                
                YÊU CẦU PHÂN TÍCH:
                1. Ưu tiên sản phẩm tồn kho cao cần đẩy nhanh
                2. Kết hợp 1-2 sản phẩm bán chạy (tạo "anchor") để thu hút traffic
                3. Cân nhắc xu hướng mùa hiện tại (tháng %d)
                4. Đề xuất mức giảm giá phù hợp (10-50%%) cho từng sản phẩm
                
                FORMAT TRẢ LỜI (BẮT BUỘC theo format này):
                Cho mỗi sản phẩm, viết CHÍNH XÁC:
                📦 **[Tên SP]** (ID: [số])
                - Giá gốc: [giá]đ → Giá Flash Sale đề xuất: [giá mới]đ (giảm [X]%%)
                - Lý do: [1-2 câu giải thích vì sao nên flash sale SP này]
                
                Cuối cùng, viết 2-3 câu tóm tắt chiến lược Flash Sale tổng thể.
                """.formatted(dataContext.toString(), now.getMonthValue());
            
            return callGroqAPI(prompt);
        } catch (Exception e) {
            return AiChatResponse.error("Lỗi khi phân tích đề xuất Flash Sale: " + e.getMessage());
        }
    }
}
