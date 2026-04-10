package com.fyd.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class LuckySpinRepairController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/repair-lucky-spin")
    public String repair() {
        try {
            // Fix Program Name & Description
            jdbcTemplate.update("UPDATE lucky_spin_programs SET name = ?, description = ? WHERE name LIKE 'V%ng Quay%'",
                    "Vòng Quay May Mắn Tết 2026",
                    "Quay vòng quay để nhận các mã giảm giá hấp dẫn! Mỗi ngày bạn được quay 1 lần miễn phí, hoặc dùng 50 điểm để đổi thêm lượt quay.");

            // Fix Reward Names
            jdbcTemplate.update("UPDATE lucky_spin_rewards SET name = ? WHERE name LIKE 'Gi%m 5%'", "Giảm 5%");
            jdbcTemplate.update("UPDATE lucky_spin_rewards SET name = ? WHERE name LIKE 'Gi%m 10%'", "Giảm 10%");
            jdbcTemplate.update("UPDATE lucky_spin_rewards SET name = ? WHERE name LIKE 'Gi%m 20%'", "Giảm 20%");
            jdbcTemplate.update("UPDATE lucky_spin_rewards SET name = ? WHERE name LIKE 'Gi%m 50.000%'", "Giảm 50.000đ");
            jdbcTemplate.update("UPDATE lucky_spin_rewards SET name = ? WHERE name LIKE 'Gi%m 100.000%'", "Giảm 100.000đ");
            jdbcTemplate.update("UPDATE lucky_spin_rewards SET name = ? WHERE name LIKE 'Gi%m 200.000%'", "Giảm 200.000đ");
            jdbcTemplate.update("UPDATE lucky_spin_rewards SET name = ? WHERE name LIKE 'Mi%n ph% v%n chuyển%'", "Miễn phí vận chuyển");
            jdbcTemplate.update("UPDATE lucky_spin_rewards SET name = ? WHERE name LIKE 'Ch%c may m%n%'", "Chúc may mắn lần sau!");

            return "LuckSpin Data Repaired Successfully!";
        } catch (Exception e) {
            return "Repair Failed: " + e.getMessage();
        }
    }

    @GetMapping("/seed-lucky-spin")
    public String seedLuckySpin() {
        try {
            // Check if a program already exists
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM lucky_spin_programs", Integer.class);
            if (count != null && count > 0) {
                return "Lucky Spin data already exists! " + count + " program(s) found.";
            }

            // Insert program
            jdbcTemplate.update(
                "INSERT INTO lucky_spin_programs (name, description, start_date, end_date, daily_free_spins, points_per_spin, is_active, created_at, updated_at) " +
                "VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 3 MONTH), 1, 50, TRUE, NOW(), NOW())",
                "Vòng Quay May Mắn FYD",
                "Quay vòng quay để nhận các ưu đãi độc quyền từ FYD Store! Mỗi ngày bạn có 1 lượt quay miễn phí, hoặc đổi điểm thưởng để quay thêm."
            );

            // Get the inserted program ID
            Long programId = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);

            // Insert 8 rewards
            String rewardSql = "INSERT INTO lucky_spin_rewards (program_id, name, reward_type, reward_value, max_discount, min_order_amount, coupon_validity_days, base_probability, probability_multiplier_silver, probability_multiplier_gold, probability_multiplier_platinum, color, icon, sort_order, is_active, created_at) " +
                               "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1.20, 1.50, 2.00, ?, ?, ?, TRUE, NOW())";

            String noRewardSql = "INSERT INTO lucky_spin_rewards (program_id, name, reward_type, reward_value, max_discount, min_order_amount, coupon_validity_days, base_probability, probability_multiplier_silver, probability_multiplier_gold, probability_multiplier_platinum, color, icon, sort_order, is_active, created_at) " +
                                 "VALUES (?, ?, 'NO_REWARD', 0, NULL, 0, 0, ?, 1.00, 0.80, 0.60, ?, 'star', ?, TRUE, NOW())";

            // Segment 1: Giảm 5%
            jdbcTemplate.update(rewardSql, programId, "Giảm 5%", "PERCENT", 5, 50000, 100000, 7, 0.2500, "#4CAF50", "percent", 1);
            // Segment 2: Chúc may mắn
            jdbcTemplate.update(noRewardSql, programId, "Chúc may mắn", 0.2000, "#9E9E9E", 2);
            // Segment 3: Giảm 10%
            jdbcTemplate.update(rewardSql, programId, "Giảm 10%", "PERCENT", 10, 100000, 200000, 7, 0.1500, "#FF9800", "percent", 3);
            // Segment 4: Hẹn lần sau
            jdbcTemplate.update(noRewardSql, programId, "Hẹn lần sau", 0.1500, "#607D8B", 4);
            // Segment 5: Giảm 20K
            jdbcTemplate.update(rewardSql, programId, "Giảm 20K", "FIXED", 20000, null, 150000, 7, 0.1200, "#2196F3", "gift", 5);
            // Segment 6: Thử lại nhé
            jdbcTemplate.update(noRewardSql, programId, "Thử lại nhé", 0.1300, "#795548", 6);
            // Segment 7: Giảm 15%
            jdbcTemplate.update(rewardSql, programId, "Giảm 15%", "PERCENT", 15, 150000, 300000, 5, 0.0400, "#E91E63", "percent", 7);
            // Segment 8: Giảm 50K
            jdbcTemplate.update(rewardSql, programId, "Giảm 50K", "FIXED", 50000, null, 300000, 5, 0.0100, "#FFD700", "gift", 8);

            return "Lucky Spin seeded successfully! Program ID: " + programId + " with 8 rewards.";
        } catch (Exception e) {
            return "Seed Failed: " + e.getMessage();
        }
    }
}
