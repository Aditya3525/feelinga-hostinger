<?php
require_once __DIR__ . '/public_html/api/v1/config/env.php';
require_once __DIR__ . '/public_html/api/v1/config/database.php';

$base = 'http://localhost:8000/api/v1';
$pass = 0;
$fail = 0;
$results = [];

function request($method, $url, $data = null, $token = null) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    
    $headers = [];
    if ($token) {
        $headers[] = "Authorization: Bearer {$token}";
    }
    if ($data !== null) {
        $headers[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $json = json_decode($response, true);
    return ['code' => $code, 'body' => $response, 'json' => $json];
}

function assertTest($name, $expectedCode, $res) {
    global $pass, $fail, $results;
    if ($res['code'] == $expectedCode) {
        $pass++;
        $results[] = ["status" => "PASS", "name" => $name, "code" => $res['code']];
        echo "  ✅ PASS | {$name} [HTTP {$res['code']}]\n";
    } else {
        $fail++;
        $bodyPreview = substr($res['body'] ?? '', 0, 150);
        $results[] = ["status" => "FAIL", "name" => $name, "code" => $res['code'], "expected" => $expectedCode, "body" => $bodyPreview];
        echo "  ❌ FAIL | {$name} [Expected {$expectedCode}, Got {$res['code']}] - {$bodyPreview}\n";
    }
}

echo "=== STARTING API TEST SUITE ===\n\n";

// --- Health Check ---
$res = request('GET', "$base/health");
assertTest("Health Check", 200, $res);

// --- Auth Login Admin ---
$adminLogin = request('POST', "$base/auth/login", [
    "email" => "admin@feelinga.com",
    "password" => "Admin@123"
]);
assertTest("Admin Login", 200, $adminLogin);
$adminToken = $adminLogin['json']['data']['accessToken'] ?? '';
$adminRefresh = $adminLogin['json']['data']['refreshToken'] ?? '';

// --- Auth Login Customer ---
$custLogin = request('POST', "$base/auth/login", [
    "email" => "test@example.com",
    "password" => "Test@1234"
]);
assertTest("Customer Login", 200, $custLogin);
$custToken = $custLogin['json']['data']['accessToken'] ?? '';
$custRefresh = $custLogin['json']['data']['refreshToken'] ?? '';

// --- Products ---
assertTest("Products List", 200, request('GET', "$base/products"));
assertTest("Products Pagination", 200, request('GET', "$base/products?page=1&limit=3"));
assertTest("Products Filter by Type", 200, request('GET', "$base/products?type=Black+Tea"));
assertTest("Products Sort by Price", 200, request('GET', "$base/products?sort=price"));
assertTest("Products Best Sellers", 200, request('GET', "$base/products?isBestSeller=true"));
assertTest("Products New Arrivals", 200, request('GET', "$base/products?isNewArrival=true"));
assertTest("Products Search", 200, request('GET', "$base/products/search?q=darjeeling"));
assertTest("Products Search (too short)", 400, request('GET', "$base/products/search?q=a"));
assertTest("Products Autocomplete", 200, request('GET', "$base/products/autocomplete?q=ass"));
assertTest("Product by Slug", 200, request('GET', "$base/products/darjeeling-first-flush"));
assertTest("Product Not Found", 404, request('GET', "$base/products/nonexistent-slug"));

// --- Auth Endpoints ---
$newEmail = "newuser_" . time() . "@test.com";
assertTest("Register New User", 201, request('POST', "$base/auth/register", [
    "name" => "New User",
    "email" => $newEmail,
    "password" => "NewP@ss123"
]));
assertTest("Register Duplicate", 409, request('POST', "$base/auth/register", [
    "name" => "New User",
    "email" => $newEmail,
    "password" => "NewP@ss123"
]));
assertTest("Login Wrong Password", 401, request('POST', "$base/auth/login", [
    "email" => "admin@feelinga.com",
    "password" => "wrong"
]));
assertTest("Auth Me (customer)", 200, request('GET', "$base/auth/me", null, $custToken));
assertTest("Auth Me (admin)", 200, request('GET', "$base/auth/me", null, $adminToken));
assertTest("Auth Refresh", 200, request('POST', "$base/auth/refresh", ["refreshToken" => $custRefresh]));
assertTest("Check Email (exists)", 200, request('POST', "$base/auth/check-email", ["email" => "admin@feelinga.com"]));
assertTest("Check Email (not exists)", 200, request('POST', "$base/auth/check-email", ["email" => "nobody@test.com"]));

// --- Profile & Addresses ---
assertTest("Update Profile", 200, request('PATCH', "$base/auth/profile", ["name" => "Updated Name", "phone" => "+919876543210"], $custToken));
assertTest("Change Password", 200, request('PATCH', "$base/auth/password", ["currentPassword" => "Test@1234", "newPassword" => "Test@12345"], $custToken));
// Revert password
request('PATCH', "$base/auth/password", ["currentPassword" => "Test@12345", "newPassword" => "Test@1234"], $custToken);

$addAddr = request('POST', "$base/auth/address", [
    "fullName" => "Test User",
    "phone" => "9876543210",
    "addressLine1" => "123 Main St",
    "city" => "Mumbai",
    "state" => "Maharashtra",
    "pincode" => "400001"
], $custToken);
assertTest("Add Address", 201, $addAddr);
$addrId = $addAddr['json']['data']['addresses'][0]['id'] ?? null;
if ($addrId) {
    assertTest("Update Address", 200, request('PATCH', "$base/auth/address/$addrId", ["fullName" => "Updated User"], $custToken));
}

// --- Cart ---
assertTest("Cart Get (initial)", 200, request('GET', "$base/cart", null, $custToken));
$addItem = request('POST', "$base/cart/items", ["productId" => 1, "size" => "100g", "qty" => 2], $custToken);
assertTest("Cart Add Item", 201, $addItem);
$cartRes = request('GET', "$base/cart", null, $custToken);
assertTest("Cart Get (with items)", 200, $cartRes);
$cartItemId = $cartRes['json']['data']['items'][0]['id'] ?? null;
if ($cartItemId) {
    assertTest("Cart Update Item", 200, request('PATCH', "$base/cart/items/$cartItemId", ["qty" => 3], $custToken));
    assertTest("Cart Remove Item", 200, request('DELETE', "$base/cart/items/$cartItemId", null, $custToken));
}

// --- Reviews ---
assertTest("Reviews List", 200, request('GET', "$base/reviews?productId=1"));
$testProdId = rand(1, 6);
$revRes = request('POST', "$base/reviews", [
    "productId" => $testProdId, "rating" => 5, "title" => "Great tea", "body" => "Love it!"
], $custToken);
// If already reviewed, it's fine, otherwise test 201 and delete it
if ($revRes['code'] == 201) {
    assertTest("Review Create", 201, $revRes);
    assertTest("Review Duplicate", 400, request('POST', "$base/reviews", [
        "productId" => $testProdId, "rating" => 4, "title" => "Dupe", "body" => "Dup review"
    ], $custToken));
    $createdRevId = $revRes['json']['data']['_id'] ?? null;
    if ($createdRevId) {
        assertTest("Review Delete", 204, request('DELETE', "$base/reviews/$createdRevId", null, $custToken));
    }
} else {
    // If it was already reviewed, delete review via API first then re-test
    $revList = request('GET', "$base/reviews?productId=$testProdId");
    assertTest("Review Duplicate", 400, request('POST', "$base/reviews", [
        "productId" => $testProdId, "rating" => 4, "title" => "Dupe", "body" => "Dup review"
    ], $custToken));
}

// --- Wishlist ---
assertTest("Toggle Wishlist (add)", 200, request('POST', "$base/auth/wishlist/1", null, $custToken));
assertTest("Get Wishlist", 200, request('GET', "$base/auth/wishlist", null, $custToken));
assertTest("Toggle Wishlist (remove)", 200, request('POST', "$base/auth/wishlist/1", null, $custToken));

// --- Contact & Newsletter ---
assertTest("Contact Submit", 201, request('POST', "$base/contact", ["name" => "John", "email" => "john@test.com", "message" => "Hello!"]));
assertTest("Newsletter Subscribe", 201, request('POST', "$base/newsletter", ["email" => "newsletter_" . time() . "@test.com"]));
assertTest("Newsletter Duplicate", 200, request('POST', "$base/newsletter", ["email" => "newsletter_fixed@test.com"]));

// --- Testimonials & Coupons ---
assertTest("Testimonials Public", 200, request('GET', "$base/testimonials"));
assertTest("Coupons Campaign", 200, request('GET', "$base/coupons/campaign"));
assertTest("Coupon Validate", 200, request('POST', "$base/coupons/validate", ["code" => "WELCOME10", "subtotal" => 500], $custToken));
assertTest("Coupon Invalid", 404, request('POST', "$base/coupons/validate", ["code" => "INVALID123", "subtotal" => 500], $custToken));

// --- Orders ---
$createOrder = request('POST', "$base/orders", [
    "items" => [["productId" => 1, "size" => "100g", "qty" => 1]],
    "shippingAddress" => [
        "firstName" => "Test", "lastName" => "User", "line1" => "123 St",
        "city" => "Mumbai", "state" => "MH", "pincode" => "400001", "phone" => "9876543210"
    ],
    "paymentMethod" => "cod"
], $custToken);
assertTest("Create Order", 201, $createOrder);
$orderId = $createOrder['json']['data']['_id'] ?? null;

assertTest("Orders List (customer)", 200, request('GET', "$base/orders", null, $custToken));
if ($orderId) {
    assertTest("Order Get by ID", 200, request('GET', "$base/orders/$orderId", null, $custToken));
}

// --- Admin ---
assertTest("Admin Dashboard", 200, request('GET', "$base/admin", null, $adminToken));
assertTest("Admin Activity", 200, request('GET', "$base/admin/activity", null, $adminToken));
assertTest("Admin Users", 200, request('GET', "$base/admin/users", null, $adminToken));
assertTest("Admin Low Stock", 200, request('GET', "$base/admin/low-stock", null, $adminToken));
assertTest("Admin Coupons", 200, request('GET', "$base/admin/coupons", null, $adminToken));
assertTest("Admin Export Orders", 200, request('GET', "$base/admin/export/orders", null, $adminToken));
assertTest("Admin Export Products", 200, request('GET', "$base/admin/export/products", null, $adminToken));
assertTest("Admin Export Users", 200, request('GET', "$base/admin/export/users", null, $adminToken));

if ($orderId) {
    assertTest("Admin Update Order Status", 200, request('PATCH', "$base/orders/$orderId/status", ["status" => "confirmed"], $adminToken));
    assertTest("Admin Update Tracking", 200, request('PATCH', "$base/admin/orders/$orderId/tracking", [
        "trackingNumber" => "TRK123", "trackingUrl" => "https://track.example.com/TRK123"
    ], $adminToken));
    assertTest("Cancel Order (already confirmed)", 400, request('PATCH', "$base/orders/$orderId/cancel", ["reason" => "Changed my mind"], $custToken));
}

$createCoupon = request('POST', "$base/admin/coupons", [
    "name" => "Test Coupon", "code" => "TEST" . rand(100, 999), "discountType" => "percentage",
    "discountValue" => 20, "validFrom" => "2026-01-01", "validTo" => "2027-12-31", "active" => true
], $adminToken);
assertTest("Admin Create Coupon", 201, $createCoupon);
$couponId = $createCoupon['json']['data']['id'] ?? null;
if ($couponId) {
    assertTest("Admin Update Coupon", 200, request('PATCH', "$base/admin/coupons/$couponId", ["discountValue" => 25], $adminToken));
    assertTest("Admin Delete Coupon", 204, request('DELETE', "$base/admin/coupons/$couponId", null, $adminToken));
}

$createProd = request('POST', "$base/products", [
    "slug" => "test-product-" . rand(100, 999),
    "name" => "Test Product",
    "type" => "Black Tea",
    "description" => "Test description",
    "origin" => "Test",
    "prices" => ["100g" => 299],
    "brewingInstructions" => ["temperature" => "90°C", "steepTime" => "3-4 min", "amount" => "1 tsp"]
], $adminToken);
assertTest("Admin Create Product", 201, $createProd);
$prodId = $createProd['json']['data']['id'] ?? null;
if ($prodId) {
    assertTest("Admin Update Product", 200, request('PATCH', "$base/products/$prodId", ["name" => "Updated Test Product", "stock" => 50], $adminToken));
    assertTest("Admin Delete Product", 204, request('DELETE', "$base/products/$prodId", null, $adminToken));
}

assertTest("Admin Testimonials List", 200, request('GET', "$base/testimonials/all", null, $adminToken));
assertTest("Admin Create Testimonial", 201, request('POST', "$base/testimonials", [
    "author" => "Test Person", "text" => "Great tea!", "rating" => 5, "approved" => true
], $adminToken));

assertTest("Admin Contact Messages", 200, request('GET', "$base/contact", null, $adminToken));
assertTest("Admin Newsletter List", 200, request('GET', "$base/newsletter", null, $adminToken));

assertTest("Forgot Password", 200, request('POST', "$base/auth/forgot-password", ["email" => "test@example.com"]));
assertTest("Data Export", 200, request('GET', "$base/auth/data-export", null, $custToken));

echo "\n==================================================\n";
echo "TOTAL PASSED: {$pass}\n";
echo "TOTAL FAILED: {$fail}\n";
echo "TOTAL TESTS:  " . ($pass + $fail) . "\n";
echo "==================================================\n";
