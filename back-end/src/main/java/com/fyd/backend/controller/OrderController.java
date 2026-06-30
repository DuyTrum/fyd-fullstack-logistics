package com.fyd.backend.controller;

import com.fyd.backend.dto.CreateOrderRequest;
import com.fyd.backend.dto.OrderDTO;
import com.fyd.backend.annotation.Loggable;
import com.fyd.backend.entity.Notification;
import com.fyd.backend.entity.Order;
import com.fyd.backend.entity.OrderItem;
import com.fyd.backend.repository.*;
import com.fyd.backend.entity.Customer;
import com.fyd.backend.entity.CustomerCoupon;
import com.fyd.backend.entity.PaymentTransaction;
import com.fyd.backend.service.CustomerCouponService;
import com.fyd.backend.service.EmailService;
import com.fyd.backend.service.PointsService;
import com.fyd.backend.service.VNPayService;
import com.fyd.backend.service.MoMoService;
import com.fyd.backend.service.OrderService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private OrderItemRepository orderItemRepository;
    
    @Autowired
    private CustomerRepository customerRepository;
    
    @Autowired
    private ProductRepository productRepository;
    
    @Autowired
    private ProductVariantRepository variantRepository;

    @Autowired
    private PromotionRepository promotionRepository;

    @Autowired
    private PointsService pointsService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private CustomerCouponService customerCouponService;

    @Autowired
    private VNPayService vnpayService;

    @Autowired
    private MoMoService momoService;

    @Autowired
    private PaymentTransactionRepository paymentTransactionRepository;

    @Autowired(required = false)
    private EmailService emailService;

    @Autowired
    private OrderService orderService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private static final Map<String, String> ORDER_STATUS_NAMES = Map.of(
        "PENDING", "Chờ xử lý",
        "CONFIRMED", "Đã xác nhận",
        "PROCESSING", "Đang xử lý",
        "SHIPPING", "Đang giao",
        "DELIVERED", "Đã giao hàng",
        "COMPLETED", "Hoàn tất",
        "PENDING_CANCEL", "Chờ duyệt hủy",
        "CANCELLED", "Đã hủy"
    );

    @GetMapping
    public ResponseEntity<Map<String, Object>> getOrders(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").descending());
        
        Page<Order> orderPage = null;
        List<Order> orderList = null;
        
        if (customerId != null) {
            // Use eager fetch for customer orders to include items
            orderList = orderRepository.findByCustomerIdWithItems(customerId);
        } else if (status != null && !status.isEmpty() && !status.equals("all")) {
            orderPage = orderRepository.findByStatus(status, pageRequest);
            orderList = orderPage.getContent();
        } else if (!q.isEmpty()) {
            orderPage = orderRepository.search(q, pageRequest);
            orderList = orderPage.getContent();
        } else {
            orderPage = orderRepository.findAll(pageRequest);
            orderList = orderPage.getContent();
        }
        
        // Sort by createdAt descending for customer orders
        if (customerId != null && orderList != null) {
            orderList.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        }
        
        List<OrderDTO> orders = (orderList != null ? orderList : List.<Order>of()).stream()
            .map(OrderDTO::fromEntity)
            .collect(Collectors.toList());
        
        // Count by status
        Map<String, Long> statusCounts = new HashMap<>();
        statusCounts.put("all", orderRepository.count());
        statusCounts.put("PENDING", orderRepository.countByStatus("PENDING"));
        statusCounts.put("CONFIRMED", orderRepository.countByStatus("CONFIRMED"));
        statusCounts.put("PROCESSING", orderRepository.countByStatus("PROCESSING"));
        statusCounts.put("SHIPPING", orderRepository.countByStatus("SHIPPING"));
        statusCounts.put("DELIVERED", orderRepository.countByStatus("DELIVERED"));
        statusCounts.put("COMPLETED", orderRepository.countByStatus("COMPLETED"));
        statusCounts.put("CANCELLED", orderRepository.countByStatus("CANCELLED"));
        
        Map<String, Object> response = new HashMap<>();
        response.put("orders", orders);
        
        // Handle pagination info - for customer orders we don't have Page object
        if (customerId != null) {
            response.put("currentPage", 0);
            response.put("totalItems", orders.size());
            response.put("totalPages", 1);
        } else {
            response.put("currentPage", orderPage.getNumber());
            response.put("totalItems", orderPage.getTotalElements());
            response.put("totalPages", orderPage.getTotalPages());
        }
        response.put("statusCounts", statusCounts);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderDTO> getOrder(@PathVariable Long id) {
        return orderRepository.findById(id)
            .map(OrderDTO::fromEntity)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/code/{orderCode}")
    public ResponseEntity<OrderDTO> getOrderByCode(@PathVariable String orderCode) {
        return orderRepository.findByOrderCode(orderCode)
            .map(OrderDTO::fromEntity)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // Alias for getOrderByCode used by PaymentCallback.jsx
    @GetMapping("/number/{orderCode}")
    public ResponseEntity<OrderDTO> getOrderByNumber(@PathVariable String orderCode) {
        return getOrderByCode(orderCode);
    }

    /**
     * Track order by code and phone - for guest customers
     * Requires both order code AND phone number for security
     */
    @GetMapping("/track")
    public ResponseEntity<?> trackOrder(
            @RequestParam String orderCode,
            @RequestParam String phone) {
        // Normalize phone number (remove spaces, dashes)
        String normalizedPhone = phone.replaceAll("[\\s\\-]", "");
        
        java.util.Optional<Order> orderOpt = orderRepository.findByOrderCode(orderCode);
        if (orderOpt.isEmpty()) {
            orderOpt = orderRepository.findByTrackingNumber(orderCode);
        }

        return orderOpt.map(order -> {
                // Verify phone matches the order
                String orderPhone = order.getShippingPhone();
                if (orderPhone != null) {
                    orderPhone = orderPhone.replaceAll("[\\s\\-]", "");
                }
                
                if (orderPhone == null || !orderPhone.equals(normalizedPhone)) {
                    return ResponseEntity.status(403)
                        .body(Map.of("error", "Số điện thoại không khớp với đơn hàng"));
                }
                
                // Return limited order info for tracking
                Map<String, Object> trackingInfo = new HashMap<>();
                trackingInfo.put("id", order.getId());
                trackingInfo.put("orderCode", order.getOrderCode());
                trackingInfo.put("trackingNumber", order.getTrackingNumber());
                trackingInfo.put("status", order.getStatus());
                trackingInfo.put("paymentStatus", order.getPaymentStatus());
                trackingInfo.put("paymentMethod", order.getPaymentMethod());
                trackingInfo.put("shippingName", order.getShippingName());
                trackingInfo.put("shippingAddress", order.getShippingAddress());
                trackingInfo.put("shippingDistrict", order.getShippingDistrict());
                trackingInfo.put("shippingProvince", order.getShippingProvince());
                trackingInfo.put("totalAmount", order.getTotalAmount());
                trackingInfo.put("createdAt", order.getCreatedAt());
                trackingInfo.put("confirmedAt", order.getConfirmedAt());
                trackingInfo.put("deliveredAt", order.getDeliveredAt());
                
                // Include items summary
                if (order.getItems() != null) {
                    trackingInfo.put("itemCount", order.getItems().size());
                    trackingInfo.put("items", order.getItems().stream()
                        .map(item -> Map.of(
                            "name", item.getProductName(),
                            "variant", item.getVariantInfo() != null ? item.getVariantInfo() : "",
                            "quantity", item.getQuantity(),
                            "price", item.getUnitPrice()
                        ))
                        .collect(Collectors.toList()));
                }
                
                return ResponseEntity.ok(trackingInfo);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @Autowired(required = false)
    private com.fyd.backend.service.InvoiceService invoiceService;

    @GetMapping("/{id}/invoice")
    public ResponseEntity<String> getInvoice(@PathVariable Long id) {
        return orderRepository.findById(id)
            .map(order -> {
                if (invoiceService == null) {
                    return ResponseEntity.internalServerError().<String>body("Invoice service not available");
                }
                String html = invoiceService.generateInvoiceHtml(order);
                return ResponseEntity.ok()
                    .header("Content-Type", "text/html; charset=UTF-8")
                    .body(html);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/status")
    @Loggable(action = "UPDATE", entityType = "Order")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        try {
            Order saved = orderService.updateStatus(id, status);
            return ResponseEntity.ok(OrderDTO.fromEntity(saved));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", 
                e.getMessage() != null ? e.getMessage() : "Lỗi cập nhật trạng thái"));
        }
    }

    @PatchMapping("/{id}/confirm-payment")
    @Loggable(action = "UPDATE", entityType = "Order")
    public ResponseEntity<?> confirmPayment(@PathVariable Long id) {
        return orderRepository.findById(id)
            .map(order -> {
                // Create a notification for admin
                Notification notification = new Notification();
                notification.setType("order");
                notification.setPriority("high");
                notification.setTitle("Xác nhận thanh toán");
                notification.setDescription("Khách hàng @" + order.getCustomer().getFullName() + " xác nhận đã thanh toán đơn #" + order.getOrderCode());
                notification.setActionType("navigate");
                notification.setActionUrl("/admin/orders");
                notificationRepository.save(notification);

                return ResponseEntity.ok(Map.of("message", "Đã ghi nhận thông báo thanh toán"));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/cancel-request")
    @Loggable(action = "UPDATE", entityType = "Order")
    public ResponseEntity<?> requestCancellation(
            @PathVariable Long id,
            @RequestParam String reason) {
        return orderRepository.findById(id)
            .map(order -> {
                // Only allow cancellation request for PENDING orders
                if (!"PENDING".equals(order.getStatus())) {
                    return ResponseEntity.badRequest()
                        .body(Map.of("error", "Chỉ có thể yêu cầu hủy đơn hàng đang chờ xử lý"));
                }
                
                order.setStatus("PENDING_CANCEL");
                order.setCancelReason(reason);
                order.setUpdatedAt(LocalDateTime.now());
                Order saved = orderRepository.save(order);

                // Create notification for cancellation request
                Notification notification = new Notification();
                notification.setType("order");
                notification.setPriority("high");
                notification.setTitle("Yêu cầu hủy đơn");
                notification.setDescription("Khách hàng @" + order.getCustomer().getFullName() + " yêu cầu hủy đơn #" + order.getOrderCode());
                notification.setActionType("navigate");
                notification.setActionUrl("/admin/orders");
                notificationRepository.save(notification);

                return ResponseEntity.ok(OrderDTO.fromEntity(saved));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long id) {
        if (orderRepository.existsById(id)) {
            orderRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    @Loggable(action = "CREATE", entityType = "Order")
    @Transactional
    public ResponseEntity<Object> createOrder(@RequestBody CreateOrderRequest request, HttpServletRequest httpRequest) {
        // 1. Validate customer
            var customer = customerRepository.findById(request.getCustomerId())
                .orElse(null);
            
            if (customer == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Customer not found"));
            }

            // 2. Calculate subtotal and build items list
            BigDecimal subtotal = BigDecimal.ZERO;
            List<OrderItem> items = new java.util.ArrayList<>();

            if (request.getItems() != null) {
                // 2a. First pass: Validate stock for all items
                for (CreateOrderRequest.OrderItemRequest itemReq : request.getItems()) {
                    if (itemReq.getVariantId() != null) {
                        var variant = variantRepository.findById(itemReq.getVariantId()).orElse(null);
                        if (variant == null) {
                            return ResponseEntity.badRequest().body(Map.of("error", "Sản phẩm không tồn tại: " + itemReq.getProductName()));
                        }
                        if (variant.getStockQuantity() < itemReq.getQuantity()) {
                            return ResponseEntity.badRequest().body(Map.of("error", 
                                String.format("Sản phẩm '%s' (%s) không đủ hàng. Hiện còn: %d", 
                                    itemReq.getProductName(), itemReq.getVariantInfo(), variant.getStockQuantity())));
                        }
                    }
                }

                // 2b. Second pass: Build items and deduct stock
                for (CreateOrderRequest.OrderItemRequest itemReq : request.getItems()) {
                    OrderItem item = new OrderItem();
                    
                    if (itemReq.getProductId() != null) {
                        productRepository.findById(itemReq.getProductId()).ifPresent(item::setProduct);
                    }
                    
                    if (itemReq.getVariantId() != null) {
                        var variant = variantRepository.findById(itemReq.getVariantId()).orElse(null);
                        if (variant != null) {
                            item.setVariant(variant);
                            // Stock deduction moved to CONFIRMED status in OrderService
                        }
                    }
                    
                    item.setProductName(itemReq.getProductName());
                    item.setVariantInfo(itemReq.getVariantInfo());
                    item.setQuantity(itemReq.getQuantity());
                    item.setUnitPrice(itemReq.getUnitPrice());
                    
                    BigDecimal lineTotal = itemReq.getUnitPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
                    item.setLineTotal(lineTotal);
                    items.add(item);
                    subtotal = subtotal.add(lineTotal);
                }
            }

            // 3. Calculate Discounts
            BigDecimal totalDiscount = BigDecimal.ZERO;

            // 3a. Promotion Discount (public promotion codes)
            String promoCode = request.getPromotionCode();
            BigDecimal promoDiscount = BigDecimal.ZERO;
            if (promoCode != null && !promoCode.isEmpty()) {
                var promoOpt = promotionRepository.findByCodeIgnoreCase(promoCode);
                if (promoOpt.isPresent()) {
                    var promo = promoOpt.get();
                    long realCount = orderRepository.countByPromotionCodeIgnoreCase(promo.getCode());
                    promo.setUsedCount((int) realCount);
                    if (promo.isValid()) {
                        promoDiscount = promo.calculateDiscount(subtotal);
                        totalDiscount = totalDiscount.add(promoDiscount);
                        promo.setUsedCount((int) realCount + 1);
                        promotionRepository.save(promo);
                    }
                }
            }

            // 3b. Customer Coupon Discount (from Lucky Spin - bound to customer)
            String customerCouponCode = request.getCustomerCouponCode();
            CustomerCoupon usedCoupon = null;
            BigDecimal couponDiscount = BigDecimal.ZERO;
            if (customerCouponCode != null && !customerCouponCode.isEmpty()) {
                var validationResult = customerCouponService.validateCoupon(
                        customerCouponCode.trim().toUpperCase(), 
                        customer.getId(), 
                        subtotal);
                
                if (validationResult.isValid()) {
                    couponDiscount = validationResult.getDiscountAmount();
                    totalDiscount = totalDiscount.add(couponDiscount);
                    usedCoupon = customerCouponService.getCouponByCode(customerCouponCode.trim().toUpperCase())
                            .orElse(null);
                } else {
                    return ResponseEntity.badRequest().body(Map.of("error", validationResult.getMessage()));
                }
            }

            // 3c. Tier Discount
            BigDecimal tierDiscount = pointsService.calculateTierDiscount(customer, subtotal);
            totalDiscount = totalDiscount.add(tierDiscount);

            // 3d. Points Discount
            BigDecimal pointsDiscountPrice = BigDecimal.ZERO;
            int pointsUsed = request.getPointsUsed() != null ? request.getPointsUsed() : 0;
            if (pointsUsed > 0) {
                int maxUsable = pointsService.getMaxUsablePoints(customer, subtotal);
                pointsUsed = Math.min(pointsUsed, maxUsable);
                pointsDiscountPrice = pointsService.calculatePointsDiscount(pointsUsed);
                totalDiscount = totalDiscount.add(pointsDiscountPrice);
                // Deduct points from customer
                pointsService.usePoints(customer, pointsUsed);
            }

            // 4. Create and Save Order
            String orderCode = "FYD-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
                + "-" + (int)(Math.random() * 1000);

            Order order = new Order();
            order.setOrderCode(orderCode);
            order.setCustomer(customer);
            order.setStatus("PENDING");
            order.setShippingName(request.getShippingName());
            order.setShippingPhone(request.getShippingPhone());
            order.setShippingProvince(request.getShippingProvince());
            order.setShippingDistrict(request.getShippingDistrict());
            order.setShippingWard(request.getShippingWard());
            order.setShippingAddress(request.getShippingAddress());
            order.setPaymentMethod(request.getPaymentMethod());
            order.setPaymentStatus("PENDING");
            order.setShippingFee(request.getShippingFee() != null ? request.getShippingFee() : BigDecimal.ZERO);
            order.setNotes(request.getNotes());
            order.setSubtotal(subtotal);
            order.setDiscountAmount(totalDiscount);
            order.setPromotionCode(promoCode);
            order.setPointsUsed(pointsUsed);
            
            BigDecimal finalAmount = subtotal.add(order.getShippingFee()).subtract(totalDiscount);
            order.setTotalAmount(finalAmount.max(BigDecimal.ZERO));
            
            // Calculate points earned (on final amount)
            int pointsEarned = pointsService.calculatePointsEarned(order.getTotalAmount());
            order.setPointsEarned(pointsEarned);
            
            order.setCreatedAt(LocalDateTime.now());
            order.setUpdatedAt(LocalDateTime.now());

            Order savedOrder = orderRepository.save(order);

            // 5. Save items
            for (OrderItem item : items) {
                item.setOrder(savedOrder);
                orderItemRepository.save(item);
            }
            // Populate the items list for the deductStock logic to work
            savedOrder.setItems(items);

            // 5b. Soft Reserve Stock (immediate deduction)
            try {
                orderService.deductStock(savedOrder);
            } catch (Exception e) {
                // If stock deduction fails, we should technically roll back the order
                // but for now we'll throw error and let @Transactional handle it if available
                throw new RuntimeException("Lỗi kho hàng: " + e.getMessage());
            }

            // 6. Update customer stats (points will be earned when order is DELIVERED)
            customer.setTotalOrders((customer.getTotalOrders() != null ? customer.getTotalOrders() : 0) + 1);
            customer.setTotalSpent((customer.getTotalSpent() != null ? customer.getTotalSpent() : BigDecimal.ZERO).add(savedOrder.getTotalAmount()));
            customerRepository.save(customer);

            // 6b. Mark customer coupon as used (if any)
            if (usedCoupon != null) {
                customerCouponService.useCoupon(usedCoupon.getCode(), customer.getId(), savedOrder);
            }

            // 7. Create notification for new order
            Notification notification = new Notification();
            notification.setType("order");
            notification.setPriority("high");
            notification.setTitle("Đơn hàng mới");
            notification.setDescription("Đơn hàng mới #" + orderCode + " từ " + request.getShippingName());
            notification.setActionType("navigate");
            notification.setActionUrl("/admin/orders");
            notificationRepository.save(notification);

            // 7b. Broadcast new order notification via WebSocket
            try {
                messagingTemplate.convertAndSend("/topic/notifications", Map.of(
                    "type", "order",
                    "title", "Đơn hàng mới",
                    "message", "Đơn hàng mới #" + orderCode + " từ " + request.getShippingName(),
                    "orderId", savedOrder.getId(),
                    "orderCode", orderCode,
                    "timestamp", LocalDateTime.now().toString()
                ));
            } catch (Exception e) {
                // Log but don't fail the order process
                System.err.println("Failed to broadcast WebSocket notification: " + e.getMessage());
            }

            // 8. Send order confirmation email
            if (emailService != null) {
                try {
                    emailService.sendOrderConfirmation(savedOrder);
                } catch (Exception e) {
                    System.err.println("Failed to send order confirmation email: " + e.getMessage());
                }
            }

            OrderDTO responseDto = OrderDTO.fromEntity(savedOrder);

            // 9. Generate payment URL if method is VNPAY
            if ("VNPAY".equalsIgnoreCase(savedOrder.getPaymentMethod())) {
                String paymentUrl = vnpayService.createPaymentUrl(savedOrder, httpRequest);
                
                // Create payment transaction
                PaymentTransaction transaction = new PaymentTransaction();
                transaction.setOrder(savedOrder);
                transaction.setProvider("VNPAY");
                // Null-safe assignment to prevent DB 'default value' error
                transaction.setPaymentMethod(savedOrder.getPaymentMethod() != null ? savedOrder.getPaymentMethod() : "VNPAY");
                transaction.setAmount(savedOrder.getTotalAmount());
                transaction.setPaymentStatus("PENDING");
                transaction.setStatus("PENDING");
                transaction.setPaymentUrl(paymentUrl);
                paymentTransactionRepository.save(transaction);
                
                responseDto.setPaymentUrl(paymentUrl);
            } else if ("MOMO".equalsIgnoreCase(savedOrder.getPaymentMethod())) {
                String paymentUrl = momoService.createPaymentUrl(savedOrder);
                
                // Create payment transaction
                PaymentTransaction transaction = new PaymentTransaction();
                transaction.setOrder(savedOrder);
                transaction.setProvider("MOMO");
                // Null-safe assignment to prevent DB 'default value' error
                transaction.setPaymentMethod(savedOrder.getPaymentMethod() != null ? savedOrder.getPaymentMethod() : "MOMO");
                transaction.setAmount(savedOrder.getTotalAmount());
                transaction.setPaymentStatus("PENDING");
                transaction.setStatus("PENDING");
                transaction.setPaymentUrl(paymentUrl);
                paymentTransactionRepository.save(transaction);
                
                responseDto.setPaymentUrl(paymentUrl);
        }
        
        return ResponseEntity.ok(responseDto);
    }

    private void createStatusNotification(Order order) {
        String status = order.getStatus();
        String title = "";
        String description = "";
        String priority = "medium";

        switch (status) {
            case "CANCELLED":
                title = "Đơn hàng đã hủy";
                description = "Đơn hàng #" + order.getOrderCode() + " đã được hủy";
                priority = "high";
                break;
            case "COMPLETED":
                title = "Đơn hàng hoàn tất";
                description = "Đơn hàng #" + order.getOrderCode() + " đã hoàn tất";
                break;
            // Add other statuses if needed
            default:
                return; // Don't notify for every minor status change if not needed
        }

        Notification notification = new Notification();
        notification.setType("order");
        notification.setPriority(priority);
        notification.setTitle(title);
        notification.setDescription(description);
        notification.setActionType("navigate");
        notification.setActionUrl("/admin/orders");
        notificationRepository.save(notification);
    }
}
