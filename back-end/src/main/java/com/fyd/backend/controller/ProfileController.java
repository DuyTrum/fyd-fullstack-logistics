package com.fyd.backend.controller;

import com.fyd.backend.annotation.Loggable;
import com.fyd.backend.dto.StaffDTO;
import com.fyd.backend.entity.User;
import com.fyd.backend.repository.UserRepository;
import com.fyd.backend.service.StaffService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/profile")
public class ProfileController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StaffService staffService;

    @Autowired
    private com.fyd.backend.service.ActivityLogService activityLogService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Lấy thông tin cá nhân của Admin/Staff hiện tại
     */
    @GetMapping
    public ResponseEntity<?> getCurrentProfile() {
        User user = getCurrentUser();
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        
        StaffDTO dto = StaffDTO.fromUser(user);
        // Bổ sung thêm các trường mà frontend cần
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("username", user.getUsername());
        response.put("fullName", user.getFullName());
        response.put("email", user.getEmail());
        response.put("phone", user.getPhone());
        response.put("avatar", user.getAvatarUrl());
        response.put("role", user.getRole().getName());
        response.put("createdAt", user.getCreatedAt());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Cập nhật thông tin cá nhân
     */
    @PutMapping
    @Loggable(action = "UPDATE", entityType = "PROFILE")
    public ResponseEntity<?> updateProfile(@RequestBody StaffDTO dto) {
        User user = getCurrentUser();
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        if (dto.getFullName() != null) user.setFullName(dto.getFullName());
        if (dto.getEmail() != null) user.setEmail(dto.getEmail());
        if (dto.getPhone() != null) user.setPhone(dto.getPhone());
        if (dto.getAvatarUrl() != null) user.setAvatarUrl(dto.getAvatarUrl());
        
        User updated = userRepository.save(user);
        return ResponseEntity.ok(StaffDTO.fromUser(updated));
    }

    /**
     * Đổi mật khẩu
     */
    @PostMapping("/change-password")
    @Loggable(action = "CHANGE_PASSWORD", entityType = "USER")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> request) {
        User user = getCurrentUser();
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        String oldPassword = request.get("oldPassword");
        String newPassword = request.get("newPassword");

        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mật khẩu cũ không chính xác"));
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công"));
    }

    /**
     * Lấy thống kê nhanh cho profile
     */
    @GetMapping("/stats")
    public ResponseEntity<?> getProfileStats() {
        User user = getCurrentUser();
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        Map<String, Object> stats = new HashMap<>();
        // Thực tế bạn có thể gọi từ DashboardService hoặc Repository
        stats.put("todayOrders", 15); // Mock data hoặc gọi service
        stats.put("todayProducts", 5);
        stats.put("todayCustomers", 10);
        
        return ResponseEntity.ok(stats);
    }

    /**
     * Lấy các hoạt động gần đây của Admin
     */
    @GetMapping("/activities")
    public ResponseEntity<?> getActivities() {
        User user = getCurrentUser();
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        org.springframework.data.domain.Page<com.fyd.backend.entity.ActivityLog> logs = 
            activityLogService.getLogs(user.getId(), null, null, null, null, 
            org.springframework.data.domain.PageRequest.of(0, 10, org.springframework.data.domain.Sort.by("createdAt").descending()));
            
        java.util.List<Map<String, Object>> activities = logs.getContent().stream().map(log -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", log.getId());
            map.put("type", log.getAction().toLowerCase());
            
            String text = log.getAction() + " " + log.getEntityType();
            if (log.getEntityName() != null) {
                text += " (" + log.getEntityName() + ")";
            } else if (log.getEntityId() != null) {
                text += " #" + log.getEntityId();
            }
            map.put("text", text);
            map.put("time", log.getCreatedAt().toString());
            return map;
        }).collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(activities);
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) return null;
        
        Object principal = auth.getPrincipal();
        if (principal instanceof String) {
            try {
                Long userId = Long.parseLong((String) principal);
                return userRepository.findById(userId).orElse(null);
            } catch (NumberFormatException e) {
                return null;
            }
        } else if (principal instanceof Long) {
            return userRepository.findById((Long) principal).orElse(null);
        } else if (principal instanceof User) {
            return (User) principal;
        }
        return null;
    }
}
