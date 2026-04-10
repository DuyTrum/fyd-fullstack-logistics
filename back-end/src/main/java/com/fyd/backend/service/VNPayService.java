package com.fyd.backend.service;

import com.fyd.backend.entity.Order;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;

@Service
public class VNPayService {
    private static final Logger log = LoggerFactory.getLogger(VNPayService.class);

    @Value("${vnpay.tmn-code}")
    private String vnp_TmnCode;

    @Value("${vnpay.hash-secret}")
    private String vnp_HashSecret;

    @Value("${vnpay.api-url}")
    private String vnp_PayUrl;

    @Value("${vnpay.return-url}")
    private String vnp_ReturnUrl;

    public String createPaymentUrl(Order order, HttpServletRequest request) {
        String vnp_Version = "2.1.0";
        String vnp_Command = "pay";
        String vnp_OrderInfo = "Thanh_toan_don_hang_" + order.getOrderCode();
        // Remove accents and special chars if needed, but for sandbox, underscores are safest
        vnp_OrderInfo = vnp_OrderInfo.replaceAll("\\s+", "_");
        
        // Append timestamp to ensure TxnRef is unique every time (Avoids Error 72)
        String vnp_TxnRef = order.getOrderCode() + "_" + System.currentTimeMillis();
        String vnp_IpAddr = "127.0.0.1"; // Default for local dev
        
        try {
            String xForwardedFor = request.getHeader("X-Forwarded-For");
            if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
                vnp_IpAddr = xForwardedFor.split(",")[0];
            } else {
                vnp_IpAddr = request.getRemoteAddr();
            }
            // Handle IPv6 loopback
            if ("0:0:0:0:0:0:0:1".equals(vnp_IpAddr)) {
                vnp_IpAddr = "127.0.0.1";
            }
        } catch (Exception e) {
            vnp_IpAddr = "127.0.0.1";
        }

        String vnp_TmnCode = this.vnp_TmnCode;

        long amount = order.getTotalAmount().multiply(new java.math.BigDecimal(100)).longValue();
        Map<String, String> vnp_Params = new HashMap<>();
        vnp_Params.put("vnp_Version", vnp_Version);
        vnp_Params.put("vnp_Command", vnp_Command);
        vnp_Params.put("vnp_TmnCode", vnp_TmnCode);
        vnp_Params.put("vnp_Amount", String.valueOf(amount));
        vnp_Params.put("vnp_CurrCode", "VND");
        vnp_Params.put("vnp_TxnRef", vnp_TxnRef);
        vnp_Params.put("vnp_OrderInfo", vnp_OrderInfo);
        vnp_Params.put("vnp_OrderType", "170000"); // Standard Bill Payment code
        vnp_Params.put("vnp_Locale", "vn");
        vnp_Params.put("vnp_ReturnUrl", vnp_ReturnUrl);
        vnp_Params.put("vnp_IpAddr", vnp_IpAddr);

        Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
        formatter.setTimeZone(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        String vnp_CreateDate = formatter.format(cld.getTime());
        vnp_Params.put("vnp_CreateDate", vnp_CreateDate);

        cld.add(Calendar.MINUTE, 15);
        String vnp_ExpireDate = formatter.format(cld.getTime());
        vnp_Params.put("vnp_ExpireDate", vnp_ExpireDate);

        // Build hash data and query string — matches official VNPay Java reference exactly
        List<String> fieldNames = new ArrayList<>(vnp_Params.keySet());
        Collections.sort(fieldNames);
        
        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();
        
        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = vnp_Params.get(fieldName);
            
            if ((fieldValue != null) && (fieldValue.length() > 0)) {
                // Hash data: fieldName (raw) = URLEncode(fieldValue, US_ASCII)
                hashData.append(fieldName);
                hashData.append('=');
                hashData.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));
                
                // Query string: URLEncode(fieldName) = URLEncode(fieldValue)
                query.append(URLEncoder.encode(fieldName, StandardCharsets.US_ASCII));
                query.append('=');
                query.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));
                
                if (itr.hasNext()) {
                    query.append('&');
                    hashData.append('&');
                }
            }
        }
        
        String queryUrl = query.toString();
        String hashDataStr = hashData.toString();
        // Remove trailing & if last field was empty (safeguard)
        if (queryUrl.endsWith("&")) {
            queryUrl = queryUrl.substring(0, queryUrl.length() - 1);
        }
        if (hashDataStr.endsWith("&")) {
            hashDataStr = hashDataStr.substring(0, hashDataStr.length() - 1);
        }

        String vnp_SecureHash = hmacSHA512(vnp_HashSecret, hashDataStr);
        // Must include vnp_SecureHashType per official VNPay 2.1.0 spec
        queryUrl += "&vnp_SecureHashType=HmacSHA512&vnp_SecureHash=" + vnp_SecureHash;
        String finalUrl = vnp_PayUrl + "?" + queryUrl;

        log.info("VNPAY Params: {}", vnp_Params);
        log.info("VNPAY HashData: {}", hashDataStr);
        log.info("VNPAY SecureHash: {}", vnp_SecureHash);
        log.info("VNPAY Final URL: {}", finalUrl);

        return finalUrl;
    }

    public boolean validateCallback(Map<String, String> fields) {
        String vnp_SecureHash = fields.get("vnp_SecureHash");
        fields.remove("vnp_SecureHashType");
        fields.remove("vnp_SecureHash");

        List<String> fieldNames = new ArrayList<>(fields.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = fields.get(fieldName);
            if ((fieldValue != null) && (fieldValue.length() > 0)) {
                hashData.append(fieldName);
                hashData.append('=');
                hashData.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));
                if (itr.hasNext()) {
                    hashData.append('&');
                }
            }
        }
        String checkHash = hmacSHA512(vnp_HashSecret, hashData.toString());
        return checkHash.equalsIgnoreCase(vnp_SecureHash);
    }

    private String hmacSHA512(String key, String data) {
        try {
            if (key == null || data == null) {
                throw new NullPointerException();
            }
            final Mac hmacSHA512 = Mac.getInstance("HmacSHA512");
            byte[] hmacKeyBytes = key.getBytes(StandardCharsets.UTF_8);
            final SecretKeySpec secretKey = new SecretKeySpec(hmacKeyBytes, "HmacSHA512");
            hmacSHA512.init(secretKey);
            byte[] dataBytes = data.getBytes(StandardCharsets.UTF_8);
            byte[] result = hmacSHA512.doFinal(dataBytes);
            StringBuilder sb = new StringBuilder(2 * result.length);
            for (byte b : result) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();
        } catch (Exception ex) {
            return "";
        }
    }
}
