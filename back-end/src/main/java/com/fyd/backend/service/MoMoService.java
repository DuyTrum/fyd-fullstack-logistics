package com.fyd.backend.service;

import com.fyd.backend.entity.Order;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class MoMoService {

    @Value("${momo.partner-code}")
    private String partnerCode;

    @Value("${momo.access-key}")
    private String accessKey;

    @Value("${momo.secret-key}")
    private String secretKey;

    @Value("${momo.api-url}")
    private String apiUrl;

    @Value("${momo.return-url}")
    private String returnUrl;

    @Value("${momo.ipn-url}")
    private String ipnUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public String createPaymentUrl(Order order) {
        String requestId = String.valueOf(System.currentTimeMillis());
        String orderId = order.getOrderCode();
        String orderInfo = "Thanh toan don hang " + orderId;
        long amountLong = order.getTotalAmount().longValue();
        String amount = String.valueOf(amountLong);
        String extraData = ""; // optional
        String requestType = "captureWallet";

        String signatureSource = "accessKey=" + accessKey +
                "&amount=" + amount +
                "&extraData=" + extraData +
                "&ipnUrl=" + ipnUrl +
                "&orderId=" + orderId +
                "&orderInfo=" + orderInfo +
                "&partnerCode=" + partnerCode +
                "&redirectUrl=" + returnUrl +
                "&requestId=" + requestId +
                "&requestType=" + requestType;

        String signature = hmacSHA256(secretKey, signatureSource);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("partnerCode", partnerCode);
        body.put("accessKey", accessKey);
        body.put("requestId", requestId);
        body.put("amount", amountLong);
        body.put("orderId", orderId);
        body.put("orderInfo", orderInfo);
        body.put("redirectUrl", returnUrl);
        body.put("ipnUrl", ipnUrl);
        body.put("extraData", extraData);
        body.put("requestType", requestType);
        body.put("signature", signature);
        body.put("lang", "vi");

        System.out.println("[MoMo] Creating payment URL for order: " + orderId + ", amount: " + amountLong);
        System.out.println("[MoMo] API URL: " + apiUrl);
        System.out.println("[MoMo] Request body: " + body);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, Map.class);
            Map responseBody = response.getBody();
            System.out.println("[MoMo] Response status: " + response.getStatusCode());
            System.out.println("[MoMo] Response body: " + responseBody);

            if (response.getStatusCode() == HttpStatus.OK && responseBody != null) {
                Integer resultCode = (Integer) responseBody.get("resultCode");
                if (resultCode != null && resultCode == 0) {
                    String payUrl = (String) responseBody.get("payUrl");
                    System.out.println("[MoMo] Payment URL created: " + payUrl);
                    return payUrl;
                } else {
                    System.err.println("[MoMo] API Error - resultCode: " + resultCode + ", message: " + responseBody.get("message"));
                }
            }
        } catch (Exception e) {
            System.err.println("[MoMo] Exception creating payment URL: " + e.getMessage());
            e.printStackTrace();
        }

        return null;
    }

    /**
     * Validate callback/IPN signature from MoMo.
     * MoMo resultCode: 0 = success, others = failure.
     */
    public boolean validateCallback(Map<String, String> params) {
        try {
            String receivedSignature = params.get("signature");
            if (receivedSignature == null || receivedSignature.isEmpty()) return false;

            String signatureSource = "accessKey=" + accessKey +
                    "&amount=" + params.getOrDefault("amount", "") +
                    "&extraData=" + params.getOrDefault("extraData", "") +
                    "&message=" + params.getOrDefault("message", "") +
                    "&orderId=" + params.getOrDefault("orderId", "") +
                    "&orderInfo=" + params.getOrDefault("orderInfo", "") +
                    "&orderType=" + params.getOrDefault("orderType", "") +
                    "&partnerCode=" + params.getOrDefault("partnerCode", "") +
                    "&payType=" + params.getOrDefault("payType", "") +
                    "&requestId=" + params.getOrDefault("requestId", "") +
                    "&responseTime=" + params.getOrDefault("responseTime", "") +
                    "&resultCode=" + params.getOrDefault("resultCode", "") +
                    "&transId=" + params.getOrDefault("transId", "");

            String computedSignature = hmacSHA256(secretKey, signatureSource);
            return computedSignature.equals(receivedSignature);
        } catch (Exception e) {
            System.err.println("MoMo signature validation error: " + e.getMessage());
            return false;
        }
    }

    private String hmacSHA256(String key, String data) {
        try {
            Mac hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            hmac.init(secretKey);
            byte[] hash = hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }
}
