<?php
declare(strict_types=1);

// Set global timezone
date_default_timezone_set('UTC');

// Password requirements (matches backend/src/modules/auth/controller.ts line 20)
define('STRONG_PASSWORD_REGEX', '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,100}$/');

// Order status transitions (matches backend/src/modules/orders/controller.ts lines 14-21)
define('ORDER_STATUS_TRANSITIONS', [
    'pending'    => ['confirmed', 'cancelled'],
    'confirmed'  => ['processing', 'cancelled'],
    'processing' => ['shipped', 'cancelled'],
    'shipped'    => ['delivered'],
    'delivered'  => [],
    'cancelled'  => [],
]);

// Valid payment methods (matches backend/src/models/Order.ts)
define('PAYMENT_METHODS', ['card', 'upi', 'cod', 'whatsapp']);

// Valid product types (matches backend/src/models/Product.ts)
define('PRODUCT_TYPES', ['Black Tea', 'Green Tea', 'White Tea', 'Oolong', 'Herbal', 'Herbal Infusion', 'Masala Chai', 'Matcha']);

// Valid mood types
define('PRODUCT_MOODS', ['energize', 'relax', 'focus', 'detox', 'glow', 'immunity']);

// Valid caffeine levels
define('CAFFEINE_LEVELS', ['none', 'low', 'medium', 'high']);

// Shipping threshold
define('FREE_SHIPPING_THRESHOLD', 999);
define('FLAT_SHIPPING_RATE', 79);

// Tax rate (5% GST)
define('TAX_RATE', 0.05);

// Upload limits (matches backend/src/modules/upload/routes.ts)
define('MAX_UPLOAD_SIZE_BYTES', 5 * 1024 * 1024); // 5 MB
define('MAX_UPLOAD_FILES', 10);
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

// Review limits
define('MAX_REVIEW_TITLE_LENGTH', 100);
define('MAX_REVIEW_BODY_LENGTH', 1000);
