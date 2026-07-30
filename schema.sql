-- Feelinga Tea — MySQL Schema
-- Auto-generated from MongoDB models in backend/src/models/
-- Reference: C:\Engineering\Tea Project\backend\src\models\

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table: users
-- Source: backend/src/models/User.ts
-- ----------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id`                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name`                    VARCHAR(80) NOT NULL,
    `email`                   VARCHAR(255) NOT NULL,
    `password`                VARCHAR(255) NOT NULL,
    `role`                    ENUM('customer','admin') NOT NULL DEFAULT 'customer',
    `phone`                   VARCHAR(20) DEFAULT NULL,
    `refresh_token`           VARCHAR(512) DEFAULT NULL,
    `password_reset_token`    VARCHAR(255) DEFAULT NULL,
    `password_reset_expires`  DATETIME DEFAULT NULL,
    `email_verified`          TINYINT(1) NOT NULL DEFAULT 0,
    `email_verify_token`      VARCHAR(255) DEFAULT NULL,
    `email_verify_expires`    DATETIME DEFAULT NULL,
    `google_id`               VARCHAR(255) DEFAULT NULL,
    `login_attempts`          TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `lock_until`              DATETIME DEFAULT NULL,
    `created_at`              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_email` (`email`),
    INDEX `idx_google` (`google_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: addresses
-- Source: User.addresses subdocument
-- ----------------------------
CREATE TABLE IF NOT EXISTS `addresses` (
    `id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id`         INT UNSIGNED NOT NULL,
    `label`           ENUM('Home','Work','Other') NOT NULL DEFAULT 'Home',
    `full_name`       VARCHAR(160) NOT NULL,
    `phone`           VARCHAR(20) NOT NULL,
    `address_line1`   VARCHAR(255) NOT NULL,
    `address_line2`   VARCHAR(255) DEFAULT NULL,
    `city`            VARCHAR(100) NOT NULL,
    `state`           VARCHAR(100) NOT NULL,
    `pincode`         VARCHAR(10) NOT NULL,
    `is_default`      TINYINT(1) NOT NULL DEFAULT 0,
    `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: products
-- Source: backend/src/models/Product.ts
-- ----------------------------
CREATE TABLE IF NOT EXISTS `products` (
    `id`                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `slug`                VARCHAR(150) NOT NULL,
    `name`                VARCHAR(100) NOT NULL,
    `type`                ENUM('Black Tea','Green Tea','White Tea','Oolong','Herbal','Herbal Infusion','Masala Chai','Matcha') NOT NULL,
    `description`         TEXT NOT NULL,
    `short_description`   VARCHAR(200) DEFAULT NULL,
    `price_50g`           DECIMAL(10,2) DEFAULT NULL,
    `price_100g`          DECIMAL(10,2) NOT NULL,
    `price_200g`          DECIMAL(10,2) DEFAULT NULL,
    `moods`               JSON DEFAULT NULL,
    `origin`              VARCHAR(255) NOT NULL,
    `caffeine`            ENUM('none','low','medium','high') NOT NULL DEFAULT 'medium',
    `tasting_notes`       JSON DEFAULT NULL,
    `brewing_temperature` VARCHAR(50) DEFAULT NULL,
    `brewing_steep_time`  VARCHAR(50) DEFAULT NULL,
    `brewing_amount`      VARCHAR(50) DEFAULT NULL,
    `brewing_steps`       JSON DEFAULT NULL,
    `images`              JSON DEFAULT NULL,
    `rating`              DECIMAL(2,1) NOT NULL DEFAULT 0.0,
    `review_count`        INT UNSIGNED NOT NULL DEFAULT 0,
    `in_stock`            TINYINT(1) NOT NULL DEFAULT 1,
    `stock`               INT UNSIGNED NOT NULL DEFAULT 100,
    `is_best_seller`      TINYINT(1) NOT NULL DEFAULT 0,
    `is_new_arrival`      TINYINT(1) NOT NULL DEFAULT 1,
    `tags`                JSON DEFAULT NULL,
    `deleted_at`          DATETIME DEFAULT NULL,
    `created_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_slug` (`slug`),
    INDEX `idx_type` (`type`),
    INDEX `idx_price` (`price_100g`),
    INDEX `idx_deleted` (`deleted_at`),
    INDEX `idx_bestseller` (`is_best_seller`),
    INDEX `idx_newarrival` (`is_new_arrival`),
    FULLTEXT KEY `ft_search` (`name`, `description`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: orders
-- Source: backend/src/models/Order.ts
-- ----------------------------
CREATE TABLE IF NOT EXISTS `orders` (
    `id`                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id`               INT UNSIGNED NOT NULL,
    `order_number`          VARCHAR(20) NOT NULL,
    `subtotal`              DECIMAL(10,2) NOT NULL,
    `shipping`              DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `tax`                   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `discount`              DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `coupon_code`           VARCHAR(50) DEFAULT NULL,
    `total`                 DECIMAL(10,2) NOT NULL,
    `status`                ENUM('pending','confirmed','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
    `payment_method`        ENUM('card','upi','cod','whatsapp') NOT NULL,
    `payment_status`        ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
    `razorpay_order_id`     VARCHAR(255) DEFAULT NULL,
    `razorpay_payment_id`   VARCHAR(255) DEFAULT NULL,
    `tracking_number`       VARCHAR(100) DEFAULT NULL,
    `tracking_url`          VARCHAR(500) DEFAULT NULL,
    `cancelled_at`          DATETIME DEFAULT NULL,
    `cancel_reason`         TEXT DEFAULT NULL,
    `notes`                 TEXT DEFAULT NULL,
    `ship_first_name`       VARCHAR(80) NOT NULL,
    `ship_last_name`        VARCHAR(80) NOT NULL,
    `ship_line1`            VARCHAR(255) NOT NULL,
    `ship_line2`            VARCHAR(255) DEFAULT NULL,
    `ship_city`             VARCHAR(100) NOT NULL,
    `ship_state`            VARCHAR(100) NOT NULL,
    `ship_pincode`          VARCHAR(10) NOT NULL,
    `ship_phone`            VARCHAR(20) NOT NULL,
    `created_at`            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_order_number` (`order_number`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
    INDEX `idx_user_date` (`user_id`, `created_at`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: order_items
-- Source: Order.items subdocument
-- ----------------------------
CREATE TABLE IF NOT EXISTS `order_items` (
    `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `order_id`      INT UNSIGNED NOT NULL,
    `product_id`    INT UNSIGNED NOT NULL,
    `name`          VARCHAR(100) NOT NULL,
    `size`          VARCHAR(10) NOT NULL DEFAULT '100g',
    `price`         DECIMAL(10,2) NOT NULL,
    `qty`           INT UNSIGNED NOT NULL,
    `image`         VARCHAR(500) DEFAULT NULL,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`),
    INDEX `idx_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: carts
-- Source: backend/src/models/Cart.ts
-- ----------------------------
CREATE TABLE IF NOT EXISTS `carts` (
    `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id`     INT UNSIGNED NOT NULL,
    `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_user` (`user_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: cart_items
-- Source: Cart.items subdocument
-- ----------------------------
CREATE TABLE IF NOT EXISTS `cart_items` (
    `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `cart_id`     INT UNSIGNED NOT NULL,
    `product_id`  INT UNSIGNED NOT NULL,
    `size`        VARCHAR(10) NOT NULL DEFAULT '100g',
    `qty`         INT UNSIGNED NOT NULL DEFAULT 1,
    FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`),
    INDEX `idx_cart` (`cart_id`),
    UNIQUE KEY `uq_cart_product_size` (`cart_id`, `product_id`, `size`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: reviews
-- Source: backend/src/models/Review.ts
-- ----------------------------
CREATE TABLE IF NOT EXISTS `reviews` (
    `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id`     INT UNSIGNED NOT NULL,
    `product_id`  INT UNSIGNED NOT NULL,
    `rating`      TINYINT UNSIGNED NOT NULL,
    `title`       VARCHAR(100) DEFAULT NULL,
    `body`        TEXT DEFAULT NULL,
    `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `uq_user_product` (`user_id`, `product_id`),
    INDEX `idx_product_date` (`product_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: coupons
-- Source: backend/src/models/Coupon.ts
-- ----------------------------
CREATE TABLE IF NOT EXISTS `coupons` (
    `id`                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name`                VARCHAR(100) NOT NULL DEFAULT '',
    `code`                VARCHAR(50) NOT NULL,
    `campaign_type`       ENUM('regular','seasonal','festival') NOT NULL DEFAULT 'regular',
    `campaign_label`      VARCHAR(255) NOT NULL DEFAULT '',
    `banner_text`         VARCHAR(500) NOT NULL DEFAULT '',
    `featured_on_store`   TINYINT(1) NOT NULL DEFAULT 0,
    `priority`            INT NOT NULL DEFAULT 0,
    `description`         TEXT DEFAULT NULL,
    `discount_type`       ENUM('percentage','flat') NOT NULL,
    `discount_value`      DECIMAL(10,2) NOT NULL,
    `min_order_amount`    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `max_discount`        DECIMAL(10,2) DEFAULT NULL,
    `usage_limit`         INT UNSIGNED DEFAULT NULL,
    `per_user_limit`      INT UNSIGNED DEFAULT NULL,
    `used_count`          INT UNSIGNED NOT NULL DEFAULT 0,
    `active`              TINYINT(1) NOT NULL DEFAULT 1,
    `valid_from`          DATETIME NOT NULL,
    `valid_to`            DATETIME NOT NULL,
    `created_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_code` (`code`),
    INDEX `idx_valid` (`valid_to`),
    INDEX `idx_featured` (`featured_on_store`, `active`, `valid_from`, `valid_to`, `priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: wishlist
-- Source: User.wishlist array
-- ----------------------------
CREATE TABLE IF NOT EXISTS `wishlist` (
    `user_id`     INT UNSIGNED NOT NULL,
    `product_id`  INT UNSIGNED NOT NULL,
    `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`user_id`, `product_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: testimonials
-- Source: backend/src/models/Testimonial.ts
-- ----------------------------
CREATE TABLE IF NOT EXISTS `testimonials` (
    `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `author`      VARCHAR(100) NOT NULL,
    `role`        VARCHAR(150) NOT NULL DEFAULT 'Customer',
    `text`        TEXT NOT NULL,
    `rating`      TINYINT UNSIGNED NOT NULL DEFAULT 5,
    `approved`    TINYINT(1) NOT NULL DEFAULT 0,
    `featured`    TINYINT(1) NOT NULL DEFAULT 0,
    `sort_order`  INT NOT NULL DEFAULT 0,
    `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_approved` (`approved`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: audit_log
-- Source: backend/src/models/AuditLog.ts
-- ----------------------------
CREATE TABLE IF NOT EXISTS `audit_log` (
    `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `actor_id`    INT UNSIGNED NOT NULL,
    `actor_name`  VARCHAR(80) NOT NULL,
    `actor_role`  VARCHAR(20) NOT NULL DEFAULT 'admin',
    `action`      VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(50) NOT NULL,
    `entity_id`   VARCHAR(50) DEFAULT NULL,
    `summary`     TEXT NOT NULL,
    `meta`        JSON DEFAULT NULL,
    `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`),
    INDEX `idx_created` (`created_at`),
    INDEX `idx_actor` (`actor_id`, `created_at`),
    INDEX `idx_action` (`action`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: contact_messages
-- Source: backend/src/models/ContactMessage.ts
-- ----------------------------
CREATE TABLE IF NOT EXISTS `contact_messages` (
    `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name`        VARCHAR(100) NOT NULL,
    `email`       VARCHAR(255) NOT NULL,
    `subject`     VARCHAR(200) NOT NULL DEFAULT 'General Inquiry',
    `message`     TEXT NOT NULL,
    `status`      ENUM('new','read','replied') NOT NULL DEFAULT 'new',
    `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: newsletter_subscribers
-- Source: backend/src/models/NewsletterSubscriber.ts
-- ----------------------------
CREATE TABLE IF NOT EXISTS `newsletter_subscribers` (
    `id`                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `email`               VARCHAR(255) NOT NULL,
    `subscribed_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `active`              TINYINT(1) NOT NULL DEFAULT 1,
    `unsubscribe_token`   VARCHAR(64) DEFAULT NULL,
    `created_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_email` (`email`),
    UNIQUE KEY `uq_unsub_token` (`unsubscribe_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: counters
-- Source: backend/src/models/Counter.ts
-- ----------------------------
CREATE TABLE IF NOT EXISTS `counters` (
    `name`  VARCHAR(50) PRIMARY KEY,
    `seq`   INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `counters` (`name`, `seq`) VALUES ('orderNumber', 0)
ON DUPLICATE KEY UPDATE `name` = `name`;

SET FOREIGN_KEY_CHECKS = 1;
