package com.fyd.backend.controller;

import com.fyd.backend.entity.Order;
import com.fyd.backend.entity.PaymentTransaction;
import com.fyd.backend.repository.OrderRepository;
import com.fyd.backend.repository.PaymentTransactionRepository;
import com.fyd.backend.service.VNPayService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired
    private VNPayService vnpayService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private PaymentTransactionRepository paymentTransactionRepository;

    @GetMapping("/vnpay/ipn")
    public String vnpayIpn(@RequestParam Map<String, String> allParams) {
        // 1. Verify Checksum
        if (!vnpayService.validateCallback(allParams)) {
            return "{\"RspCode\":\"97\",\"Message\":\"Invalid Checksum\"}";
        }

        String vnp_TxnRef = allParams.get("vnp_TxnRef");
        // Strip the _timestamp suffix: TxnRef = orderCode + "_" + timestamp
        String orderCode = vnp_TxnRef != null && vnp_TxnRef.contains("_") 
            ? vnp_TxnRef.substring(0, vnp_TxnRef.lastIndexOf("_")) : vnp_TxnRef;
        orderRepository.findByOrderCode(orderCode).ifPresent(order -> {
            processPaymentStatus(order, allParams);
        });

        return "{\"RspCode\":\"00\",\"Message\":\"Confirm Success\"}";
    }

    private void processPaymentStatus(Order order, Map<String, String> allParams) {
        // 2. Idempotency check: Process only if not already PAID
        if ("PAID".equalsIgnoreCase(order.getPaymentStatus())) {
            return;
        }

        String vnp_ResponseCode = allParams.get("vnp_ResponseCode");
        String vnp_TransactionNo = allParams.get("vnp_TransactionNo");

        PaymentTransaction transaction = paymentTransactionRepository.findByOrderId(order.getId())
                .orElse(new PaymentTransaction());
        
        transaction.setOrder(order);
        transaction.setProvider("VNPAY");
        transaction.setTransactionId(vnp_TransactionNo);
        transaction.setTransactionNo(vnp_TransactionNo); // Map both for safety
        transaction.setResponseCode(vnp_ResponseCode);
        transaction.setRawResponse(allParams.toString());
        transaction.setUpdatedAt(LocalDateTime.now());

        if ("00".equals(vnp_ResponseCode)) {
            // Payment Success
            transaction.setStatus("SUCCESS");
            transaction.setPaymentStatus("PAID");
            order.setPaymentStatus("PAID");
            order.setPaidAt(LocalDateTime.now());
            order.setStatus("PROCESSING"); // Auto move to processing after payment
        } else {
            // Payment Failed
            transaction.setStatus("FAILED");
            transaction.setPaymentStatus("FAILED");
            order.setPaymentStatus("FAILED");
            order.setStatus("CANCELLED"); // Move to CANCELLED to avoid confusion
            order.setCancelReason("VNPAY: Thanh toán thất bại hoặc bị hủy (Mã lỗi: " + vnp_ResponseCode + ")");
        }
        
        paymentTransactionRepository.save(transaction);
        orderRepository.save(order);
    }

    // This is optional if frontend handles the redirect validation, but usually backend should verify
    @GetMapping("/vnpay/callback")
    public ResponseEntity<?> vnpayCallback(@RequestParam Map<String, String> allParams) {
        boolean isValid = vnpayService.validateCallback(allParams);
        String vnp_TxnRef = allParams.get("vnp_TxnRef");
        // Strip the _timestamp suffix: TxnRef = orderCode + "_" + timestamp
        String orderCode = vnp_TxnRef != null && vnp_TxnRef.contains("_") 
            ? vnp_TxnRef.substring(0, vnp_TxnRef.lastIndexOf("_")) : vnp_TxnRef;
        String responseCode = allParams.get("vnp_ResponseCode");

        if (isValid) {
            orderRepository.findByOrderCode(orderCode).ifPresent(order -> {
                processPaymentStatus(order, allParams);
            });
        }

        Map<String, Object> result = Map.of(
            "valid", isValid,
            "orderCode", orderCode != null ? orderCode : "",
            "success", "00".equals(responseCode),
            "status", responseCode
        );

        return ResponseEntity.ok(result);
    }
}
