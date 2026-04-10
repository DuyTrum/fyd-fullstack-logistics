package com.fyd.backend.service;

import com.fyd.backend.entity.*;
import com.fyd.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ProductVariantRepository variantRepository;

    @Autowired
    private PointsService pointsService;

    @Autowired
    private EmailService emailService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private CustomerRepository customerRepository;

    private static final Map<String, List<String>> ALLOWED_TRANSITIONS = Map.of(
            "PENDING", List.of("CONFIRMED", "CANCELLED"),
            "PENDING_CANCEL", List.of("CANCELLED", "CONFIRMED"),
            "CONFIRMED", List.of("PROCESSING", "CANCELLED"),
            "PROCESSING", List.of("SHIPPING", "CANCELLED"),
            "SHIPPING", List.of("DELIVERED"),
            "DELIVERED", List.of("COMPLETED"),
            "CANCELLED", List.of(),
            "COMPLETED", List.of()
    );

    @Transactional
    public Order updateStatus(Long orderId, String newStatus) {
        return orderRepository.findById(orderId).map(order -> {
            String currentStatus = order.getStatus();

            // 1. Validate State Machine
            if (!isValidTransition(currentStatus, newStatus)) {
                throw new IllegalStateException("Không thể chuyển từ trạng thái " + currentStatus + " sang " + newStatus);
            }

            // 2. Handle Logic for Specific Transitions
            
            // Transition: Any -> CANCELLED
            if ("CANCELLED".equals(newStatus)) {
                // Strict validation: Admin cannot cancel SHIPPING, DELIVERED, COMPLETED
                if (List.of("SHIPPING", "DELIVERED", "COMPLETED").contains(currentStatus)) {
                    throw new IllegalStateException("Không thể hủy đơn hàng khi đã chuyển sang trạng thái " + currentStatus);
                }
                handleCancellation(order);
            }
            
            // Transition: PENDING -> CONFIRMED (Model A: Deduct stock on confirmation)
            if ("CONFIRMED".equals(newStatus) && !order.isStockReserved()) {
                deductStock(order);
            }

            // Transition: Any -> DELIVERED
            if ("DELIVERED".equals(newStatus)) {
                handleDelivery(order);
            }

            // 3. Update Timestamps
            if ("CONFIRMED".equals(newStatus)) order.setConfirmedAt(LocalDateTime.now());
            if ("CANCELLED".equals(newStatus)) order.setCancelledAt(LocalDateTime.now());
            if ("DELIVERED".equals(newStatus)) order.setDeliveredAt(LocalDateTime.now());

            order.setStatus(newStatus);
            order.setUpdatedAt(LocalDateTime.now());
            Order saved = orderRepository.save(order);

            // 4. Post-update actions (Notifications, Emails)
            createStatusNotification(saved);
            sendStatusEmail(saved);
            broadcastUpdate(saved);

            return saved;
        }).orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng #" + orderId));
    }

    @Transactional
    public void deductStock(Order order) {
        if (order.isStockReserved()) return;

        for (OrderItem item : order.getItems()) {
            ProductVariant variant = item.getVariant();
            if (variant != null) {
                int currentStock = variant.getStockQuantity() != null ? variant.getStockQuantity() : 0;
                if (currentStock < item.getQuantity()) {
                    throw new IllegalStateException("Sản phẩm " + item.getProductName() + " (" + item.getVariantInfo() + ") không đủ hàng trong kho.");
                }
                
                int newStock = currentStock - item.getQuantity();
                variant.setStockQuantity(Math.max(0, newStock));
                variantRepository.save(variant);

                // Create inventory notification if stock drops below threshold
                if (newStock <= 6 && currentStock > 6) {
                    Notification inventoryNotif = new Notification();
                    inventoryNotif.setType("inventory");
                    inventoryNotif.setPriority(newStock <= 0 ? "urgent" : "high");
                    inventoryNotif.setTitle(newStock <= 0 ? "Hết hàng" : "Sắp hết hàng");
                    String productName = variant.getProduct().getName() + " - " + 
                        (variant.getSize() != null ? variant.getSize().getName() : "") + "/" +
                        (variant.getColor() != null ? variant.getColor().getName() : "");
                    inventoryNotif.setDescription(productName + " còn " + Math.max(0, newStock) + " sản phẩm");
                    inventoryNotif.setActionType("navigate");
                    inventoryNotif.setActionUrl("/admin/inventory");
                    notificationRepository.save(inventoryNotif);
                }
            }
        }
        order.setStockReserved(true);
        orderRepository.save(order);
    }

    @Transactional
    public void restoreStock(Order order) {
        if (!order.isStockReserved()) return;

        for (OrderItem item : order.getItems()) {
            ProductVariant variant = item.getVariant();
            if (variant != null) {
                int currentStock = variant.getStockQuantity() != null ? variant.getStockQuantity() : 0;
                variant.setStockQuantity(currentStock + item.getQuantity());
                variantRepository.save(variant);
            }
        }
        order.setStockReserved(false);
        orderRepository.save(order);
    }

    private void handleCancellation(Order order) {
        System.out.println("Processing cancellation for order #" + order.getOrderCode());
        
        // 1. Restore stock if it was reserved (Idempotent)
        if (order.isStockReserved()) {
            System.out.println("Restoring stock for order #" + order.getOrderCode());
            restoreStock(order);
        }

        // 2. Refund points (Idempotent)
        if (!order.isPointsRefunded()) {
            Integer pointsToRefund = order.getPointsUsed();
            if (pointsToRefund != null && pointsToRefund > 0) {
                System.out.println("Refunding " + pointsToRefund + " points for order #" + order.getOrderCode());
                Customer customer = order.getCustomer();
                if (customer != null) {
                    pointsService.refundPoints(customer, pointsToRefund);
                    order.setPointsRefunded(true);
                } else {
                    System.err.println("WARNING: Cannot refund points - customer missing for order #" + order.getOrderCode());
                }
            }
        }
    }

    private void handleDelivery(Order order) {
        // Points awarding (already implemented in original logic)
        if (order.getCustomer() != null) {
            int pointsEarned = order.getPointsEarned() != null ? order.getPointsEarned() : pointsService.calculatePointsEarned(order.getTotalAmount());
            if (pointsEarned > 0) {
                pointsService.earnPoints(order.getCustomer(), pointsEarned);
                System.out.println("Awarded " + pointsEarned + " points to customer " + order.getCustomer().getId());
            }
        }
    }

    private boolean isValidTransition(String from, String to) {
        if (from.equals(to)) return true;
        List<String> next = ALLOWED_TRANSITIONS.get(from);
        return next != null && next.contains(to);
    }

    private void createStatusNotification(Order order) {
        String msg = "Đơn hàng #" + order.getOrderCode() + " đã chuyển sang trạng thái: " + order.getStatus();
        Notification notification = new Notification();
        notification.setType("order");
        notification.setTitle("Cập nhật đơn hàng");
        notification.setDescription(msg);
        notification.setActionType("navigate");
        notification.setActionUrl("/shop/profile"); // For customer
        notificationRepository.save(notification);
    }

    private void sendStatusEmail(Order order) {
        if (emailService == null) return;
        try {
            emailService.sendOrderStatusUpdate(order);
        } catch (Exception e) {
            System.err.println("Failed to send status update email: " + e.getMessage());
        }
    }

    private void broadcastUpdate(Order order) {
        try {
            messagingTemplate.convertAndSend("/topic/notifications", Map.of(
                    "type", "order_status",
                    "orderId", order.getId(),
                    "status", order.getStatus()
            ));
        } catch (Exception e) {
            System.err.println("Failed to broadcast status update: " + e.getMessage());
        }
    }
}
