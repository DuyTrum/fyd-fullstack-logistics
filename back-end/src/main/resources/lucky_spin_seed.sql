-- =============================================
-- Lucky Spin Seed Data
-- Run this in MySQL to initialize the Lucky Spin feature
-- =============================================

-- 1. Create a Lucky Spin Program (active from now, valid for 3 months)
INSERT INTO lucky_spin_programs (name, description, start_date, end_date, daily_free_spins, points_per_spin, is_active, created_at, updated_at)
VALUES (
    N'Vòng Quay May Mắn FYD',
    N'Quay vòng quay để nhận các ưu đãi độc quyền từ FYD Store! Mỗi ngày bạn có 1 lượt quay miễn phí, hoặc đổi điểm thưởng để quay thêm.',
    NOW(),
    DATE_ADD(NOW(), INTERVAL 3 MONTH),
    1,
    50,
    TRUE,
    NOW(),
    NOW()
);

-- 2. Get the program ID we just inserted
SET @program_id = LAST_INSERT_ID();

-- 3. Insert rewards (8 segments for the wheel)
-- Segment 1: 5% discount
INSERT INTO lucky_spin_rewards (program_id, name, reward_type, reward_value, max_discount, min_order_amount, coupon_validity_days, base_probability, probability_multiplier_silver, probability_multiplier_gold, probability_multiplier_platinum, color, icon, sort_order, is_active, created_at)
VALUES (@program_id, N'Giảm 5%', 'PERCENT', 5, 50000, 100000, 7, 0.2500, 1.20, 1.50, 2.00, '#4CAF50', 'percent', 1, TRUE, NOW());

-- Segment 2: No reward
INSERT INTO lucky_spin_rewards (program_id, name, reward_type, reward_value, max_discount, min_order_amount, coupon_validity_days, base_probability, probability_multiplier_silver, probability_multiplier_gold, probability_multiplier_platinum, color, icon, sort_order, is_active, created_at)
VALUES (@program_id, N'Chúc may mắn', 'NO_REWARD', 0, NULL, 0, 0, 0.2000, 1.00, 0.80, 0.60, '#9E9E9E', 'star', 2, TRUE, NOW());

-- Segment 3: 10% discount
INSERT INTO lucky_spin_rewards (program_id, name, reward_type, reward_value, max_discount, min_order_amount, coupon_validity_days, base_probability, probability_multiplier_silver, probability_multiplier_gold, probability_multiplier_platinum, color, icon, sort_order, is_active, created_at)
VALUES (@program_id, N'Giảm 10%', 'PERCENT', 10, 100000, 200000, 7, 0.1500, 1.20, 1.50, 2.00, '#FF9800', 'percent', 3, TRUE, NOW());

-- Segment 4: No reward
INSERT INTO lucky_spin_rewards (program_id, name, reward_type, reward_value, max_discount, min_order_amount, coupon_validity_days, base_probability, probability_multiplier_silver, probability_multiplier_gold, probability_multiplier_platinum, color, icon, sort_order, is_active, created_at)
VALUES (@program_id, N'Hẹn lần sau', 'NO_REWARD', 0, NULL, 0, 0, 0.1500, 1.00, 0.80, 0.60, '#607D8B', 'star', 4, TRUE, NOW());

-- Segment 5: 20K fixed discount
INSERT INTO lucky_spin_rewards (program_id, name, reward_type, reward_value, max_discount, min_order_amount, coupon_validity_days, base_probability, probability_multiplier_silver, probability_multiplier_gold, probability_multiplier_platinum, color, icon, sort_order, is_active, created_at)
VALUES (@program_id, N'Giảm 20K', 'FIXED', 20000, NULL, 150000, 7, 0.1200, 1.20, 1.50, 2.00, '#2196F3', 'gift', 5, TRUE, NOW());

-- Segment 6: No reward
INSERT INTO lucky_spin_rewards (program_id, name, reward_type, reward_value, max_discount, min_order_amount, coupon_validity_days, base_probability, probability_multiplier_silver, probability_multiplier_gold, probability_multiplier_platinum, color, icon, sort_order, is_active, created_at)
VALUES (@program_id, N'Thử lại nhé', 'NO_REWARD', 0, NULL, 0, 0, 0.1300, 1.00, 0.80, 0.60, '#795548', 'star', 6, TRUE, NOW());

-- Segment 7: 15% discount (rare)
INSERT INTO lucky_spin_rewards (program_id, name, reward_type, reward_value, max_discount, min_order_amount, coupon_validity_days, base_probability, probability_multiplier_silver, probability_multiplier_gold, probability_multiplier_platinum, color, icon, sort_order, is_active, created_at)
VALUES (@program_id, N'Giảm 15%', 'PERCENT', 15, 150000, 300000, 5, 0.0400, 1.20, 1.50, 2.00, '#E91E63', 'percent', 7, TRUE, NOW());

-- Segment 8: 50K fixed discount (very rare)
INSERT INTO lucky_spin_rewards (program_id, name, reward_type, reward_value, max_discount, min_order_amount, coupon_validity_days, base_probability, probability_multiplier_silver, probability_multiplier_gold, probability_multiplier_platinum, color, icon, sort_order, is_active, created_at)
VALUES (@program_id, N'Giảm 50K', 'FIXED', 50000, NULL, 300000, 5, 0.0100, 1.20, 1.50, 2.00, '#FFD700', 'gift', 8, TRUE, NOW());

-- Verify data
SELECT 'Program created:' AS info;
SELECT * FROM lucky_spin_programs WHERE id = @program_id;

SELECT 'Rewards created:' AS info;
SELECT id, name, reward_type, reward_value, base_probability, sort_order FROM lucky_spin_rewards WHERE program_id = @program_id ORDER BY sort_order;
