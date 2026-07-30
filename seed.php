<?php
declare(strict_types=1);

/**
 * Local dev seed — creates test products and admin user
 * Run: php seed.php
 */

$envPath = __DIR__ . '/.env';
require_once __DIR__ . '/public_html/api/v1/config/env.php';
load_env($envPath);
require_once __DIR__ . '/public_html/api/v1/config/database.php';

$db = get_db();
init_sqlite_schema();

echo "=== Seeding database ===\n\n";

// Admin user (password: Admin@123)
$adminHash = password_hash('Admin@123', PASSWORD_BCRYPT, ['cost' => 12]);
$stmt = $db->prepare('INSERT OR IGNORE INTO users (name, email, password, role, email_verified) VALUES (?, ?, ?, ?, ?)');
$stmt->execute(['Admin', 'admin@feelinga.com', $adminHash, 'admin', 1]);
echo "✓ Admin user: admin@feelinga.com / Admin@123\n";

// Test customer
$customerHash = password_hash('Test@1234', PASSWORD_BCRYPT, ['cost' => 12]);
$stmt = $db->prepare('INSERT OR IGNORE INTO users (name, email, password, role, email_verified) VALUES (?, ?, ?, ?, ?)');
$stmt->execute(['Test User', 'test@example.com', $customerHash, 'customer', 1]);
echo "✓ Customer user: test@example.com / Test@1234\n";

// Seed products
$products = [
    [
        'slug' => 'darjeeling-first-flush',
        'name' => 'Darjeeling First Flush',
        'type' => 'Black Tea',
        'description' => 'The champagne of teas. Harvested in the spring, this light and floral black tea offers a delicate muscatel character with hints of apricot and citrus.',
        'short_description' => 'Premium spring harvest with delicate muscatel character',
        'price_100g' => 499,
        'price_200g' => 899,
        'moods' => json_encode(['energize', 'focus']),
        'origin' => 'Darjeeling, West Bengal',
        'caffeine' => 'medium',
        'images' => json_encode(['/images/darjeeling-tea.png']),
        'in_stock' => 1, 'stock' => 50,
        'is_best_seller' => 1, 'is_new_arrival' => 0,
        'rating' => 4.7, 'review_count' => 24,
    ],
    [
        'slug' => 'assam-golden-tippy',
        'name' => 'Assam Golden Tippy',
        'type' => 'Black Tea',
        'description' => 'Rich, malty and full-bodied with golden tips. A classic Indian breakfast tea that pairs perfectly with milk.',
        'short_description' => 'Rich malty breakfast tea with golden tips',
        'price_100g' => 349,
        'price_200g' => 649,
        'moods' => json_encode(['energize']),
        'origin' => 'Assam',
        'caffeine' => 'high',
        'images' => json_encode(['/images/product-1.jpg']),
        'in_stock' => 1, 'stock' => 75,
        'is_best_seller' => 1, 'is_new_arrival' => 0,
        'rating' => 4.5, 'review_count' => 18,
    ],
    [
        'slug' => 'nilgiri-frost-tea',
        'name' => 'Nilgiri Frost Tea',
        'type' => 'Black Tea',
        'description' => 'Grown in the misty Blue Mountains of South India. Smooth, fragrant, and naturally sweet with notes of eucalyptus and wildflowers.',
        'short_description' => 'Smooth South Indian tea with floral notes',
        'price_100g' => 399,
        'price_200g' => 749,
        'moods' => json_encode(['relax', 'focus']),
        'origin' => 'Nilgiri, Tamil Nadu',
        'caffeine' => 'medium',
        'images' => json_encode(['/images/product-2.jpg']),
        'in_stock' => 1, 'stock' => 60,
        'is_best_seller' => 0, 'is_new_arrival' => 1,
        'rating' => 4.3, 'review_count' => 12,
    ],
    [
        'slug' => 'masala-chai-classic',
        'name' => 'Masala Chai Classic',
        'type' => 'Masala Chai',
        'description' => 'Our signature masala chai blend with cardamom, cinnamon, ginger, cloves, and black pepper. A comforting cup of India.',
        'short_description' => 'Traditional spiced tea with aromatic Indian masalas',
        'price_100g' => 299,
        'price_200g' => 549,
        'moods' => json_encode(['energize', 'relax']),
        'origin' => 'Blended in India',
        'caffeine' => 'medium',
        'images' => json_encode(['/images/product-3.jpg']),
        'in_stock' => 1, 'stock' => 100,
        'is_best_seller' => 1, 'is_new_arrival' => 0,
        'rating' => 4.8, 'review_count' => 42,
    ],
    [
        'slug' => 'jasmine-green-tea',
        'name' => 'Jasmine Green Tea',
        'type' => 'Green Tea',
        'description' => 'Fragrant green tea scented with jasmine blossoms. Light, refreshing, and subtly sweet. Perfect for relaxation.',
        'short_description' => 'Lightly scented with fragrant jasmine blossoms',
        'price_100g' => 449,
        'price_200g' => 849,
        'moods' => json_encode(['relax', 'detox']),
        'origin' => 'Kangra, Himachal Pradesh',
        'caffeine' => 'low',
        'images' => json_encode(['/images/product-4.jpg']),
        'in_stock' => 1, 'stock' => 40,
        'is_best_seller' => 0, 'is_new_arrival' => 1,
        'rating' => 4.6, 'review_count' => 15,
    ],
    [
        'slug' => 'tulsi-ginger-herbal',
        'name' => 'Tulsi Ginger Herbal',
        'type' => 'Herbal Infusion',
        'description' => 'A caffeine-free wellness blend of holy basil (tulsi), ginger, and lemon. Ayurvedic immunity support in every cup.',
        'short_description' => 'Caffeine-free wellness blend with tulsi and ginger',
        'price_100g' => 249,
        'price_200g' => 449,
        'moods' => json_encode(['detox', 'immunity', 'relax']),
        'origin' => 'Blended in India',
        'caffeine' => 'none',
        'images' => json_encode(['/images/product-5.jpg']),
        'in_stock' => 1, 'stock' => 80,
        'is_best_seller' => 0, 'is_new_arrival' => 0,
        'rating' => 4.4, 'review_count' => 9,
    ],
];

$db->exec('UPDATE products SET deleted_at = NULL');
$stmt = $db->prepare('INSERT OR IGNORE INTO products (slug, name, type, description, short_description, price_100g, price_200g, moods, origin, caffeine, images, in_stock, stock, is_best_seller, is_new_arrival, rating, review_count) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');

$count = 0;
foreach ($products as $p) {
    $stmt->execute([
        $p['slug'], $p['name'], $p['type'], $p['description'],
        $p['short_description'], $p['price_100g'], $p['price_200g'],
        $p['moods'], $p['origin'], $p['caffeine'], $p['images'],
        $p['in_stock'], $p['stock'], $p['is_best_seller'], $p['is_new_arrival'],
        $p['rating'], $p['review_count'],
    ]);
    $count++;
}
echo "✓ {$count} products seeded\n";

// Coupon
$stmt = $db->prepare("INSERT OR REPLACE INTO coupons (code, name, discount_type, discount_value, min_order_amount, max_discount, active, valid_from, valid_to, featured_on_store) VALUES (?,?,?,?,?,?,?,?,?,?)");
$stmt->execute(['WELCOME10', 'Welcome Offer', 'percentage', 10, 499, 100, 1, '2020-01-01 00:00:00', '2099-12-31 23:59:59', 1]);
echo "✓ Coupon WELCOME10 seeded\n";

// Testimonials
$stmt = $db->prepare("INSERT OR IGNORE INTO testimonials (author, role, text, rating, approved, featured, sort_order) VALUES (?,?,?,?,?,?,?)");
$stmt->execute(['Priya S.', 'Tea Enthusiast', 'The Darjeeling First Flush is absolutely divine! It has become my morning ritual.', 5, 1, 1, 1]);
$stmt->execute(['Rahul M.', 'Verified Buyer', 'Masala Chai Classic tastes just like homemade. My whole family loves it.', 5, 1, 1, 2]);
$stmt->execute(['Anjali K.', 'Wellness Coach', 'I recommend Tulsi Ginger to all my clients. Great for immunity and so soothing.', 5, 1, 0, 3]);
echo "✓ 3 testimonials seeded\n\n";

echo "=== Seed complete! ===\n";
echo "Start server: /c/php/php.exe -S localhost:8000 -t public_html\n";
