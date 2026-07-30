<?php
// Harness 3: Empirical test for coupon verification SQL query in PHP (SQLite in-memory)
// Verifies orders/controller.php & coupons/controller.php SQL query with NULL start/end dates

declare(strict_types=1);

echo "=== RUNNING EMPIRICAL TEST: Coupon Verification SQL Query ===\n\n";

// Create in-memory SQLite database
$db = new PDO('sqlite::memory:');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

// Create coupons table schema
$db->exec("
    CREATE TABLE coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        campaign_type TEXT DEFAULT 'regular',
        campaign_label TEXT,
        banner_text TEXT,
        featured_on_store INTEGER DEFAULT 0,
        priority INTEGER DEFAULT 0,
        description TEXT,
        discount_type TEXT NOT NULL,
        discount_value REAL NOT NULL,
        min_order_amount REAL DEFAULT 0,
        max_discount REAL,
        usage_limit INTEGER,
        per_user_limit INTEGER,
        used_count INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        valid_from DATETIME,
        valid_to DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
");

// Insert test coupons
$couponsToInsert = [
    // Case 1: NULL start, NULL end (evergreen coupon)
    [
        'name' => 'Evergreen Coupon',
        'code' => 'EVERGREEN',
        'discount_type' => 'percentage',
        'discount_value' => 15,
        'active' => 1,
        'valid_from' => null,
        'valid_to' => null
    ],
    // Case 2: NULL start, Future end date
    [
        'name' => 'No Start Date Coupon',
        'code' => 'NOSTART',
        'discount_type' => 'flat',
        'discount_value' => 100,
        'active' => 1,
        'valid_from' => null,
        'valid_to' => '2099-12-31 23:59:59'
    ],
    // Case 3: Past start date, NULL end date
    [
        'name' => 'No End Date Coupon',
        'code' => 'NOEND',
        'discount_type' => 'flat',
        'discount_value' => 50,
        'active' => 1,
        'valid_from' => '2020-01-01 00:00:00',
        'valid_to' => null
    ],
    // Case 4: Past start, Future end date
    [
        'name' => 'Standard Valid Coupon',
        'code' => 'VALID10',
        'discount_type' => 'percentage',
        'discount_value' => 10,
        'active' => 1,
        'valid_from' => '2020-01-01 00:00:00',
        'valid_to' => '2099-12-31 23:59:59'
    ],
    // Case 5: Future start date (not valid yet)
    [
        'name' => 'Future Coupon',
        'code' => 'FUTURE20',
        'discount_type' => 'percentage',
        'discount_value' => 20,
        'active' => 1,
        'valid_from' => '2099-01-01 00:00:00',
        'valid_to' => '2099-12-31 23:59:59'
    ],
    // Case 6: Past end date (expired)
    [
        'name' => 'Expired Coupon',
        'code' => 'EXPIRED50',
        'discount_type' => 'percentage',
        'discount_value' => 50,
        'active' => 1,
        'valid_from' => '2020-01-01 00:00:00',
        'valid_to' => '2020-12-31 23:59:59'
    ],
    // Case 7: Inactive coupon with NULL dates
    [
        'name' => 'Inactive Coupon',
        'code' => 'INACTIVE',
        'discount_type' => 'flat',
        'discount_value' => 200,
        'active' => 0,
        'valid_from' => null,
        'valid_to' => null
    ]
];

$stmtInsert = $db->prepare("
    INSERT INTO coupons (name, code, discount_type, discount_value, active, valid_from, valid_to)
    VALUES (?, ?, ?, ?, ?, ?, ?)
");

foreach ($couponsToInsert as $c) {
    $stmtInsert->execute([
        $c['name'],
        $c['code'],
        $c['discount_type'],
        $c['discount_value'],
        $c['active'],
        $c['valid_from'],
        $c['valid_to']
    ]);
}

echo "Inserted " . count($couponsToInsert) . " test coupons into SQLite database.\n\n";

// Exact Query 1 from orders/controller.php line 66:
// SELECT * FROM coupons WHERE code = ? AND active = 1 AND (valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP) AND (valid_to IS NULL OR valid_to >= CURRENT_TIMESTAMP)
$sqlOrders = 'SELECT * FROM coupons WHERE code = ? AND active = 1 AND (valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP) AND (valid_to IS NULL OR valid_to >= CURRENT_TIMESTAMP)';
$stmtOrders = $db->prepare($sqlOrders);

// Exact Query 2 from coupons/controller.php line 56:
// SELECT * FROM coupons WHERE code = ? AND active = 1 AND (valid_from IS NULL OR valid_from <= ?) AND (valid_to IS NULL OR valid_to >= ?)
$sqlCoupons = 'SELECT * FROM coupons WHERE code = ? AND active = 1 AND (valid_from IS NULL OR valid_from <= ?) AND (valid_to IS NULL OR valid_to >= ?)';
$stmtCoupons = $db->prepare($sqlCoupons);
$now = date('Y-m-d H:i:s');

$testCases = [
    ['code' => 'EVERGREEN',  'shouldMatch' => true,  'desc' => 'NULL start date & NULL end date'],
    ['code' => 'NOSTART',    'shouldMatch' => true,  'desc' => 'NULL start date & future end date'],
    ['code' => 'NOEND',      'shouldMatch' => true,  'desc' => 'Past start date & NULL end date'],
    ['code' => 'VALID10',    'shouldMatch' => true,  'desc' => 'Valid start date & valid end date'],
    ['code' => 'FUTURE20',   'shouldMatch' => false, 'desc' => 'Future start date (not valid yet)'],
    ['code' => 'EXPIRED50',  'shouldMatch' => false, 'desc' => 'Past end date (expired)'],
    ['code' => 'INACTIVE',   'shouldMatch' => false, 'desc' => 'Inactive coupon (active = 0)'],
];

$allPassed = true;

foreach ($testCases as $tc) {
    $code = $tc['code'];
    
    // Execute Query 1 (Orders controller query)
    $stmtOrders->execute([$code]);
    $resOrders = $stmtOrders->fetch();
    
    // Execute Query 2 (Coupons controller query)
    $stmtCoupons->execute([$code, $now, $now]);
    $resCoupons = $stmtCoupons->fetch();
    
    $ordersMatched = ($resOrders !== false);
    $couponsMatched = ($resCoupons !== false);
    
    echo "Test code: '{$code}' ({$tc['desc']})\n";
    echo "  orders/controller.php query match: " . ($ordersMatched ? "YES" : "NO") . "\n";
    echo "  coupons/controller.php query match: " . ($couponsMatched ? "YES" : "NO") . "\n";
    
    if ($ordersMatched === $tc['shouldMatch'] && $couponsMatched === $tc['shouldMatch']) {
        echo "  => RESULT: PASS\n\n";
    } else {
        echo "  => RESULT: FAIL (Expected match: " . ($tc['shouldMatch'] ? "YES" : "NO") . ")\n\n";
        $allPassed = false;
    }
}

if (!$allPassed) {
    echo "=== FAILURE: One or more coupon query test cases failed ===\n";
    exit(1);
} else {
    echo "=== SUMMARY: All coupon verification SQL queries passed empirically ===\n";
}
