-- ============================================================================
-- FYD ORDER MANAGEMENT - COMPLETE DATABASE SETUP
-- ============================================================================
-- Version: 5.0 - Master Initialization Script
-- Description: Complete schema, permissions, and 40 real products
-- Compatible with: MySQL 8.0+ / MariaDB 10.5+
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Drop and create database
DROP DATABASE IF EXISTS fyd_db;
CREATE DATABASE fyd_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fyd_db;

-- ============================================================================
-- 1. AUTHENTICATION & RBAC
-- ============================================================================

CREATE TABLE roles (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE permissions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    group_name VARCHAR(100),
    description VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(60) NOT NULL UNIQUE,
  email VARCHAR(120) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120),
  phone VARCHAR(20),
  avatar_url VARCHAR(500),
  role_id BIGINT NOT NULL,
  status ENUM('ACTIVE','LOCKED') DEFAULT 'ACTIVE',
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE TABLE activity_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    action VARCHAR(20) NOT NULL COMMENT 'CREATE, UPDATE, DELETE, LOGIN, LOGOUT',
    entity_type VARCHAR(50) NOT NULL COMMENT 'Product, Order, Customer, User, etc.',
    entity_id BIGINT,
    entity_name VARCHAR(255),
    old_data JSON,
    new_data JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 2. CUSTOMERS & TIERS
-- ============================================================================

CREATE TABLE customer_tiers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  min_spent DECIMAL(14,2) DEFAULT 0,
  min_points INT DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  benefits TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE customers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(120) UNIQUE,
  password_hash VARCHAR(255),
  gender ENUM('MALE','FEMALE','OTHER'),
  date_of_birth DATE,
  avatar_url VARCHAR(500),
  tier_id BIGINT,
  total_spent DECIMAL(14,2) DEFAULT 0,
  total_orders INT DEFAULT 0,
  points INT DEFAULT 0,
  total_points INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  oauth_provider VARCHAR(20),
  oauth_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tier_id) REFERENCES customer_tiers(id)
) ENGINE=InnoDB;

-- ============================================================================
-- 3. PRODUCT CATALOG
-- ============================================================================

CREATE TABLE categories (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) UNIQUE,
  parent_id BIGINT,
  description VARCHAR(500),
  image_url VARCHAR(500),
  sort_order INT DEFAULT 0,
  status ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id)
) ENGINE=InnoDB;

CREATE TABLE brands (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  slug VARCHAR(120) UNIQUE,
  logo_url VARCHAR(500),
  description VARCHAR(500),
  status ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE colors (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  hex_code VARCHAR(7) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE sizes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(20) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE products (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE,
  category_id BIGINT,
  brand_id BIGINT,
  base_price DECIMAL(12,2) NOT NULL,
  sale_price DECIMAL(12,2),
  description TEXT,
  short_description VARCHAR(500),
  material VARCHAR(100),
  is_featured BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE,
  status VARCHAR(30) DEFAULT 'ACTIVE',
  view_count INT DEFAULT 0,
  sold_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (brand_id) REFERENCES brands(id)
) ENGINE=InnoDB;

CREATE TABLE product_images (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(200),
  is_primary BOOLEAN DEFAULT FALSE,
  is_hover BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE product_variants (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT NOT NULL,
  color_id BIGINT,
  size_id BIGINT,
  sku_variant VARCHAR(60),
  price_adjustment DECIMAL(12,2) DEFAULT 0,
  stock INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (color_id) REFERENCES colors(id),
  FOREIGN KEY (size_id) REFERENCES sizes(id),
  UNIQUE KEY unique_variant (product_id, color_id, size_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 4. SALES & PROMOTIONS
-- ============================================================================

CREATE TABLE promotions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL COMMENT 'PERCENT or FIXED',
    discount_value DECIMAL(12, 2) NOT NULL,
    min_order_amount DECIMAL(12, 2) DEFAULT 0,
    max_discount DECIMAL(12, 2),
    usage_limit INT,
    used_count INT DEFAULT 0,
    start_date DATETIME,
    end_date DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- 4.1 FLASH SALE SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS flash_sale_configs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    discount_label VARCHAR(100),
    version BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS flash_sale_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    flash_sale_config_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    variant_id BIGINT,
    sale_price DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flash_sale_config_id) REFERENCES flash_sale_configs(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    UNIQUE KEY uk_flash_sale_product_variant (flash_sale_config_id, product_id, variant_id),
    INDEX idx_flash_sale_lookup (flash_sale_config_id, product_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 4.2 NIGHT MARKET SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS night_market_configs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    min_offers INT DEFAULT 5,
    max_offers INT DEFAULT 8,
    min_discount_percent INT DEFAULT 10,
    max_discount_percent INT DEFAULT 70,
    offer_duration_days INT DEFAULT 7,
    is_active BOOLEAN DEFAULT TRUE,
    start_time DATETIME,
    end_time DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS night_market_customer_offers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    config_id BIGINT,
    product_id BIGINT NOT NULL,
    discount_percent INT NOT NULL,
    expiration_date DATETIME NOT NULL,
    is_revealed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (config_id) REFERENCES night_market_configs(id) ON DELETE SET NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_customer_offer_expiry (customer_id, expiration_date),
    INDEX idx_customer_offer_config (config_id)
) ENGINE=InnoDB;

CREATE TABLE orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_code VARCHAR(40) NOT NULL UNIQUE,
  customer_id BIGINT,
  staff_id BIGINT,
  subtotal DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  shipping_fee DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  shipping_name VARCHAR(100),
  shipping_phone VARCHAR(20),
  shipping_province VARCHAR(100),
  shipping_district VARCHAR(100),
  shipping_ward VARCHAR(100),
  shipping_address TEXT,
  shipping_method VARCHAR(20) DEFAULT 'STANDARD',
  payment_method VARCHAR(20),
  payment_status VARCHAR(20) DEFAULT 'PENDING',
  paid_at TIMESTAMP NULL,
  status VARCHAR(30) DEFAULT 'PENDING',
  notes TEXT,
  cancel_reason VARCHAR(500),
  promotion_code VARCHAR(50),
  points_used INT DEFAULT 0,
  points_earned INT DEFAULT 0,
  confirmed_at TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  tracking_number VARCHAR(50),
  carrier VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (staff_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  variant_id BIGINT,
  product_name VARCHAR(200),
  variant_info VARCHAR(100),
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  line_total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (variant_id) REFERENCES product_variants(id)
) ENGINE=InnoDB;

-- ============================================================================
-- 5. REVIEWS & FEEDBACK
-- ============================================================================

CREATE TABLE product_reviews (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT NOT NULL,
  customer_id BIGINT NOT NULL,
  rating INT NOT NULL,
  content TEXT,
  title VARCHAR(500),
  image_urls TEXT,
  status VARCHAR(20) DEFAULT 'PENDING',
  admin_reply TEXT,
  admin_reply_at TIMESTAMP NULL,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB;

-- ============================================================================
-- 6. NOTIFICATIONS & TRANSACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    customer_id BIGINT,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) DEFAULT 'INFO',
    is_read BOOLEAN DEFAULT FALSE,
    is_urgent BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    transaction_no VARCHAR(100),
    amount DECIMAL(14, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    payment_status VARCHAR(20) NOT NULL,
    gateway_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS featured_zones (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    position VARCHAR(50) DEFAULT 'home_featured',
    is_active BOOLEAN DEFAULT TRUE,
    grid_columns INT DEFAULT 4,
    grid_gap INT DEFAULT 16,
    grid_aspect_ratio VARCHAR(20) DEFAULT '3/4',
    product_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- 5. LUCKY SPIN FEATURE
-- ============================================================================

CREATE TABLE lucky_spin_programs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    daily_free_spins INT DEFAULT 1,
    points_per_spin INT DEFAULT 50,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active_dates (is_active, start_date, end_date)
) ENGINE=InnoDB;

CREATE TABLE lucky_spin_rewards (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    program_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    reward_type ENUM('PERCENT', 'FIXED', 'NO_REWARD') NOT NULL,
    reward_value DECIMAL(12, 2) DEFAULT 0,
    max_discount DECIMAL(12, 2) NULL,
    min_order_amount DECIMAL(12, 2) DEFAULT 0,
    coupon_validity_days INT DEFAULT 7,
    base_probability DECIMAL(5, 4) NOT NULL,
    probability_multiplier_silver DECIMAL(4, 2) DEFAULT 1.20,
    probability_multiplier_gold DECIMAL(4, 2) DEFAULT 1.50,
    probability_multiplier_platinum DECIMAL(4, 2) DEFAULT 2.00,
    color VARCHAR(7) DEFAULT '#FF6B6B',
    icon VARCHAR(50) DEFAULT 'gift',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES lucky_spin_programs(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE customer_coupons (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    program_id BIGINT NULL,
    reward_id BIGINT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type ENUM('PERCENT', 'FIXED') NOT NULL,
    discount_value DECIMAL(12, 2) NOT NULL,
    max_discount DECIMAL(12, 2) NULL,
    min_order_amount DECIMAL(12, 2) DEFAULT 0,
    expired_at DATETIME NOT NULL,
    status ENUM('ACTIVE', 'USED', 'EXPIRED') DEFAULT 'ACTIVE',
    used_at DATETIME NULL,
    used_order_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (program_id) REFERENCES lucky_spin_programs(id) ON DELETE SET NULL,
    FOREIGN KEY (reward_id) REFERENCES lucky_spin_rewards(id) ON DELETE SET NULL,
    FOREIGN KEY (used_order_id) REFERENCES orders(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE lucky_spin_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    program_id BIGINT NOT NULL,
    reward_id BIGINT NOT NULL,
    coupon_id BIGINT NULL,
    spin_type ENUM('FREE', 'POINTS_EXCHANGE') NOT NULL DEFAULT 'FREE',
    points_used INT DEFAULT 0,
    spin_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (program_id) REFERENCES lucky_spin_programs(id) ON DELETE CASCADE,
    FOREIGN KEY (reward_id) REFERENCES lucky_spin_rewards(id) ON DELETE CASCADE,
    FOREIGN KEY (coupon_id) REFERENCES customer_coupons(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================================
-- 5.2 SHARED WISHLISTS
-- ============================================================================

CREATE TABLE shared_wishlists (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    share_code VARCHAR(36) NOT NULL UNIQUE,
    product_ids TEXT NOT NULL,
    owner_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    view_count INT DEFAULT 0
) ENGINE=InnoDB;

-- ============================================================================
-- 5.3 GIFT CARDS
-- ============================================================================

CREATE TABLE gift_cards (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    initial_balance DECIMAL(12,2) NOT NULL,
    current_balance DECIMAL(12,2) NOT NULL,
    purchaser_id BIGINT,
    recipient_email VARCHAR(120),
    recipient_name VARCHAR(100),
    message TEXT,
    status ENUM('ACTIVE','USED','EXPIRED','CANCELLED') DEFAULT 'ACTIVE',
    expires_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (purchaser_id) REFERENCES customers(id) ON DELETE SET NULL,
    INDEX idx_gift_card_code (code),
    INDEX idx_gift_card_status (status)
) ENGINE=InnoDB;

CREATE TABLE gift_card_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    gift_card_id BIGINT NOT NULL,
    order_id BIGINT,
    amount DECIMAL(12,2) NOT NULL,
    balance_after DECIMAL(12,2) NOT NULL,
    transaction_type ENUM('PURCHASE','REDEMPTION','REFUND') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================================
-- 6. INDEXES
-- ============================================================================

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_tracking_number ON orders(tracking_number);

-- ============================================================================
-- 7. INITIAL SEEDING
-- ============================================================================

-- Roles
INSERT INTO roles (id, name, description) VALUES
(1, 'ADMIN', 'Quản trị viên hệ thống'),
(2, 'STAFF', 'Nhân viên bán hàng'),
(3, 'WAREHOUSE', 'Nhân viên kho');

-- Permissions
INSERT INTO permissions (name, group_name, description) VALUES 
('users:read', 'Tài khoản', 'Xem danh sách tài khoản'),
('users:create', 'Tài khoản', 'Thêm tài khoản mới'),
('users:update', 'Tài khoản', 'Cập nhật tài khoản'),
('users:delete', 'Tài khoản', 'Xóa tài khoản'),
('staff:read', 'Nhân sự', 'Xem danh sách nhân viên'),
('staff:create', 'Nhân sự', 'Thêm nhân viên mới'),
('staff:update', 'Nhân sự', 'Cập nhật nhân viên'),
('staff:delete', 'Nhân sự', 'Xóa nhân viên'),
('orders:read', 'Đơn hàng', 'Xem danh sách đơn hàng'),
('orders:update', 'Đơn hàng', 'Cập nhật trạng thái đơn hàng'),
('products:read', 'Sản phẩm', 'Xem danh mục sản phẩm'),
('products:create', 'Sản phẩm', 'Thêm sản phẩm mới'),
('products:update', 'Sản phẩm', 'Sửa sản phẩm'),
('products:delete', 'Sản phẩm', 'Xóa sản phẩm');

-- Mapping All Permissions to ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'ADMIN';

-- Default Admin (Pass: admin123)
INSERT INTO users (username, email, password_hash, full_name, role_id, avatar_url) VALUES
('admin', 'admin@fyd.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MQDq3kXjE5V3K5VqI/H3Z5p5/5Z5p5u', 'Admin FYD', 1, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop');

-- Customer Tiers
INSERT INTO customer_tiers (id, name, min_spent, min_points, discount_percent, benefits, sort_order) VALUES
(1, 'Bronze', 0, 0, 0, 'Ưu đãi cơ bản', 1),
(2, 'Silver', 2000000, 200, 5, 'Giảm 5% tất cả sản phẩm', 2),
(3, 'Gold', 5000000, 500, 10, 'Giảm 10% + Free ship', 3),
(4, 'Platinum', 10000000, 1000, 15, 'Giảm 15% + Free ship + Quà tặng', 4);

-- Sample Customers
INSERT INTO customers (full_name, phone, email, password_hash, tier_id, avatar_url) VALUES
('Nguyễn Văn Duy', '0987654321', 'duy@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MQDq3kXjE5V3K5VqI/H3Z5p5/5Z5p5u', 2, 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&h=200&fit=crop'),
('Trần Thị Hoa', '0123456789', 'hoa@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MQDq3kXjE5V3K5VqI/H3Z5p5/5Z5p5u', 1, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop');

-- Promotions
INSERT INTO promotions (code, name, description, discount_type, discount_value, min_order_amount, usage_limit, is_active, start_date, end_date) VALUES 
('QUY_TY_2026', 'Lì xì Tết Quý Tỵ 2026', 'Mã giảm giá đặc biệt mừng Xuân 2026', 'PERCENT', 15.00, 200000.00, 200, 1, '2026-01-01 00:00:00', '2026-03-31 23:59:59'), 
('FREESHIP_FYD', 'Miễn phí vận chuyển FYD', 'Giảm 30k phí vận chuyển cho đơn hàng từ 500k', 'FIXED', 30000.00, 500000.00, 500, 1, '2026-01-01 00:00:00', '2026-12-31 23:59:59');

-- Lucky Spin Program
INSERT INTO lucky_spin_programs (id, name, description, start_date, end_date, daily_free_spins, points_per_spin, is_active) VALUES
(1, 'Vòng Quay May Mắn Xuân 2026', 'Quay vòng quay để nhận các mã giảm giá hấp dẫn! Mỗi ngày bạn được quay 1 lần miễn phí.', '2026-01-01 00:00:00', '2026-03-31 23:59:59', 1, 50, 1);

-- Lucky Spin Rewards
INSERT INTO lucky_spin_rewards (program_id, name, reward_type, reward_value, max_discount, min_order_amount, coupon_validity_days, base_probability, color, icon, sort_order) VALUES
(1, 'Giảm 5%', 'PERCENT', 5.00, 50000, 100000, 7, 0.2500, '#4ECDC4', 'percent', 1),
(1, 'Giảm 10%', 'PERCENT', 10.00, 100000, 200000, 7, 0.1500, '#45B7D1', 'percent', 2),
(1, 'Giảm 20%', 'PERCENT', 20.00, 200000, 300000, 7, 0.0500, '#96CEB4', 'star', 3),
(1, 'Giảm 50.000đ', 'FIXED', 50000, NULL, 200000, 7, 0.1500, '#FFEAA7', 'tag', 4),
(1, 'Giảm 100.000đ', 'FIXED', 100000, NULL, 500000, 7, 0.0500, '#DDA0DD', 'gift', 5),
(1, 'Giảm 200.000đ', 'FIXED', 200000, NULL, 1000000, 7, 0.0200, '#FFD700', 'crown', 6),
(1, 'Miễn phí vận chuyển', 'FIXED', 30000, NULL, 0, 7, 0.1300, '#98D8C8', 'truck', 7),
(1, 'Chúc may mắn lần sau!', 'NO_REWARD', 0, NULL, 0, 0, 0.2000, '#FF6B6B', 'heart', 8);
-- Categories (Parent)
INSERT INTO categories (id, name, slug, parent_id, sort_order) VALUES
(1, 'Áo', 'ao', NULL, 1),
(2, 'Quần', 'quan', NULL, 2),
(3, 'Giày', 'giay', NULL, 3),
(4, 'Phụ kiện', 'phu-kien', NULL, 4);

-- Categories (Children)
INSERT INTO categories (id, name, slug, parent_id, sort_order) VALUES
(5, 'Áo thun', 'ao-thun', 1, 1),
(6, 'Áo polo', 'ao-polo', 1, 2),
(7, 'Áo hoodie', 'ao-hoodie', 1, 3),
(8, 'Áo khoác', 'ao-khoac', 1, 4),
(9, 'Áo sơ mi', 'ao-so-mi', 1, 5),
(10, 'Quần jeans', 'quan-jeans', 2, 1),
(11, 'Quần kaki', 'quan-kaki', 2, 2),
(12, 'Quần short', 'quan-short', 2, 3),
(13, 'Quần jogger', 'quan-jogger', 2, 4),
(14, 'Giày sneaker', 'giay-sneaker', 3, 1),
(15, 'Giày chạy bộ', 'giay-chay-bo', 3, 2),
(16, 'Dép & Sandal', 'dep-sandal', 3, 3),
(17, 'Túi xách', 'tui-xach', 4, 1),
(18, 'Mũ & Nón', 'mu-non', 4, 2),
(19, 'Tất', 'tat', 4, 3);

-- Brands
INSERT INTO brands (name, slug, description) VALUES
('FYD Original', 'fyd-original', 'Thuong hieu chinh hang FYD'),
('FYD Sport', 'fyd-sport', 'Dong san pham the thao'),
('FYD Premium', 'fyd-premium', 'Dong san pham cao cap'),
('FYD Street', 'fyd-street', 'Dong streetwear');

-- Colors
INSERT INTO colors (id, name, hex_code) VALUES
(1, 'Đen', '#000000'),
(2, 'Trắng', '#FFFFFF'),
(3, 'Xám', '#808080'),
(4, 'Navy', '#000080'),
(5, 'Đỏ', '#FF0000'),
(6, 'Xanh dương', '#0066CC'),
(7, 'Xanh lá', '#008000'),
(8, 'Be', '#F5F5DC'),
(9, 'Nâu', '#8B4513'),
(10, 'Hồng', '#FFC0CB'),
(11, 'Vàng', '#FFD700'),
(12, 'Cam', '#FF6600');

-- Sizes
INSERT INTO sizes (id, name, sort_order) VALUES
(1, 'S', 1),
(2, 'M', 2),
(3, 'L', 3),
(4, 'XL', 4),
(5, 'XXL', 5),
(6, '38', 6),
(7, '39', 7),
(8, '40', 8),
(9, '41', 9),
(10, '42', 10),
(11, '43', 11),
(12, '44', 12);

-- ============================================================================
-- PRODUCTS (30 products)
-- ============================================================================

INSERT INTO products (id, sku, name, slug, category_id, brand_id, base_price, sale_price, description, short_description, material, is_featured, is_new, sold_count) VALUES
(1, 'AT-001', 'Áo Thun Essential Tee', 'ao-thun-essential-tee', 5, 1, 299000, NULL, 'Áo thun basic với chất liệu cotton 100% thoáng mát, form regular fit phù hợp mọi vóc dáng. Thiết kế tối giản, dễ phối đồ cho mọi dịp.', 'Áo thun cotton basic form regular fit', '100% Cotton', TRUE, TRUE, 156),
(2, 'AP-001', 'Áo Polo Classic Fit', 'ao-polo-classic-fit', 6, 1, 450000, 359000, 'Áo polo phom dáng cổ điển với chất liệu pique cotton cao cấp. Cổ áo cứng cáp, bo tay co giãn tốt.', 'Áo polo cotton pique cao cấp', '100% Cotton Pique', TRUE, FALSE, 234),
(3, 'HD-001', 'Hoodie Oversize Premium', 'hoodie-oversize-premium', 7, 3, 650000, NULL, 'Hoodie form oversize với chất liệu nỉ bông dày dặn 350gsm. Mũ trùm 2 lớp, túi kangaroo rộng rãi. Phong cách streetwear đường phố.', 'Hoodie oversize nỉ bông 350gsm', '80% Cotton, 20% Polyester', TRUE, TRUE, 89),
(4, 'AK-001', 'Áo Khoác Bomber Classic', 'bomber-jacket-classic', 8, 4, 890000, 712000, 'Áo khoác bomber phong cách retro với chất liệu nylon chống nước nhẹ. Lót trong êm mại, khóa kéo YKK cao cấp.', 'Áo bomber nylon chống nước', '100% Nylon, Lót Polyester', TRUE, FALSE, 67),
(5, 'SM-001', 'Sơ Mi Oxford Regular', 'so-mi-oxford-regular', 9, 1, 520000, NULL, 'Áo sơ mi oxford với chất liệu dệt đặc trưng, form regular fit thanh lịch. Cổ button-down, phù hợp công sở và casual.', 'Sơ mi oxford form regular', '100% Cotton Oxford', FALSE, TRUE, 145),
(6, 'QJ-001', 'Quần Jeans Slim Stretch', 'quan-jeans-slim-stretch', 10, 1, 650000, 520000, 'Quần jeans slim fit với chất denim co giãn thoải mái. Wash nhẹ tạo hiệu ứng vintage, form ôm vừa phải.', 'Jeans slim fit co giãn', '98% Cotton, 2% Spandex', TRUE, FALSE, 312),
(7, 'QK-001', 'Quần Kaki Chinos Slim', 'quan-kaki-chinos-slim', 11, 1, 480000, NULL, 'Quần kaki chinos form slim với chất twill cotton mềm mại. Kiểu dáng hiện đại, dễ phối từ casual đến smart casual.', 'Quần chinos cotton twill', '97% Cotton, 3% Spandex', FALSE, TRUE, 178),
(8, 'QS-001', 'Quần Short Cargo Utility', 'quan-short-cargo-utility', 12, 4, 420000, 336000, 'Quần short cargo với nhiều túi hộp tiện dụng. Chất liệu ripstop bền bỉ, phong cách military streetwear.', 'Short cargo ripstop đa túi', '100% Cotton Ripstop', TRUE, FALSE, 98),
(9, 'QJ-002', 'Quần Jogger Tech Fleece', 'jogger-tech-fleece', 13, 2, 550000, NULL, 'Quần jogger với chất liệu tech fleece cao cấp. Bo chân cổ điển, dây rút eo tiện lợi. Phù hợp thể thao và daily wear.', 'Jogger tech fleece thể thao', '60% Cotton, 40% Polyester', TRUE, TRUE, 234),
(10, 'GS-001', 'Giày Sneaker Forum Low', 'sneaker-forum-low', 14, 4, 1890000, 1512000, 'Giày sneaker cổ thấp với thiết kế retro basketball. Upper da tổng hợp cao cấp, đế cao su bền bỉ.', 'Sneaker low-top da tổng hợp', 'Synthetic Leather, Rubber Sole', TRUE, FALSE, 156);


INSERT INTO products (id, sku, name, slug, category_id, brand_id, base_price, sale_price, description, short_description, material, is_featured, is_new, sold_count) VALUES
(11, 'GR-001', 'Giày Chạy Ultraboost 6.0', 'running-ultraboost-6', 15, 2, 2890000, NULL, 'Giày chạy bộ với công nghệ đệm Boost hoàn trả năng lượng. Upper Primeknit thoáng khí, đế Continental bám đường.', 'Giày chạy công nghệ Boost', 'Primeknit Upper, Boost Midsole', TRUE, TRUE, 89),
(12, 'DS-001', 'Dép Slides Comfort Classic', 'slides-comfort-classic', 16, 1, 450000, 360000, 'Dép slides với quai bandage êm ái, đế cloudfoam siêu nhẹ. Thiết kế tối giản, phù hợp mọi hoàn cảnh.', 'Slides đế cloudfoam êm ái', 'Synthetic, Cloudfoam Sole', FALSE, FALSE, 267),
(13, 'TT-001', 'Túi Tote Canvas Large', 'tote-bag-canvas-large', 17, 1, 390000, NULL, 'Túi tote canvas dung tích lớn với ngăn trong có khóa kéo. Quai xách dài, phù hợp đi học, đi làm.', 'Túi tote canvas dung tích lớn', '100% Canvas Cotton', FALSE, TRUE, 145),
(14, 'NC-001', 'Nón Baseball Cap Classic', 'baseball-cap-classic', 18, 1, 280000, NULL, 'Nón baseball với form 6 panel cổ điển. Logo thêu nổi phía trước, khóa điều chỉnh phía sau.', 'Nón lưỡi trai 6 panel', '100% Cotton Twill', FALSE, FALSE, 389),
(15, 'TC-001', 'Tất Crew Socks 3-Pack', 'crew-socks-3-pack', 19, 1, 190000, 152000, 'Set 3 đôi tất crew với đệm Terry ở gót và mũi. Chất liệu cotton blend thoáng khí, chống vi khuẩn.', 'Pack 3 đôi tất cotton blend', '70% Cotton, 27% Polyester, 3% Spandex', FALSE, FALSE, 567),
(16, 'AT-002', 'Áo Thun Graphic Street', 'ao-thun-graphic-street', 5, 4, 350000, NULL, 'Áo thun với họa tiết graphic in lụa chất lượng cao. Form regular fit, cổ tròn bo, phong cách street.', 'Áo thun in graphic streetwear', '100% Cotton 220gsm', TRUE, TRUE, 123),
(17, 'AP-002', 'Áo Polo Sport Performance', 'polo-sport-performance', 6, 2, 520000, 416000, 'Áo polo thể thao với công nghệ Climalite thoát ẩm. Chất liệu mesh thoáng khí, phù hợp vận động.', 'Polo thể thao công nghệ thoát ẩm', '100% Recycled Polyester', TRUE, FALSE, 178),
(18, 'HD-002', 'Hoodie Zip Essential', 'hoodie-zip-essential', 7, 1, 590000, NULL, 'Hoodie khóa kéo với chất nỉ french terry mềm mại 300gsm. Form regular fit, 2 túi bên hông tiện lợi.', 'Hoodie zip-up french terry', '80% Cotton, 20% Polyester', FALSE, TRUE, 89),
(19, 'AK-002', 'Áo Khoác Gió Windbreaker Packable', 'windbreaker-packable', 8, 2, 750000, 600000, 'Áo khoác gió siêu nhẹ có thể gấp gọn vào túi. Chống nước cấp độ 3, lý tưởng cho hoạt động outdoor.', 'Áo gió packable chống nước', '100% Nylon Ripstop', TRUE, FALSE, 67),
(20, 'SM-002', 'Sơ Mi Linen Relaxed', 'so-mi-linen-relaxed', 9, 3, 680000, NULL, 'Sơ mi linen với form relaxed fit thoải mái. Chất liệu 100% linen tự nhiên, lý tưởng cho mùa hè.', 'Sơ mi linen relaxed fit', '100% Linen', FALSE, TRUE, 56),
(21, 'QJ-003', 'Quần Jeans Wide Leg 90s', 'jeans-wide-leg-90s', 10, 4, 720000, 576000, 'Quần jeans ống rộng phong cách 90s. Cạp cao, wash medium blue vintage, denim 100% cotton cứng cáp.', 'Jeans wide leg phong cách 90s', '100% Cotton Denim', TRUE, TRUE, 145),
(22, 'QK-002', 'Quần Kaki Pleated Trouser', 'kaki-pleated-trouser', 11, 3, 550000, NULL, 'Quần kaki có ly trang nhã với form wide fit hiện đại. Chất liệu cotton blend mềm mại, cạp cao thanh lịch.', 'Quần kaki ly wide fit', '95% Cotton, 5% Elastane', FALSE, FALSE, 78),
(23, 'QS-002', 'Quần Short Sweat Essential', 'sweat-short-essential', 12, 1, 350000, 280000, 'Quần short thun nỉ với chất french terry nhẹ. Dây rút eo, 2 túi bên, lý tưởng cho mùa hè.', 'Short nỉ french terry', '100% Cotton French Terry', FALSE, FALSE, 234),
(24, 'QJ-004', 'Quần Jogger Cargo Tactical', 'jogger-cargo-tactical', 13, 4, 620000, NULL, 'Quần jogger cargo với túi hộp 2 bên. Chất liệu ripstop bền bỉ, bo gấu có thể điều chỉnh.', 'Jogger cargo ripstop', '100% Cotton Ripstop', TRUE, TRUE, 167),
(25, 'GS-002', 'Giày Sneaker Forum High', 'sneaker-forum-high', 14, 4, 2190000, 1752000, 'Giày sneaker cổ cao với thiết kế basketball retro. Quai velcro cổ điển, đệm mút êm ái.', 'Sneaker high-top retro', 'Leather, Rubber Sole', TRUE, FALSE, 89),
(26, 'GR-002', 'Giày Chạy Lite Racer', 'running-lite-racer', 15, 2, 1590000, NULL, 'Giày chạy nhẹ với upper mesh thoáng khí. Đế Lightmotion siêu nhẹ, phù hợp chạy đường dài.', 'Giày chạy siêu nhẹ', 'Mesh Upper, EVA Midsole', FALSE, TRUE, 145),
(27, 'DS-002', 'Sandal Outdoor Trek', 'sandal-outdoor-trek', 16, 2, 890000, 712000, 'Sandal outdoor với quai điều chỉnh 3 điểm. Đế vibram bám đường, phù hợp hiking và dã ngoại.', 'Sandal outdoor đế vibram', 'Synthetic, Vibram Sole', FALSE, FALSE, 67),
(28, 'BL-001', 'Balo Urban Commuter', 'balo-urban-commuter', 17, 1, 890000, NULL, 'Balo urban với ngăn laptop 15 inch có đệm. Chất liệu polyester chống nước, nhiều ngăn tiện lợi.', 'Balo urban chống nước', 'Water-resistant Polyester', TRUE, TRUE, 123),
(29, 'NC-002', 'Nón Bucket Hat Reversible', 'bucket-hat-reversible', 18, 4, 320000, 256000, 'Nón bucket 2 mặt với 2 màu khác nhau. Chất liệu cotton twill, vành rộng che nắng tốt.', 'Nón bucket 2 mặt', '100% Cotton Twill', FALSE, FALSE, 189),
(30, 'TC-002', 'Tất Ankle Socks 6-Pack', 'ankle-socks-6-pack', 19, 1, 250000, NULL, 'Set 6 đôi tất cổ ngắn với đệm nhẹ. Chất cotton blend thoáng khí, phù hợp sneaker và giày thể thao.', 'Pack 6 đôi tất ankle', '70% Cotton, 27% Polyester, 3% Spandex', FALSE, TRUE, 456);

-- ============================================================================
-- PRODUCT IMAGES (4-5 images per product)
-- ============================================================================

-- Product 1-5 images
INSERT INTO product_images (product_id, image_url, is_primary, is_hover, sort_order) VALUES
(1, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80', TRUE, FALSE, 1),
(1, 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&q=80', FALSE, TRUE, 2),
(1, 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80', FALSE, FALSE, 3),
(1, 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&q=80', FALSE, FALSE, 4),
(2, 'https://images.unsplash.com/photo-1625910513413-5fc5f4d11d90?w=800&q=80', TRUE, FALSE, 1),
(2, 'https://images.unsplash.com/photo-1598033129183-c4f50c736c4f?w=800&q=80', FALSE, TRUE, 2),
(2, 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=800&q=80', FALSE, FALSE, 3),
(2, 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80', FALSE, FALSE, 4),
(3, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80', TRUE, FALSE, 1),
(3, 'https://images.unsplash.com/photo-1578768079052-aa76e52ff62e?w=800&q=80', FALSE, TRUE, 2),
(3, 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80', FALSE, FALSE, 3),
(3, 'https://images.unsplash.com/photo-1509942774463-acf339cf87d5?w=800&q=80', FALSE, FALSE, 4),
(4, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80', TRUE, FALSE, 1),
(4, 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800&q=80', FALSE, TRUE, 2),
(4, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80', FALSE, FALSE, 3),
(4, 'https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=800&q=80', FALSE, FALSE, 4),
(5, 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80', TRUE, FALSE, 1),
(5, 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80', FALSE, TRUE, 2),
(5, 'https://images.unsplash.com/photo-1598961942613-ba897716405b?w=800&q=80', FALSE, FALSE, 3),
(5, 'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=800&q=80', FALSE, FALSE, 4);


-- Product 6-10 images
INSERT INTO product_images (product_id, image_url, is_primary, is_hover, sort_order) VALUES
(6, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80', TRUE, FALSE, 1),
(6, 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80', FALSE, TRUE, 2),
(6, 'https://images.unsplash.com/photo-1604176354204-9268737828e4?w=800&q=80', FALSE, FALSE, 3),
(6, 'https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=800&q=80', FALSE, FALSE, 4),
(7, 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80', TRUE, FALSE, 1),
(7, 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80', FALSE, TRUE, 2),
(7, 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&q=80', FALSE, FALSE, 3),
(7, 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800&q=80', FALSE, FALSE, 4),
(8, 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&q=80', TRUE, FALSE, 1),
(8, 'https://images.unsplash.com/photo-1560243563-062bfc001d68?w=800&q=80', FALSE, TRUE, 2),
(8, 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800&q=80', FALSE, FALSE, 3),
(8, 'https://images.unsplash.com/photo-1617952385804-7b326fa42766?w=800&q=80', FALSE, FALSE, 4),
(9, 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800&q=80', TRUE, FALSE, 1),
(9, 'https://images.unsplash.com/photo-1580906853149-f9b7d0e5b7c5?w=800&q=80', FALSE, TRUE, 2),
(9, 'https://images.unsplash.com/photo-1562183241-b937e95585b6?w=800&q=80', FALSE, FALSE, 3),
(9, 'https://images.unsplash.com/photo-1519568470290-c0c1fbfff16f?w=800&q=80', FALSE, FALSE, 4),
(10, 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800&q=80', TRUE, FALSE, 1),
(10, 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80', FALSE, TRUE, 2),
(10, 'https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=800&q=80', FALSE, FALSE, 3),
(10, 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=800&q=80', FALSE, FALSE, 4);

-- Product 11-15 images
INSERT INTO product_images (product_id, image_url, is_primary, is_hover, sort_order) VALUES
(11, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', TRUE, FALSE, 1),
(11, 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80', FALSE, TRUE, 2),
(11, 'https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=800&q=80', FALSE, FALSE, 3),
(11, 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80', FALSE, FALSE, 4),
(12, 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800&q=80', TRUE, FALSE, 1),
(12, 'https://images.unsplash.com/photo-1562183241-840b8af0721e?w=800&q=80', FALSE, TRUE, 2),
(12, 'https://images.unsplash.com/photo-1595341888016-a392ef81b7de?w=800&q=80', FALSE, FALSE, 3),
(12, 'https://images.unsplash.com/photo-1582897085656-c636d006a246?w=800&q=80', FALSE, FALSE, 4),
(13, 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=800&q=80', TRUE, FALSE, 1),
(13, 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80', FALSE, TRUE, 2),
(13, 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80', FALSE, FALSE, 3),
(13, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', FALSE, FALSE, 4),
(14, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&q=80', TRUE, FALSE, 1),
(14, 'https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=800&q=80', FALSE, TRUE, 2),
(14, 'https://images.unsplash.com/photo-1575428652377-a2d80e2277fc?w=800&q=80', FALSE, FALSE, 3),
(14, 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=800&q=80', FALSE, FALSE, 4),
(15, 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=800&q=80', TRUE, FALSE, 1),
(15, 'https://images.unsplash.com/photo-1582966772680-860e372bb558?w=800&q=80', FALSE, TRUE, 2),
(15, 'https://images.unsplash.com/photo-1556306535-0f09a537f0a3?w=800&q=80', FALSE, FALSE, 3),
(15, 'https://images.unsplash.com/photo-1631006254788-bcde0a7e90fd?w=800&q=80', FALSE, FALSE, 4);

-- Product 16-20 images
INSERT INTO product_images (product_id, image_url, is_primary, is_hover, sort_order) VALUES
(16, 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800&q=80', TRUE, FALSE, 1),
(16, 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=800&q=80', FALSE, TRUE, 2),
(16, 'https://images.unsplash.com/photo-1527719327859-c6ce80353573?w=800&q=80', FALSE, FALSE, 3),
(16, 'https://images.unsplash.com/photo-1554568218-0f1715e72254?w=800&q=80', FALSE, FALSE, 4),
(17, 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=800&q=80', TRUE, FALSE, 1),
(17, 'https://images.unsplash.com/photo-1564584217132-2271feaeb3c5?w=800&q=80', FALSE, TRUE, 2),
(17, 'https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=800&q=80', FALSE, FALSE, 3),
(17, 'https://images.unsplash.com/photo-1605518216938-7c31b7b14ad0?w=800&q=80', FALSE, FALSE, 4),
(18, 'https://images.unsplash.com/photo-1614975059251-992f11792b9f?w=800&q=80', TRUE, FALSE, 1),
(18, 'https://images.unsplash.com/photo-1611911813383-67769b37a149?w=800&q=80', FALSE, TRUE, 2),
(18, 'https://images.unsplash.com/photo-1578768079052-aa76e52ff62e?w=800&q=80', FALSE, FALSE, 3),
(18, 'https://images.unsplash.com/photo-1556172732-070e9070b2fd?w=800&q=80', FALSE, FALSE, 4),
(19, 'https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?w=800&q=80', TRUE, FALSE, 1),
(19, 'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800&q=80', FALSE, TRUE, 2),
(19, 'https://images.unsplash.com/photo-1559551409-dadc959f76b8?w=800&q=80', FALSE, FALSE, 3),
(19, 'https://images.unsplash.com/photo-1490367532201-b9bc1dc483f6?w=800&q=80', FALSE, FALSE, 4),
(20, 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80', TRUE, FALSE, 1),
(20, 'https://images.unsplash.com/photo-1564584217132-2271feaeb3c5?w=800&q=80', FALSE, TRUE, 2),
(20, 'https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?w=800&q=80', FALSE, FALSE, 3),
(20, 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80', FALSE, FALSE, 4);


-- Product 21-25 images
INSERT INTO product_images (product_id, image_url, is_primary, is_hover, sort_order) VALUES
(21, 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80', TRUE, FALSE, 1),
(21, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80', FALSE, TRUE, 2),
(21, 'https://images.unsplash.com/photo-1475178626620-a4d074967452?w=800&q=80', FALSE, FALSE, 3),
(21, 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800&q=80', FALSE, FALSE, 4),
(22, 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&q=80', TRUE, FALSE, 1),
(22, 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80', FALSE, TRUE, 2),
(22, 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&q=80', FALSE, FALSE, 3),
(22, 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800&q=80', FALSE, FALSE, 4),
(23, 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&q=80', TRUE, FALSE, 1),
(23, 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&q=80', FALSE, TRUE, 2),
(23, 'https://images.unsplash.com/photo-1517438476312-10d79c077509?w=800&q=80', FALSE, FALSE, 3),
(23, 'https://images.unsplash.com/photo-1556306535-0f09a537f0a3?w=800&q=80', FALSE, FALSE, 4),
(24, 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800&q=80', TRUE, FALSE, 1),
(24, 'https://images.unsplash.com/photo-1562183241-b937e95585b6?w=800&q=80', FALSE, TRUE, 2),
(24, 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80', FALSE, FALSE, 3),
(24, 'https://images.unsplash.com/photo-1517438476312-10d79c077509?w=800&q=80', FALSE, FALSE, 4),
(25, 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=800&q=80', TRUE, FALSE, 1),
(25, 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800&q=80', FALSE, TRUE, 2),
(25, 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80', FALSE, FALSE, 3),
(25, 'https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=800&q=80', FALSE, FALSE, 4);

-- Product 26-30 images
INSERT INTO product_images (product_id, image_url, is_primary, is_hover, sort_order) VALUES
(26, 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80', TRUE, FALSE, 1),
(26, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', FALSE, TRUE, 2),
(26, 'https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=800&q=80', FALSE, FALSE, 3),
(26, 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&q=80', FALSE, FALSE, 4),
(27, 'https://images.unsplash.com/photo-1562183241-840b8af0721e?w=800&q=80', TRUE, FALSE, 1),
(27, 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800&q=80', FALSE, TRUE, 2),
(27, 'https://images.unsplash.com/photo-1595341888016-a392ef81b7de?w=800&q=80', FALSE, FALSE, 3),
(27, 'https://images.unsplash.com/photo-1582897085656-c636d006a246?w=800&q=80', FALSE, FALSE, 4),
(28, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', TRUE, FALSE, 1),
(28, 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=800&q=80', FALSE, TRUE, 2),
(28, 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80', FALSE, FALSE, 3),
(28, 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80', FALSE, FALSE, 4),
(29, 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&q=80', TRUE, FALSE, 1),
(29, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&q=80', FALSE, TRUE, 2),
(29, 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=800&q=80', FALSE, FALSE, 3),
(29, 'https://images.unsplash.com/photo-1575428652377-a2d80e2277fc?w=800&q=80', FALSE, FALSE, 4),
(30, 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=800&q=80', TRUE, FALSE, 1),
(30, 'https://images.unsplash.com/photo-1631006254788-bcde0a7e90fd?w=800&q=80', FALSE, TRUE, 2),
(30, 'https://images.unsplash.com/photo-1582966772680-860e372bb558?w=800&q=80', FALSE, FALSE, 3),
(30, 'https://images.unsplash.com/photo-1556306535-0f09a537f0a3?w=800&q=80', FALSE, FALSE, 4);

-- ============================================================================
-- PRODUCT VARIANTS (Sample variants with stock)
-- ============================================================================

-- Products 1-5 with detailed variants
INSERT INTO product_variants (product_id, color_id, size_id, sku_variant, stock) VALUES
(1, 1, 1, 'AT-001-BLK-S', 25), (1, 1, 2, 'AT-001-BLK-M', 30), (1, 1, 3, 'AT-001-BLK-L', 28), (1, 1, 4, 'AT-001-BLK-XL', 15),
(1, 2, 1, 'AT-001-WHT-S', 20), (1, 2, 2, 'AT-001-WHT-M', 35), (1, 2, 3, 'AT-001-WHT-L', 25), (1, 2, 4, 'AT-001-WHT-XL', 18),
(2, 1, 1, 'AP-001-BLK-S', 18), (2, 1, 2, 'AP-001-BLK-M', 25), (2, 1, 3, 'AP-001-BLK-L', 22), (2, 1, 4, 'AP-001-BLK-XL', 10),
(2, 4, 1, 'AP-001-NVY-S', 15), (2, 4, 2, 'AP-001-NVY-M', 28), (2, 4, 3, 'AP-001-NVY-L', 20), (2, 4, 4, 'AP-001-NVY-XL', 12),
(3, 1, 2, 'HD-001-BLK-M', 20), (3, 1, 3, 'HD-001-BLK-L', 25), (3, 1, 4, 'HD-001-BLK-XL', 18), (3, 1, 5, 'HD-001-BLK-XXL', 10),
(3, 3, 2, 'HD-001-GRY-M', 15), (3, 3, 3, 'HD-001-GRY-L', 20), (3, 3, 4, 'HD-001-GRY-XL', 12), (3, 3, 5, 'HD-001-GRY-XXL', 8),
(4, 1, 2, 'AK-001-BLK-M', 12), (4, 1, 3, 'AK-001-BLK-L', 15), (4, 1, 4, 'AK-001-BLK-XL', 10),
(4, 4, 2, 'AK-001-NVY-M', 10), (4, 4, 3, 'AK-001-NVY-L', 12), (4, 4, 4, 'AK-001-NVY-XL', 8),
(5, 2, 1, 'SM-001-WHT-S', 15), (5, 2, 2, 'SM-001-WHT-M', 25), (5, 2, 3, 'SM-001-WHT-L', 20), (5, 2, 4, 'SM-001-WHT-XL', 12),
(5, 6, 1, 'SM-001-BLU-S', 12), (5, 6, 2, 'SM-001-BLU-M', 20), (5, 6, 3, 'SM-001-BLU-L', 18), (5, 6, 4, 'SM-001-BLU-XL', 10);


-- Products 6-10 with detailed variants
INSERT INTO product_variants (product_id, color_id, size_id, sku_variant, stock) VALUES
(6, 6, 1, 'QJ-001-BLU-29', 15), (6, 6, 2, 'QJ-001-BLU-30', 25), (6, 6, 3, 'QJ-001-BLU-31', 28), (6, 6, 4, 'QJ-001-BLU-32', 30),
(7, 8, 1, 'QK-001-BEI-S', 12), (7, 8, 2, 'QK-001-BEI-M', 20), (7, 8, 3, 'QK-001-BEI-L', 18), (7, 8, 4, 'QK-001-BEI-XL', 10),
(7, 4, 1, 'QK-001-NVY-S', 10), (7, 4, 2, 'QK-001-NVY-M', 18), (7, 4, 3, 'QK-001-NVY-L', 15), (7, 4, 4, 'QK-001-NVY-XL', 8),
(8, 1, 1, 'QS-001-BLK-S', 15), (8, 1, 2, 'QS-001-BLK-M', 22), (8, 1, 3, 'QS-001-BLK-L', 18), (8, 1, 4, 'QS-001-BLK-XL', 10),
(9, 1, 1, 'QJ-002-BLK-S', 20), (9, 1, 2, 'QJ-002-BLK-M', 30), (9, 1, 3, 'QJ-002-BLK-L', 25), (9, 1, 4, 'QJ-002-BLK-XL', 15),
(9, 3, 1, 'QJ-002-GRY-S', 15), (9, 3, 2, 'QJ-002-GRY-M', 25), (9, 3, 3, 'QJ-002-GRY-L', 20), (9, 3, 4, 'QJ-002-GRY-XL', 12),
(10, 2, 7, 'GS-001-WHT-39', 8), (10, 2, 8, 'GS-001-WHT-40', 12), (10, 2, 9, 'GS-001-WHT-41', 15), (10, 2, 10, 'GS-001-WHT-42', 12);

-- Products 11-30 with simplified variants
INSERT INTO product_variants (product_id, color_id, size_id, sku_variant, stock) VALUES
(11, 1, 9, 'GR-001-BLK-41', 12), (11, 1, 10, 'GR-001-BLK-42', 15),
(12, 1, 9, 'DS-001-BLK-41', 30), (12, 1, 10, 'DS-001-BLK-42', 35),
(13, 1, NULL, 'TT-001-BLK', 30), (13, 8, NULL, 'TT-001-BEI', 25),
(14, 1, NULL, 'NC-001-BLK', 50), (14, 2, NULL, 'NC-001-WHT', 40),
(15, 1, NULL, 'TC-001-BLK', 80), (15, 2, NULL, 'TC-001-WHT', 75),
(16, 1, 2, 'AT-002-BLK-M', 25), (16, 1, 3, 'AT-002-BLK-L', 30),
(17, 1, 2, 'AP-002-BLK-M', 18), (17, 1, 3, 'AP-002-BLK-L', 22),
(18, 1, 2, 'HD-002-BLK-M', 15), (18, 1, 3, 'HD-002-BLK-L', 20),
(19, 1, 2, 'AK-002-BLK-M', 10), (19, 1, 3, 'AK-002-BLK-L', 12),
(20, 2, 2, 'SM-002-WHT-M', 15), (20, 2, 3, 'SM-002-WHT-L', 18),
(21, 6, 2, 'QJ-003-BLU-30', 20), (21, 6, 3, 'QJ-003-BLU-31', 25),
(22, 8, 2, 'QK-002-BEI-M', 15), (22, 8, 3, 'QK-002-BEI-L', 18),
(23, 1, 2, 'QS-002-BLK-M', 25), (23, 1, 3, 'QS-002-BLK-L', 30),
(24, 1, 2, 'QJ-004-BLK-M', 18), (24, 1, 3, 'QJ-004-BLK-L', 22),
(25, 2, 9, 'GS-002-WHT-41', 10), (25, 2, 10, 'GS-002-WHT-42', 12),
(26, 1, 9, 'GR-002-BLK-41', 12), (26, 1, 10, 'GR-002-BLK-42', 15),
(27, 1, 9, 'DS-002-BLK-41', 15), (27, 1, 10, 'DS-002-BLK-42', 18),
(28, 1, NULL, 'BL-001-BLK', 25), (28, 4, NULL, 'BL-001-NVY', 20),
(29, 1, NULL, 'NC-002-BLK', 35), (29, 8, NULL, 'NC-002-BEI', 30),
(30, 1, NULL, 'TC-002-BLK', 60), (30, 2, NULL, 'TC-002-WHT', 55);

-- ============================================================================
-- NEW PRODUCTS (31-40): 5 Balos + 5 Shoes
-- ============================================================================

-- 5 New Backpacks (Balo)
INSERT INTO products (id, sku, name, slug, category_id, brand_id, base_price, sale_price, description, short_description, material, is_featured, is_new, sold_count) VALUES
(31, 'BL-002', 'Balo Laptop Pro 17 inch', 'balo-laptop-pro-17', 17, 3, 1290000, NULL, 'Balo cao cấp chuyên dụng cho laptop 17 inch với ngăn chống sốc, lưng êm công thái học. Chất liệu ballistic nylon siêu bền.', 'Balo laptop 17" chống sốc cao cấp', 'Ballistic Nylon, YKK Zippers', TRUE, TRUE, 78),
(32, 'BL-003', 'Balo Du Lịch Foldable', 'balo-du-lich-foldable', 17, 1, 790000, 632000, 'Balo du lịch có thể gấp gọn, dung tích 25L khi mở rộng. Chất liệu ripstop siêu nhẹ, chống nước cấp độ 3.', 'Balo gấp gọn chống nước 25L', 'Ripstop Nylon, Water-resistant', FALSE, TRUE, 156),
(33, 'BL-004', 'Balo Gym Sports', 'balo-gym-sports', 17, 2, 590000, NULL, 'Balo thể thao với ngăn đựng giày riêng biệt, túi đựng bình nước 2 bên. Chất liệu mesh thoáng khí.', 'Balo gym có ngăn giày riêng', 'Polyester Mesh, Nylon', TRUE, FALSE, 234),
(34, 'BL-005', 'Balo Mini Fashion', 'balo-mini-fashion', 17, 4, 420000, 336000, 'Balo mini thời trang với thiết kế streetwear. Kích thước nhỏ gọn, phù hợp đi chơi, mua sắm.', 'Balo mini phong cách streetwear', 'Vegan Leather, Canvas', FALSE, TRUE, 189),
(35, 'BL-006', 'Balo Tech Daypack', 'balo-tech-daypack', 17, 3, 980000, NULL, 'Balo công nghệ với cổng sạc USB tích hợp, túi RFID chống trộm. Thiết kế tối giản, hiện đại.', 'Balo công nghệ có cổng USB', 'Anti-theft Polyester, USB Port', TRUE, TRUE, 145);

-- 5 New Shoes (Giày)
INSERT INTO products (id, sku, name, slug, category_id, brand_id, base_price, sale_price, description, short_description, material, is_featured, is_new, sold_count) VALUES
(36, 'GS-003', 'Giày Sneaker Court Classic', 'sneaker-court-classic', 14, 1, 1590000, NULL, 'Giày sneaker cổ điển lấy cảm hứng từ sân tennis. Upper da cao cấp, đế cao su bền bỉ với pattern herringbone.', 'Sneaker tennis classic da cao cấp', 'Full Grain Leather, Rubber Outsole', TRUE, TRUE, 234),
(37, 'GS-004', 'Giày Sneaker Canvas Low', 'sneaker-canvas-low', 14, 1, 890000, 712000, 'Giày sneaker canvas cổ thấp với thiết kế minimalist. Đế vulcanized cao su tự nhiên, êm ái và bền.', 'Sneaker canvas minimalist cổ thấp', 'Organic Cotton Canvas, Natural Rubber', FALSE, TRUE, 312),
(38, 'GR-003', 'Giày Chạy Energy Boost', 'running-energy-boost', 15, 2, 2190000, NULL, 'Giày chạy chuyên nghiệp với công nghệ Boost hoàn trả năng lượng tối ưu. Upper Primeknit+ thoáng khí cao cấp.', 'Giày chạy Boost chuyên nghiệp', 'Primeknit+, Boost Midsole', TRUE, TRUE, 167),
(39, 'GR-004', 'Giày Chạy Pegasus Lite', 'running-pegasus-lite', 15, 2, 1790000, 1432000, 'Giày chạy nhẹ với đệm ZoomX siêu êm. Upper engineered mesh thế hệ mới, thoáng khí tuyệt đối.', 'Giày chạy ZoomX siêu nhẹ', 'Engineered Mesh, ZoomX Foam', TRUE, FALSE, 198),
(40, 'GS-005', 'Giày Sneaker Retro 80s', 'sneaker-retro-80s', 14, 4, 1390000, NULL, 'Giày sneaker phong cách retro 80s với thiết kế color blocking độc đáo. Đế chunky trend hiện đại.', 'Sneaker retro 80s chunky sole', 'Suede, Mesh, Chunky EVA Sole', TRUE, TRUE, 145);

-- Images for new products (31-40)
INSERT INTO product_images (product_id, image_url, is_primary, is_hover, sort_order) VALUES
-- Product 31: Balo Laptop Pro
(31, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', TRUE, FALSE, 1),
(31, 'https://images.unsplash.com/photo-1581605405669-fcdf81165afa?w=800&q=80', FALSE, TRUE, 2),
(31, 'https://images.unsplash.com/photo-1622260614153-03223fb72052?w=800&q=80', FALSE, FALSE, 3),
(31, 'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=800&q=80', FALSE, FALSE, 4),
-- Product 32: Balo Du Lịch Foldable
(32, 'https://images.unsplash.com/photo-1622560480654-d96214fdc887?w=800&q=80', TRUE, FALSE, 1),
(32, 'https://images.unsplash.com/photo-1585916420730-d7f95e942d43?w=800&q=80', FALSE, TRUE, 2),
(32, 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=800&q=80', FALSE, FALSE, 3),
(32, 'https://images.unsplash.com/photo-1576677878584-47d69c5b8c46?w=800&q=80', FALSE, FALSE, 4),
-- Product 33: Balo Gym Sports
(33, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', TRUE, FALSE, 1),
(33, 'https://images.unsplash.com/photo-1599280321681-21e47f1a59a8?w=800&q=80', FALSE, TRUE, 2),
(33, 'https://images.unsplash.com/photo-1571689936114-b16146c9570a?w=800&q=80', FALSE, FALSE, 3),
(33, 'https://images.unsplash.com/photo-1475178626620-a4d074967452?w=800&q=80', FALSE, FALSE, 4),
-- Product 34: Balo Mini Fashion
(34, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80', TRUE, FALSE, 1),
(34, 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=800&q=80', FALSE, TRUE, 2),
(34, 'https://images.unsplash.com/photo-1575844264771-892081089af5?w=800&q=80', FALSE, FALSE, 3),
(34, 'https://images.unsplash.com/photo-1606522754091-a3bbf9ad4cb3?w=800&q=80', FALSE, FALSE, 4),
-- Product 35: Balo Tech Daypack
(35, 'https://images.unsplash.com/photo-1577733966973-d680bffd2e80?w=800&q=80', TRUE, FALSE, 1),
(35, 'https://images.unsplash.com/photo-1491637639811-60e2756cc1c7?w=800&q=80', FALSE, TRUE, 2),
(35, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', FALSE, FALSE, 3),
(35, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=800&q=80', FALSE, FALSE, 4),
-- Product 36: Sneaker Court Classic
(36, 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80', TRUE, FALSE, 1),
(36, 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800&q=80', FALSE, TRUE, 2),
(36, 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80', FALSE, FALSE, 3),
(36, 'https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=800&q=80', FALSE, FALSE, 4),
-- Product 37: Sneaker Canvas Low
(37, 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&q=80', TRUE, FALSE, 1),
(37, 'https://images.unsplash.com/photo-1463100099107-aa0980c362e6?w=800&q=80', FALSE, TRUE, 2),
(37, 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&q=80', FALSE, FALSE, 3),
(37, 'https://images.unsplash.com/photo-1465877783223-4eba513e27c6?w=800&q=80', FALSE, FALSE, 4),
-- Product 38: Running Energy Boost
(38, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', TRUE, FALSE, 1),
(38, 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80', FALSE, TRUE, 2),
(38, 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80', FALSE, FALSE, 3),
(38, 'https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=800&q=80', FALSE, FALSE, 4),
-- Product 39: Running Pegasus Lite
(39, 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80', TRUE, FALSE, 1),
(39, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', FALSE, TRUE, 2),
(39, 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&q=80', FALSE, FALSE, 3),
(39, 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=800&q=80', FALSE, FALSE, 4),
-- Product 40: Sneaker Retro 80s
(40, 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=800&q=80', TRUE, FALSE, 1),
(40, 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80', FALSE, TRUE, 2),
(40, 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800&q=80', FALSE, FALSE, 3),
(40, 'https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=800&q=80', FALSE, FALSE, 4);

-- Variants for new products (31-40)
INSERT INTO product_variants (product_id, color_id, size_id, sku_variant, stock) VALUES
-- Balo variants (no size needed, only color)
(31, 1, NULL, 'BL-002-BLK', 30), (31, 4, NULL, 'BL-002-NVY', 25), (31, 3, NULL, 'BL-002-GRY', 20),
(32, 1, NULL, 'BL-003-BLK', 35), (32, 7, NULL, 'BL-003-GRN', 25), (32, 6, NULL, 'BL-003-BLU', 20),
(33, 1, NULL, 'BL-004-BLK', 40), (33, 5, NULL, 'BL-004-RED', 30), (33, 6, NULL, 'BL-004-BLU', 25),
(34, 1, NULL, 'BL-005-BLK', 30), (34, 10, NULL, 'BL-005-PNK', 25), (34, 8, NULL, 'BL-005-BEI', 20),
(35, 1, NULL, 'BL-006-BLK', 35), (35, 3, NULL, 'BL-006-GRY', 30), (35, 4, NULL, 'BL-006-NVY', 25),
-- Shoe variants (need both color and size: 38-44)
(36, 2, 6, 'GS-003-WHT-38', 8), (36, 2, 7, 'GS-003-WHT-39', 12), (36, 2, 8, 'GS-003-WHT-40', 15), (36, 2, 9, 'GS-003-WHT-41', 18), (36, 2, 10, 'GS-003-WHT-42', 15), (36, 2, 11, 'GS-003-WHT-43', 10), (36, 2, 12, 'GS-003-WHT-44', 8),
(36, 1, 6, 'GS-003-BLK-38', 6), (36, 1, 7, 'GS-003-BLK-39', 10), (36, 1, 8, 'GS-003-BLK-40', 12), (36, 1, 9, 'GS-003-BLK-41', 15), (36, 1, 10, 'GS-003-BLK-42', 12), (36, 1, 11, 'GS-003-BLK-43', 8), (36, 1, 12, 'GS-003-BLK-44', 6),
(37, 2, 7, 'GS-004-WHT-39', 15), (37, 2, 8, 'GS-004-WHT-40', 20), (37, 2, 9, 'GS-004-WHT-41', 25), (37, 2, 10, 'GS-004-WHT-42', 20), (37, 2, 11, 'GS-004-WHT-43', 12),
(37, 1, 7, 'GS-004-BLK-39', 12), (37, 1, 8, 'GS-004-BLK-40', 18), (37, 1, 9, 'GS-004-BLK-41', 22), (37, 1, 10, 'GS-004-BLK-42', 18), (37, 1, 11, 'GS-004-BLK-43', 10),
(38, 1, 7, 'GR-003-BLK-39', 10), (38, 1, 8, 'GR-003-BLK-40', 15), (38, 1, 9, 'GR-003-BLK-41', 20), (38, 1, 10, 'GR-003-BLK-42', 18), (38, 1, 11, 'GR-003-BLK-43', 12),
(38, 6, 7, 'GR-003-BLU-39', 8), (38, 6, 8, 'GR-003-BLU-40', 12), (38, 6, 9, 'GR-003-BLU-41', 15), (38, 6, 10, 'GR-003-BLU-42', 12), (38, 6, 11, 'GR-003-BLU-43', 8),
(39, 1, 7, 'GR-004-BLK-39', 12), (39, 1, 8, 'GR-004-BLK-40', 18), (39, 1, 9, 'GR-004-BLK-41', 22), (39, 1, 10, 'GR-004-BLK-42', 20), (39, 1, 11, 'GR-004-BLK-43', 15),
(39, 5, 7, 'GR-004-RED-39', 8), (39, 5, 8, 'GR-004-RED-40', 12), (39, 5, 9, 'GR-004-RED-41', 15), (39, 5, 10, 'GR-004-RED-42', 12), (39, 5, 11, 'GR-004-RED-43', 8),
(40, 2, 7, 'GS-005-WHT-39', 10), (40, 2, 8, 'GS-005-WHT-40', 15), (40, 2, 9, 'GS-005-WHT-41', 18), (40, 2, 10, 'GS-005-WHT-42', 15), (40, 2, 11, 'GS-005-WHT-43', 10),
(40, 5, 7, 'GS-005-RED-39', 8), (40, 5, 8, 'GS-005-RED-40', 12), (40, 5, 9, 'GS-005-RED-41', 15), (40, 5, 10, 'GS-005-RED-42', 12), (40, 5, 11, 'GS-005-RED-43', 8);


-- FOREIGN KEY CHECKS will be enabled at the end (line 1030+)

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

-- ============================================================================
-- 9. FLASH SALE & NIGHT MARKET DEMO DATA
-- ============================================================================

-- Flash Sale Demo (Active starting now)
INSERT INTO flash_sale_configs (name, start_time, end_time, is_active, discount_label)
VALUES (N'Flash Sale Khai Trương', NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR), TRUE, N'GIẢM SỐC GIỜ VÀNG');

SET @fs_id = LAST_INSERT_ID();
-- Sale Áo Thun (ID 1) giá 99k, Giày Sneaker (ID 10) giá 999k, Balo Urban (ID 28) giá 499k
INSERT INTO flash_sale_items (flash_sale_config_id, product_id, variant_id, sale_price) VALUES 
(@fs_id, 1, 1, 99000), 
(@fs_id, 10, 26, 999000), 
(@fs_id, 28, 47, 499000);

-- Night Market Configuration (Base settings)
INSERT INTO night_market_configs (min_offers, max_offers, min_discount_percent, max_discount_percent, offer_duration_days, is_active)
VALUES (3, 6, 20, 80, 7, TRUE);

-- ============================================================================
-- FINALIZATION
-- ============================================================================
SET FOREIGN_KEY_CHECKS = 1;
SELECT 'Database initialization completed successfully.' AS status;