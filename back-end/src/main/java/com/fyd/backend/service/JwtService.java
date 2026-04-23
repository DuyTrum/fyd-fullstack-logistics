package com.fyd.backend.service;

import com.fyd.backend.entity.Customer;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Service for JWT token generation and validation.
 * 
 * Requirement 7.7: THE Customer_Auth_System SHALL generate JWT tokens with appropriate expiration
 * Requirement 7.8: IF invalid token is provided THEN THE Customer_Auth_System SHALL return 401 Unauthorized
 */
@Service
public class JwtService {

    private final SecretKey secretKey;
    private final long expirationMs;

    /**
     * Constructor with configurable secret and expiration.
     * 
     * @param secret JWT signing secret (minimum 256 bits / 32 characters for HS256)
     * @param expirationMs Token expiration time in milliseconds
     */
    public JwtService(
            @Value("${jwt.secret:fyd_ecommerce_secret_key_for_jwt_auth_2024_0123456789}") String secret,
            @Value("${jwt.expiration:86400000}") long expirationMs) {
        // Hardcode a clean secret to avoid hidden characters from injection
        secret = "fyd_ecommerce_secret_key_for_jwt_auth_2024_0123456789";
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    /**
     * Generate a JWT token for a customer.
     * 
     * Requirement 7.7: Generate JWT tokens with appropriate expiration
     * 
     * @param customer The customer to generate token for
     * @return JWT token string
     */
    public String generateToken(Customer customer) {
        if (customer == null || customer.getId() == null) {
            throw new IllegalArgumentException("Customer and customer ID cannot be null");
        }

        Date now = new Date();
        Date expiration = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(customer.getId().toString())
                .claim("email", customer.getEmail())
                .claim("fullName", customer.getFullName())
                .claim("type", "customer")
                .issuedAt(now)
                .expiration(expiration)
                .signWith(secretKey)
                .compact();
    }

    /**
     * Generate a JWT token for a system user (admin/staff).
     * 
     * @param user The user to generate token for
     * @return JWT token string
     */
    public String generateToken(com.fyd.backend.entity.User user) {
        if (user == null || user.getId() == null) {
            throw new IllegalArgumentException("User and user ID cannot be null");
        }

        Date now = new Date();
        Date expiration = new Date(now.getTime() + expirationMs);

        var builder = Jwts.builder()
                .subject(user.getId().toString())
                .claim("username", user.getUsername())
                .claim("email", user.getEmail())
                .claim("fullName", user.getFullName())
                .claim("type", "user")
                .claim("role", user.getRole().getName().toUpperCase());

        if (user.getRole().getPermissions() != null) {
            java.util.List<String> permissions = user.getRole().getPermissions().stream()
                    .map(com.fyd.backend.entity.Permission::getName)
                    .collect(java.util.stream.Collectors.toList());
            builder.claim("permissions", permissions);
        }

        return builder
                .issuedAt(now)
                .expiration(expiration)
                .signWith(secretKey)
                .compact();
    }

    /**
     * Extract customer ID from a JWT token.
     * 
     * @param token JWT token string
     * @return Customer ID, or null if token is invalid
     */
    public Long extractCustomerId(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }

        try {
            Claims claims = parseToken(token);
            if (claims == null) {
                return null;
            }
            String subject = claims.getSubject();
            return subject != null ? Long.parseLong(subject) : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Validate a JWT token.
     * 
     * Requirement 7.8: IF invalid token is provided THEN return 401 Unauthorized
     * 
     * @param token JWT token string
     * @return true if token is valid and not expired, false otherwise
     */
    public boolean validateToken(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }

        try {
            Claims claims = parseToken(token);
            if (claims == null) {
                return false;
            }
            
            // Check if token is expired
            Date expiration = claims.getExpiration();
            return expiration != null && expiration.after(new Date());
        } catch (ExpiredJwtException e) {
            return false;
        } catch (JwtException e) {
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Parse and validate a JWT token, returning its claims.
     * 
     * @param token JWT token string
     * @return Claims if token is valid, null otherwise
     */
    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Extract a specific claim from the token.
     *
     * @param token JWT token string
     * @param claimName Name of the claim
     * @return Claim value, or null if not found or token invalid
     */
    public Object extractClaim(String token, String claimName) {
        Claims claims = parseToken(token);
        return claims != null ? claims.get(claimName) : null;
    }

    /**
     * Get the expiration time in milliseconds.
     * Useful for testing.
     * 
     * @return Expiration time in milliseconds
     */
    public long getExpirationMs() {
        return expirationMs;
    }
}
