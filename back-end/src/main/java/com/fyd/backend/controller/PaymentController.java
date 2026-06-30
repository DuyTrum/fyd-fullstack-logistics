package com.fyd.backend.controller;

import com.fyd.backend.entity.Order;
import com.fyd.backend.entity.PaymentTransaction;
import com.fyd.backend.repository.OrderRepository;
import com.fyd.backend.repository.PaymentTransactionRepository;
import com.fyd.backend.service.MoMoService;
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
    private MoMoService momoService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private PaymentTransactionRepository paymentTransactionRepository;

    // ==================== VNPAY ====================

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
            processVNPayStatus(order, allParams);
        });

        return "{\"RspCode\":\"00\",\"Message\":\"Confirm Success\"}";
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
                processVNPayStatus(order, allParams);
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

    private void processVNPayStatus(Order order, Map<String, String> allParams) {
        // Idempotency check: Process only if not already PAID
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

    // ==================== MOMO ====================

    /**
     * MoMo IPN (Instant Payment Notification).
     * MoMo server calls this endpoint via POST with JSON body after payment.
     * resultCode = 0 means success.
     */
    @PostMapping("/momo/ipn")
    public ResponseEntity<?> momoIpn(@RequestBody Map<String, String> allParams) {
        if (!momoService.validateCallback(allParams)) {
            return ResponseEntity.ok(Map.of("resultCode", 97, "message", "Invalid Signature"));
        }

        String orderId = allParams.get("orderId");
        orderRepository.findByOrderCode(orderId).ifPresent(order -> {
            processMoMoStatus(order, allParams);
        });

        return ResponseEntity.ok(Map.of("resultCode", 0, "message", "Confirm Success"));
    }

    /**
     * MoMo Callback (user redirect).
     * After payment, MoMo redirects the user to return-url with query params.
     * Frontend can also call this to verify before showing result.
     */
    @GetMapping("/momo/callback")
    public ResponseEntity<?> momoCallback(@RequestParam Map<String, String> allParams) {
        boolean isValid = momoService.validateCallback(allParams);
        String orderId = allParams.get("orderId");
        String resultCode = allParams.get("resultCode");

        if (isValid) {
            orderRepository.findByOrderCode(orderId).ifPresent(order -> {
                processMoMoStatus(order, allParams);
            });
        }

        Map<String, Object> result = Map.of(
            "valid", isValid,
            "orderCode", orderId != null ? orderId : "",
            "success", "0".equals(resultCode),
            "resultCode", resultCode != null ? resultCode : ""
        );

        return ResponseEntity.ok(result);
    }

    private void processMoMoStatus(Order order, Map<String, String> allParams) {
        // Idempotency check: Process only if not already PAID
        if ("PAID".equalsIgnoreCase(order.getPaymentStatus())) {
            return;
        }

        String resultCode = allParams.get("resultCode");
        String transId = allParams.get("transId");

        PaymentTransaction transaction = paymentTransactionRepository.findByOrderId(order.getId())
                .orElse(new PaymentTransaction());

        transaction.setOrder(order);
        transaction.setProvider("MOMO");
        transaction.setTransactionId(transId);
        transaction.setTransactionNo(transId);
        transaction.setResponseCode(resultCode);
        transaction.setRawResponse(allParams.toString());
        transaction.setUpdatedAt(LocalDateTime.now());

        if ("0".equals(resultCode)) {
            // Payment Success (MoMo: resultCode 0 = success)
            transaction.setStatus("SUCCESS");
            transaction.setPaymentStatus("PAID");
            order.setPaymentStatus("PAID");
            order.setPaidAt(LocalDateTime.now());
            order.setStatus("PROCESSING");
        } else {
            // Payment Failed
            transaction.setStatus("FAILED");
            transaction.setPaymentStatus("FAILED");
            order.setPaymentStatus("FAILED");
            order.setStatus("CANCELLED");
            order.setCancelReason("MOMO: Thanh toán thất bại hoặc bị hủy (Mã lỗi: " + resultCode + ")");
        }

        paymentTransactionRepository.save(transaction);
        orderRepository.save(order);
    }
}

