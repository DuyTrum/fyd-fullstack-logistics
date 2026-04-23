package com.fyd.backend.dto;

import com.fyd.backend.entity.Order;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class OrderDTO {
    private Long id;
    private String orderNumber;
    private CustomerDTO customer;
    private String status;
    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private BigDecimal shippingFee;
    private BigDecimal totalAmount;
    private String shippingName;
    private String shippingPhone;
    private String shippingProvince;
    private String shippingDistrict;
    private String shippingWard;
    private String shippingAddress;
    private String fullAddress;
    private String paymentMethod;
    private String paymentStatus;
    private String note;
    private String promotionCode;
    private Integer pointsUsed;
    private Integer pointsEarned;
    private LocalDateTime createdAt;
    private String paymentUrl;
    private String trackingNumber;
    private String carrier;
    private boolean pointsRefunded;
    private List<OrderItemDTO> items;

    public static OrderDTO fromEntity(Order o) {
        OrderDTO dto = new OrderDTO();
        dto.setId(o.getId());
        dto.setOrderNumber(o.getOrderCode());
        dto.setStatus(o.getStatus());
        dto.setSubtotal(o.getSubtotal());
        dto.setDiscountAmount(o.getDiscountAmount());
        dto.setShippingFee(o.getShippingFee());
        dto.setTotalAmount(o.getTotalAmount());
        dto.setShippingName(o.getShippingName());
        dto.setShippingPhone(o.getShippingPhone());
        dto.setShippingProvince(o.getShippingProvince());
        dto.setShippingDistrict(o.getShippingDistrict());
        dto.setShippingWard(o.getShippingWard());
        dto.setShippingAddress(o.getShippingAddress());
        dto.setFullAddress(String.join(", ", 
            o.getShippingAddress() != null ? o.getShippingAddress() : "",
            o.getShippingWard() != null ? o.getShippingWard() : "",
            o.getShippingDistrict() != null ? o.getShippingDistrict() : "",
            o.getShippingProvince() != null ? o.getShippingProvince() : ""));
        dto.setPaymentMethod(o.getPaymentMethod());
        dto.setPaymentStatus(o.getPaymentStatus());
        dto.setNote(o.getNotes());
        dto.setPromotionCode(o.getPromotionCode());
        dto.setPointsUsed(o.getPointsUsed());
        dto.setPointsEarned(o.getPointsEarned());
        dto.setCreatedAt(o.getCreatedAt());
        
        if (o.getCustomer() != null) {
            dto.setCustomer(CustomerDTO.fromEntity(o.getCustomer()));
        }
        
        if (o.getItems() != null) {
            dto.setItems(o.getItems().stream()
                .map(OrderItemDTO::fromEntity)
                .collect(Collectors.toList()));
        }

        dto.setTrackingNumber(o.getTrackingNumber());
        dto.setCarrier(o.getCarrier());
        dto.setPointsRefunded(o.isPointsRefunded());
        
        return dto;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }
    public CustomerDTO getCustomer() { return customer; }
    public void setCustomer(CustomerDTO customer) { this.customer = customer; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }
    public BigDecimal getShippingFee() { return shippingFee; }
    public void setShippingFee(BigDecimal shippingFee) { this.shippingFee = shippingFee; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public String getShippingName() { return shippingName; }
    public void setShippingName(String shippingName) { this.shippingName = shippingName; }
    public String getShippingPhone() { return shippingPhone; }
    public void setShippingPhone(String shippingPhone) { this.shippingPhone = shippingPhone; }
    public String getShippingProvince() { return shippingProvince; }
    public void setShippingProvince(String shippingProvince) { this.shippingProvince = shippingProvince; }
    public String getShippingDistrict() { return shippingDistrict; }
    public void setShippingDistrict(String shippingDistrict) { this.shippingDistrict = shippingDistrict; }
    public String getShippingWard() { return shippingWard; }
    public void setShippingWard(String shippingWard) { this.shippingWard = shippingWard; }
    public String getShippingAddress() { return shippingAddress; }
    public void setShippingAddress(String shippingAddress) { this.shippingAddress = shippingAddress; }
    public String getFullAddress() { return fullAddress; }
    public void setFullAddress(String fullAddress) { this.fullAddress = fullAddress; }
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public List<OrderItemDTO> getItems() { return items; }
    public void setItems(List<OrderItemDTO> items) { this.items = items; }
    public String getPromotionCode() { return promotionCode; }
    public void setPromotionCode(String promotionCode) { this.promotionCode = promotionCode; }
    public Integer getPointsUsed() { return pointsUsed; }
    public void setPointsUsed(Integer pointsUsed) { this.pointsUsed = pointsUsed; }
    public Integer getPointsEarned() { return pointsEarned; }
    public void setPointsEarned(Integer pointsEarned) { this.pointsEarned = pointsEarned; }
    
    public String getPaymentUrl() { return paymentUrl; }
    public void setPaymentUrl(String paymentUrl) { this.paymentUrl = paymentUrl; }
    
    public String getTrackingNumber() { return trackingNumber; }
    public void setTrackingNumber(String trackingNumber) { this.trackingNumber = trackingNumber; }
    
    public String getCarrier() { return carrier; }
    public void setCarrier(String carrier) { this.carrier = carrier; }

    public boolean isPointsRefunded() { return pointsRefunded; }
    public void setPointsRefunded(boolean pointsRefunded) { this.pointsRefunded = pointsRefunded; }
}
