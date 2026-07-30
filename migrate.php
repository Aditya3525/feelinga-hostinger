<?php
declare(strict_types=1);

/**
 * Data Migration: MongoDB JSON → MySQL
 * 
 * Usage:
 *   1. Export MongoDB collections to JSON (see instructions below)
 *   2. Place JSON files in ./migration_data/ directory
 *   3. Run: php migrate.php
 * 
 * MongoDB export commands:
 *   mongoexport --uri="$MONGODB_URI" --collection=users --out=migration_data/users.json
 *   mongoexport --uri="$MONGODB_URI" --collection=products --out=migration_data/products.json
 *   mongoexport --uri="$MONGODB_URI" --collection=orders --out=migration_data/orders.json
 *   mongoexport --uri="$MONGODB_URI" --collection=reviews --out=migration_data/reviews.json
 *   mongoexport --uri="$MONGODB_URI" --collection=coupons --out=migration_data/coupons.json
 *   mongoexport --uri="$MONGODB_URI" --collection=testimonials --out=migration_data/testimonials.json
 *   mongoexport --uri="$MONGODB_URI" --collection=contactmessages --out=migration_data/contacts.json
 *   mongoexport --uri="$MONGODB_URI" --collection=newslettersubscribers --out=migration_data/newsletter.json
 *   mongoexport --uri="$MONGODB_URI" --collection=counters --out=migration_data/counters.json
 */

$envPath = __DIR__ . '/.env';
require_once __DIR__ . '/public_html/api/v1/config/env.php';
load_env($envPath);
require_once __DIR__ . '/public_html/api/v1/config/database.php';
require_once __DIR__ . '/public_html/api/v1/utils/sanitize.php';

$dataDir = __DIR__ . '/migration_data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755);
    echo "Created migration_data/ directory.\n";
    echo "Please place your MongoDB JSON exports there and run again.\n";
    exit(0);
}

$db = get_db();

// ID mapping: mongoObjectId => mysqlId
$userIdMap = [];
$productIdMap = [];

/**
 * Parse MongoDB extended JSON (ObjectId, ISODate, etc.)
 */
function parse_mongo_value($value) {
    if (is_array($value)) {
        // Check for ObjectId
        if (isset($value['$oid'])) return $value['$oid'];
        // Check for ISODate
        if (isset($value['$date'])) {
            $dateStr = $value['$date'];
            if (preg_match('/^\d{4}-\d{2}-\d{2}T/', $dateStr)) {
                return date('Y-m-d H:i:s', strtotime($dateStr));
            }
            // Millisecond timestamp
            if (is_numeric($dateStr)) {
                return date('Y-m-d H:i:s', (int)($dateStr / 1000));
            }
            return $dateStr;
        }
        // Check for NumberLong/NumberInt
        if (isset($value['$numberLong'])) return (int)$value['$numberLong'];
        if (isset($value['$numberInt'])) return (int)$value['$numberInt'];
        // Check for Decimal128
        if (isset($value['$numberDecimal'])) return (float)$value['$numberDecimal'];

        // Recurse
        $out = [];
        foreach ($value as $k => $v) {
            $out[$k] = parse_mongo_value($v);
        }
        return $out;
    }
    return $value;
}

function load_json_file(string $path): array {
    if (!file_exists($path)) {
        echo "  ⚠ File not found: {$path}\n";
        return [];
    }
    $raw = file_get_contents($path);
    $data = json_decode($raw, true);
    if ($data === null) {
        echo "  ⚠ Failed to parse JSON: {$path}\n";
        return [];
    }
    // Some mongoexport wraps in {type: "type", data: [...]}
    if (isset($data['data']) && is_array($data['data'])) {
        $data = $data['data'];
    }
    // Recursively parse MongoDB extended types
    foreach ($data as &$item) {
        $item = parse_mongo_value($item);
    }
    return $data;
}

echo "=== Feelinga MongoDB → MySQL Migration ===\n\n";

// ===== USERS =====
echo "→ Migrating users...\n";
$users = load_json_file("{$dataDir}/users.json");
$count = 0;
foreach ($users as $mongoUser) {
    $mongoId = $mongoUser['_id'] ?? ($mongoUser['id'] ?? null);
    $name = $mongoUser['name'] ?? '';
    $email = strtolower(trim($mongoUser['email'] ?? ''));
    $password = $mongoUser['password'] ?? password_hash('changeme123', PASSWORD_BCRYPT);
    $role = $mongoUser['role'] ?? 'customer';
    $phone = $mongoUser['phone'] ?? null;
    $googleId = $mongoUser['googleId'] ?? null;
    $emailVerified = !empty($mongoUser['emailVerified']) ? 1 : 0;
    $createdAt = $mongoUser['createdAt'] ?? date('Y-m-d H:i:s');

    // Handle password if not bcrypt (pre-hashed)
    if ($password && !str_starts_with($password, '$2y$') && !str_starts_with($password, '$2a$')) {
        $password = password_hash('changeme123', PASSWORD_BCRYPT);
        echo "  ⚠ User {$email}: non-bcrypt password, set to 'changeme123'\n";
    }

    $stmt = $db->prepare('INSERT IGNORE INTO users (name, email, password, role, phone, google_id, email_verified, created_at) VALUES (?,?,?,?,?,?,?,?)');
    $stmt->execute([$name, $email, $password, $role, $phone, $googleId, $emailVerified, $createdAt]);
    $mysqlId = (int) $db->lastInsertId();

    if ($mongoId) {
        $userIdMap[(string)$mongoId] = $mysqlId;
    }

    // Migrate addresses
    $addresses = $mongoUser['addresses'] ?? [];
    foreach ($addresses as $addr) {
        $stmt = $db->prepare('INSERT INTO addresses (user_id, label, full_name, phone, address_line1, address_line2, city, state, pincode, is_default) VALUES (?,?,?,?,?,?,?,?,?,?)');
        $stmt->execute([
            $mysqlId,
            $addr['label'] ?? 'Home',
            $addr['fullName'] ?? $addr['full_name'] ?? '',
            $addr['phone'] ?? '',
            $addr['addressLine1'] ?? $addr['address_line1'] ?? '',
            $addr['addressLine2'] ?? $addr['address_line2'] ?? null,
            $addr['city'] ?? '',
            $addr['state'] ?? '',
            $addr['pincode'] ?? '',
            !empty($addr['isDefault']) || !empty($addr['is_default']) ? 1 : 0,
        ]);
    }

    // Migrate wishlist
    $wishlist = $mongoUser['wishlist'] ?? [];
    foreach ($wishlist as $wishProductId) {
        // Will be resolved after products are migrated
        // Store in a temp table or process later
    }

    $count++;
}
echo "  ✓ {$count} users migrated\n\n";

// ===== PRODUCTS =====
echo "→ Migrating products...\n";
$products = load_json_file("{$dataDir}/products.json");
$count = 0;
foreach ($products as $mongoProduct) {
    $mongoId = $mongoProduct['_id'] ?? ($mongoProduct['id'] ?? null);
    $slug = $mongoProduct['slug'] ?? '';
    $name = $mongoProduct['name'] ?? '';
    $type = $mongoProduct['type'] ?? 'Black Tea';
    $description = $mongoProduct['description'] ?? '';
    $shortDesc = $mongoProduct['shortDescription'] ?? $mongoProduct['short_description'] ?? null;

    // Prices
    $prices = $mongoProduct['prices'] ?? [];
    $p50 = $prices['50g'] ?? null;
    $p100 = $prices['100g'] ?? 0;
    $p200 = $prices['200g'] ?? null;

    // Moods
    $moods = $mongoProduct['moods'] ?? [];
    $moodsJson = json_encode($moods);

    // Caffeine
    $caffeine = $mongoProduct['caffeine'] ?? 'medium';

    // Tasting notes
    $tastingNotes = $mongoProduct['tastingNotes'] ?? $mongoProduct['tasting_notes'] ?? [];
    $tastingNotesJson = json_encode($tastingNotes);

    // Brewing
    $brewing = $mongoProduct['brewingInstructions'] ?? $mongoProduct['brewing_instructions'] ?? [];
    $brewTemp = $brewing['temperature'] ?? null;
    $brewSteep = $brewing['steepTime'] ?? $brewing['steep_time'] ?? null;
    $brewAmount = $brewing['amount'] ?? null;
    $brewSteps = $brewing['steps'] ?? [];
    $brewStepsJson = json_encode($brewSteps);

    // Images
    $images = $mongoProduct['images'] ?? [];
    $imagesJson = json_encode($images);

    // Rating
    $rating = (float)($mongoProduct['rating'] ?? 0);
    $reviewCount = (int)($mongoProduct['reviewCount'] ?? $mongoProduct['review_count'] ?? 0);
    $inStock = !empty($mongoProduct['inStock'] ?? $mongoProduct['in_stock'] ?? true) ? 1 : 0;
    $stock = (int)($mongoProduct['stock'] ?? 100);
    $isBestSeller = !empty($mongoProduct['isBestSeller'] ?? $mongoProduct['is_best_seller'] ?? false) ? 1 : 0;
    $isNewArrival = !empty($mongoProduct['isNewArrival'] ?? $mongoProduct['is_new_arrival'] ?? true) ? 1 : 0;
    $tags = $mongoProduct['tags'] ?? [];
    $tagsJson = json_encode($tags);
    $deletedAt = !empty($mongoProduct['deletedAt'] ?? $mongoProduct['deleted_at']) ? ($mongoProduct['deletedAt'] ?? $mongoProduct['deleted_at']) : null;

    $stmt = $db->prepare('INSERT IGNORE INTO products (slug, name, type, description, short_description, price_50g, price_100g, price_200g, moods, origin, caffeine, tasting_notes, brewing_temperature, brewing_steep_time, brewing_amount, brewing_steps, images, rating, review_count, in_stock, stock, is_best_seller, is_new_arrival, tags, deleted_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $stmt->execute([
        $slug, $name, $type, $description, $shortDesc,
        $p50, $p100, $p200, $moodsJson,
        $mongoProduct['origin'] ?? '', $caffeine, $tastingNotesJson,
        $brewTemp, $brewSteep, $brewAmount, $brewStepsJson,
        $imagesJson, $rating, $reviewCount, $inStock, $stock,
        $isBestSeller, $isNewArrival, $tagsJson, $deletedAt,
        $mongoProduct['createdAt'] ?? date('Y-m-d H:i:s'),
    ]);
    $mysqlId = (int) $db->lastInsertId();

    if ($mongoId) {
        $productIdMap[(string)$mongoId] = $mysqlId;
    }

    $count++;
}
echo "  ✓ {$count} products migrated\n\n";

// ===== Migrate wishlist (needs product ID mapping) =====
echo "→ Migrating wishlist references...\n";
$count = 0;
foreach ($users as $mongoUser) {
    $mongoUserId = $mongoUser['_id'] ?? ($mongoUser['id'] ?? null);
    $mysqlUserId = $userIdMap[(string)$mongoUserId] ?? null;
    if (!$mysqlUserId) continue;

    $wishlist = $mongoUser['wishlist'] ?? [];
    foreach ($wishlist as $wishProductId) {
        $wishMysqlProductId = $productIdMap[(string)$wishProductId] ?? null;
        if ($wishMysqlProductId) {
            $db->prepare('INSERT IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)')
               ->execute([$mysqlUserId, $wishMysqlProductId]);
            $count++;
        }
    }
}
echo "  ✓ {$count} wishlist items migrated\n\n";

// ===== ORDERS =====
echo "→ Migrating orders...\n";
$orders = load_json_file("{$dataDir}/orders.json");
$count = 0;
foreach ($orders as $mongoOrder) {
    $mongoUserId = $mongoOrder['user'] ?? ($mongoOrder['user_id'] ?? null);
    $mysqlUserId = $userIdMap[(string)$mongoUserId] ?? null;
    if (!$mysqlUserId) { echo "  ⚠ Order skipped: user not found ({$mongoUserId})\n"; continue; }

    $orderNumber = $mongoOrder['orderNumber'] ?? $mongoOrder['order_number'] ?? 'FLG-000000';
    $addr = $mongoOrder['shippingAddress'] ?? $mongoOrder['shipping_address'] ?? [];

    $stmt = $db->prepare('INSERT IGNORE INTO orders (user_id, order_number, subtotal, shipping, tax, discount, coupon_code, total, status, payment_method, payment_status, razorpay_order_id, razorpay_payment_id, tracking_number, tracking_url, cancelled_at, cancel_reason, notes, ship_first_name, ship_last_name, ship_line1, ship_line2, ship_city, ship_state, ship_pincode, ship_phone, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $stmt->execute([
        $mysqlUserId,
        $orderNumber,
        $mongoOrder['subtotal'] ?? 0,
        $mongoOrder['shipping'] ?? 0,
        $mongoOrder['tax'] ?? 0,
        $mongoOrder['discount'] ?? 0,
        $mongoOrder['couponCode'] ?? $mongoOrder['coupon_code'] ?? null,
        $mongoOrder['total'] ?? 0,
        $mongoOrder['status'] ?? 'pending',
        $mongoOrder['paymentMethod'] ?? $mongoOrder['payment_method'] ?? 'cod',
        $mongoOrder['paymentStatus'] ?? $mongoOrder['payment_status'] ?? 'pending',
        $mongoOrder['razorpayOrderId'] ?? $mongoOrder['razorpay_order_id'] ?? null,
        $mongoOrder['razorpayPaymentId'] ?? $mongoOrder['razorpay_payment_id'] ?? null,
        $mongoOrder['trackingNumber'] ?? $mongoOrder['tracking_number'] ?? null,
        $mongoOrder['trackingUrl'] ?? $mongoOrder['tracking_url'] ?? null,
        $mongoOrder['cancelledAt'] ?? $mongoOrder['cancelled_at'] ?? null,
        $mongoOrder['cancelReason'] ?? $mongoOrder['cancel_reason'] ?? null,
        $mongoOrder['notes'] ?? null,
        $addr['firstName'] ?? $addr['first_name'] ?? '',
        $addr['lastName'] ?? $addr['last_name'] ?? '',
        $addr['line1'] ?? '',
        $addr['line2'] ?? null,
        $addr['city'] ?? '',
        $addr['state'] ?? '',
        $addr['pincode'] ?? '',
        $addr['phone'] ?? '',
        $mongoOrder['createdAt'] ?? date('Y-m-d H:i:s'),
    ]);
    $orderId = (int) $db->lastInsertId();

    // Migrate order items
    $items = $mongoOrder['items'] ?? [];
    foreach ($items as $item) {
        $mongoProductId = $item['product'] ?? ($item['product_id'] ?? null);
        $mysqlProductId = $productIdMap[(string)$mongoProductId] ?? 0;
        if (!$mysqlProductId && $mongoProductId) { echo "  ⚠ Product not found for item: {$mongoProductId}\n"; }

        $stmt = $db->prepare('INSERT INTO order_items (order_id, product_id, name, size, price, qty, image) VALUES (?,?,?,?,?,?,?)');
        $stmt->execute([
            $orderId,
            $mysqlProductId,
            $item['name'] ?? '',
            $item['size'] ?? '100g',
            $item['price'] ?? 0,
            $item['qty'] ?? 1,
            $item['image'] ?? null,
        ]);
    }

    $count++;
}
echo "  ✓ {$count} orders migrated\n\n";

// ===== REVIEWS =====
echo "→ Migrating reviews...\n";
$reviews = load_json_file("{$dataDir}/reviews.json");
$count = 0;
foreach ($reviews as $mongoReview) {
    $mongoUserId = $mongoReview['user'] ?? null;
    $mongoProductId = $mongoReview['product'] ?? null;
    $mysqlUserId = $userIdMap[(string)$mongoUserId] ?? null;
    $mysqlProductId = $productIdMap[(string)$mongoProductId] ?? null;
    if (!$mysqlUserId || !$mysqlProductId) continue;

    $stmt = $db->prepare('INSERT IGNORE INTO reviews (user_id, product_id, rating, title, body, created_at) VALUES (?,?,?,?,?,?)');
    $stmt->execute([
        $mysqlUserId,
        $mysqlProductId,
        $mongoReview['rating'] ?? 5,
        $mongoReview['title'] ?? null,
        $mongoReview['body'] ?? null,
        $mongoReview['createdAt'] ?? date('Y-m-d H:i:s'),
    ]);
    $count++;
}
echo "  ✓ {$count} reviews migrated\n\n";

// ===== COUPONS =====
echo "→ Migrating coupons...\n";
$coupons = load_json_file("{$dataDir}/coupons.json");
$count = 0;
foreach ($coupons as $mongoCoupon) {
    $stmt = $db->prepare('INSERT IGNORE INTO coupons (name, code, campaign_type, campaign_label, banner_text, featured_on_store, priority, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, per_user_limit, used_count, active, valid_from, valid_to, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $stmt->execute([
        $mongoCoupon['name'] ?? '',
        $mongoCoupon['code'] ?? '',
        $mongoCoupon['campaignType'] ?? $mongoCoupon['campaign_type'] ?? 'regular',
        $mongoCoupon['campaignLabel'] ?? $mongoCoupon['campaign_label'] ?? '',
        $mongoCoupon['bannerText'] ?? $mongoCoupon['banner_text'] ?? '',
        !empty($mongoCoupon['featuredOnStore'] ?? $mongoCoupon['featured_on_store'] ?? false) ? 1 : 0,
        $mongoCoupon['priority'] ?? 0,
        $mongoCoupon['description'] ?? null,
        $mongoCoupon['discountType'] ?? $mongoCoupon['discount_type'] ?? 'flat',
        $mongoCoupon['discountValue'] ?? $mongoCoupon['discount_value'] ?? 0,
        $mongoCoupon['minOrderAmount'] ?? $mongoCoupon['min_order_amount'] ?? 0,
        $mongoCoupon['maxDiscount'] ?? $mongoCoupon['max_discount'] ?? null,
        $mongoCoupon['usageLimit'] ?? $mongoCoupon['usage_limit'] ?? null,
        $mongoCoupon['perUserLimit'] ?? $mongoCoupon['per_user_limit'] ?? null,
        $mongoCoupon['usedCount'] ?? $mongoCoupon['used_count'] ?? 0,
        !empty($mongoCoupon['active'] ?? true) ? 1 : 0,
        $mongoCoupon['validFrom'] ?? $mongoCoupon['valid_from'] ?? date('Y-m-d H:i:s'),
        $mongoCoupon['validTo'] ?? $mongoCoupon['valid_to'] ?? date('Y-m-d H:i:s', strtotime('+1 year')),
        $mongoCoupon['createdAt'] ?? $mongoCoupon['created_at'] ?? date('Y-m-d H:i:s'),
    ]);
    $count++;
}
echo "  ✓ {$count} coupons migrated\n\n";

// ===== TESTIMONIALS =====
echo "→ Migrating testimonials...\n";
$testimonials = load_json_file("{$dataDir}/testimonials.json");
$count = 0;
foreach ($testimonials as $t) {
    $stmt = $db->prepare('INSERT IGNORE INTO testimonials (author, role, text, rating, approved, featured, sort_order, created_at) VALUES (?,?,?,?,?,?,?,?)');
    $stmt->execute([
        $t['author'] ?? '',
        $t['role'] ?? 'Customer',
        $t['text'] ?? '',
        $t['rating'] ?? 5,
        !empty($t['approved'] ?? false) ? 1 : 0,
        !empty($t['featured'] ?? false) ? 1 : 0,
        $t['order'] ?? $t['sort_order'] ?? 0,
        $t['createdAt'] ?? $t['created_at'] ?? date('Y-m-d H:i:s'),
    ]);
    $count++;
}
echo "  ✓ {$count} testimonials migrated\n\n";

// ===== COUNTERS =====
echo "→ Migrating counters...\n";
$counters = load_json_file("{$dataDir}/counters.json");
foreach ($counters as $counter) {
    $name = $counter['_id'] ?? $counter['name'] ?? 'orderNumber';
    $seq = $counter['seq'] ?? 0;
    $db->prepare('INSERT INTO counters (name, seq) VALUES (?, ?) ON DUPLICATE KEY UPDATE seq = ?')->execute([$name, $seq, $seq]);
    echo "  ✓ Counter '{$name}' set to {$seq}\n";
}

echo "\n=== Migration Complete! ===\n";
echo "Review the output above for any warnings.\n";
echo "After migration, recalculate all product ratings:\n";
echo "  mysql> UPDATE products SET rating = (SELECT IFNULL(ROUND(AVG(r.rating),1),0) FROM reviews r WHERE r.product_id = products.id), review_count = (SELECT COUNT(*) FROM reviews r WHERE r.product_id = products.id);\n";
