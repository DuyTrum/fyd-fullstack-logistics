package com.fyd.backend.service;

import com.fyd.backend.entity.Order;
import com.fyd.backend.entity.OrderItem;
import com.fyd.backend.repository.OrderRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class GHTKService {

    @Autowired
    private OrderRepository orderRepository;

    @Value("${ghtk.api-token}")
    private String apiToken;

    @Value("${ghtk.api-url}")
    private String apiUrl;

    @Value("${ghtk.tracking-url:https://services.ghtk.vn/services/shipment/v2/status/}")
    private String trackingUrl;

    private final RestTemplate restTemplate;
    private boolean isDemoMode = false;

    @PostConstruct
    public void init() {
        if (apiToken == null || apiToken.isEmpty() || apiToken.startsWith("${")) {
            this.isDemoMode = true;
            System.out.println("[GHTK] API Token is not configured. Running in DEMO/MOCK mode.");
        }
    }

    public GHTKService() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(10000);
        this.restTemplate = new RestTemplate(factory);
    }

    public Map<String, Object> createShippingOrder(Order order) {
        if (isDemoMode) {
            Map<String, Object> mockResult = new HashMap<>();
            mockResult.put("success", true);
            mockResult.put("message", "Đăng đơn hàng thành công (Chế độ giả lập Demo)");
            
            Map<String, Object> mockOrder = new HashMap<>();
            mockOrder.put("partner_id", order.getOrderCode());
            mockOrder.put("label", "GHTK.DEMO." + order.getId() + "." + (100000 + new Random().nextInt(900000)));
            mockOrder.put("fee", 30000);
            mockOrder.put("estimated_deliver_time", "2-3 ngày");
            mockOrder.put("status_id", 2);
            mockResult.put("order", mockOrder);
            return mockResult;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.set("Token", apiToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = new HashMap<>();
        
        // Product info
        List<Map<String, Object>> products = new ArrayList<>();
        for (OrderItem item : order.getItems()) {
            Map<String, Object> p = new HashMap<>();
            p.put("name", item.getProductName());
            p.put("weight", 0.5); // Default weight in kg
            p.put("quantity", item.getQuantity());
            p.put("product_code", item.getVariant() != null ? item.getVariant().getSkuVariant() : "");
            products.add(p);
        }

        // Order info
        Map<String, Object> orderInfo = new HashMap<>();
        orderInfo.put("id", order.getOrderCode());
        orderInfo.put("pick_name", "FYD Store");
        orderInfo.put("pick_address", "123 Lý Tự Trọng");
        orderInfo.put("pick_province", "TP. Hồ Chí Minh");
        orderInfo.put("pick_district", "Quận 1");
        orderInfo.put("pick_ward", "Phường Bến Thành");
        orderInfo.put("pick_tel", "0912345678");
        
        orderInfo.put("tel", order.getShippingPhone());
        orderInfo.put("name", order.getShippingName());
        orderInfo.put("address", order.getShippingAddress());
        orderInfo.put("province", order.getShippingProvince());
        orderInfo.put("district", order.getShippingDistrict());
        orderInfo.put("ward", order.getShippingWard());
        
        orderInfo.put("hamlet", "Khác");
        orderInfo.put("is_freeship", (order.getShippingFee() != null && order.getShippingFee().doubleValue() == 0) ? 1 : 0);
        orderInfo.put("pick_money", "COD".equalsIgnoreCase(order.getPaymentMethod()) ? order.getTotalAmount().intValue() : 0);
        orderInfo.put("value", order.getTotalAmount().intValue());
        orderInfo.put("transport", "road");

        body.put("products", products);
        body.put("order", orderInfo);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return (Map<String, Object>) response.getBody();
            }
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            System.err.println("GHTK API Error Body: " + e.getResponseBodyAsString());
            try {
                // Try to parse the error body as a Map
                return new com.fasterxml.jackson.databind.ObjectMapper().readValue(e.getResponseBodyAsString(), Map.class);
            } catch (Exception ex) {
                return Map.of("success", false, "message", e.getMessage(), "error_body", e.getResponseBodyAsString());
            }
        } catch (Exception e) {
            System.err.println("GHTK API Error: " + e.getMessage());
            return Map.of("success", false, "message", e.getMessage());
        }

        return Map.of("success", false, "message", "Unknown error occurred");
    }

    /**
     * Get tracking status from GHTK
     */
    public Map<String, Object> getTrackingInfo(String trackingNumber) {
        if (isDemoMode || (trackingNumber != null && trackingNumber.startsWith("GHTK.DEMO."))) {
            return generateMockTrackingInfo(trackingNumber);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.set("Token", apiToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            String url = trackingUrl + trackingNumber;
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return (Map<String, Object>) response.getBody();
            }
        } catch (Exception e) {
            System.err.println("GHTK Tracking API Error: " + e.getMessage());
        }
        return null;
    }

    private Map<String, Object> generateMockTrackingInfo(String trackingNumber) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        
        Optional<Order> orderOpt = orderRepository.findByTrackingNumber(trackingNumber);
        if (orderOpt.isEmpty()) {
            try {
                String[] parts = trackingNumber.split("\\.");
                if (parts.length >= 3) {
                    Long orderId = Long.parseLong(parts[2]);
                    orderOpt = orderRepository.findById(orderId);
                }
            } catch (Exception e) {
                // Ignore
            }
        }

        if (orderOpt.isEmpty()) {
            response.put("message", "Không tìm thấy thông tin đơn hàng cho vận đơn: " + trackingNumber);
            return response;
        }

        Order order = orderOpt.get();
        LocalDateTime baseTime = order.getCreatedAt() != null ? order.getCreatedAt() : LocalDateTime.now().minusDays(1);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        // Dynamic address processing
        String destProvince = order.getShippingProvince() != null ? order.getShippingProvince() : "TP. Hồ Chí Minh";
        String destDistrict = order.getShippingDistrict() != null ? order.getShippingDistrict() : "Tân Bình";
        String destWard = order.getShippingWard() != null ? order.getShippingWard() : "Phường 1";
        
        String cleanProvince = destProvince.replaceAll("(?i)^(Tỉnh|Thành phố|TP\\.)\\s*", "");
        String cleanDistrict = destDistrict.replaceAll("(?i)^(Quận|Huyện|Thị xã|Thành phố|TP\\.)\\s*", "");
        
        // Consistent random shipper name and phone based on order ID seed
        long orderIdSeed = order.getId() != null ? order.getId() : 1L;
        String[] firstNames = {"Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ"};
        String[] middleNames = {"Văn", "Đăng", "Đức", "Anh", "Minh", "Quốc", "Hữu", "Thành"};
        String[] lastNames = {"Hùng", "Dũng", "Tuấn", "Nam", "Phong", "Huy", "Thắng", "Khánh"};
        
        Random rand = new Random(orderIdSeed);
        String shipperName = firstNames[rand.nextInt(firstNames.length)] + " " + 
                             middleNames[rand.nextInt(middleNames.length)] + " " + 
                             lastNames[rand.nextInt(lastNames.length)];
        
        String[] phonePrefixes = {"090", "091", "098", "097", "035", "036", "037", "038", "077", "079"};
        String shipperPhone = phonePrefixes[rand.nextInt(phonePrefixes.length)] + String.format("%07d", rand.nextInt(10000000));

        List<Map<String, String>> logs = new ArrayList<>();
        
        // 1. Point of creation (always exists)
        logs.add(Map.of(
            "time", baseTime.format(formatter),
            "status", "Đã tiếp nhận yêu cầu giao hàng tại FYD Store (Quận 1, TP. HCM)"
        ));

        String status = order.getStatus();
        
        if ("CANCELLED".equals(status)) {
            LocalDateTime cancelTime = order.getCancelledAt() != null ? order.getCancelledAt() : baseTime.plusHours(2);
            logs.add(Map.of(
                "time", cancelTime.format(formatter),
                "status", "Đơn hàng đã bị hủy bỏ hành trình vận chuyển."
            ));
        } else {
            // If CONFIRMED or PROCESSING or later
            if (List.of("CONFIRMED", "PROCESSING", "SHIPPING", "DELIVERED", "COMPLETED").contains(status)) {
                logs.add(Map.of(
                    "time", baseTime.plusMinutes(45).format(formatter),
                    "status", "Hệ thống GHTK đã tiếp nhận dữ liệu đơn hàng thành công."
                ));
            }
            
            // If PROCESSING or later
            if (List.of("PROCESSING", "SHIPPING", "DELIVERED", "COMPLETED").contains(status)) {
                logs.add(Map.of(
                    "time", baseTime.plusHours(2).format(formatter),
                    "status", "Bưu tá GHTK đã lấy hàng thành công và đang chuyển về kho phân loại Quận 1."
                ));
            }

            // If SHIPPING or later
            if (List.of("SHIPPING", "DELIVERED", "COMPLETED").contains(status)) {
                logs.add(Map.of(
                    "time", baseTime.plusHours(5).format(formatter),
                    "status", "Đơn hàng đã nhập kho trung chuyển " + cleanDistrict + " (" + cleanProvince + ")."
                ));
                logs.add(Map.of(
                    "time", baseTime.plusHours(12).format(formatter),
                    "status", "Đơn hàng đã được xuất kho trung chuyển, đang vận chuyển đến bưu cục phát " + cleanDistrict + "."
                ));
                logs.add(Map.of(
                    "time", baseTime.plusHours(18).format(formatter),
                    "status", "Đang giao hàng. Bưu tá " + shipperName + " (SĐT: " + shipperPhone + ") đang liên hệ giao hàng tại khu vực " + destWard + "."
                ));
            }

            // If DELIVERED or COMPLETED
            if (List.of("DELIVERED", "COMPLETED").contains(status)) {
                LocalDateTime deliverTime = order.getDeliveredAt() != null ? order.getDeliveredAt() : baseTime.plusHours(20);
                logs.add(Map.of(
                    "time", deliverTime.format(formatter),
                    "status", "Giao hàng thành công. Người nhận: " + order.getShippingName() + " (Đã ký nhận)."
                ));
            }
        }

        // Reverse to display newest first
        Collections.reverse(logs);

        Map<String, Object> orderData = new HashMap<>();
        orderData.put("label_id", trackingNumber);
        orderData.put("partner_id", order.getOrderCode());
        orderData.put("status_text", "COMPLETED".equals(status) || "DELIVERED".equals(status) ? "Đã giao hàng" : ("CANCELLED".equals(status) ? "Đã hủy" : "Đang vận chuyển"));
        orderData.put("logs", logs);
        
        response.put("order", orderData);
        return response;
    }
}
