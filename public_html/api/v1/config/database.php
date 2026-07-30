<?php
declare(strict_types=1);

/**
 * Database connection - auto-detects SQLite (dev) or MySQL (production)
 * Uses __DIR__ for reliable path resolution in any context.
 */

$pdo_instance = null;
$db_type = null;

function get_db(): PDO
{
    global $pdo_instance, $db_type;
    if ($pdo_instance !== null) {
        return $pdo_instance;
    }

    $dbHost = env('DB_HOST', '');
    $dbName = env('DB_NAME', 'feelinga_tea');
    $dbUser = env('DB_USER', '');
    $dbPass = env('DB_PASS', '');

    if ($dbHost !== '' && $dbUser !== '' && $dbUser !== 'your_db_user' && $dbUser !== 'root') {
        // MySQL mode (production on Hostinger)
        $dsn = "mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo_instance = new PDO($dsn, $dbUser, $dbPass, $options);
            $db_type = 'mysql';
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['status' => 'error', 'message' => 'MySQL connection failed: ' . $e->getMessage()]);
            exit(1);
        }
    } else {
        // SQLite mode (local dev)
        // __DIR__ always points to the config/ directory regardless of who includes us
        $projectRoot = dirname(__DIR__, 4); // config -> v1 -> api -> public_html -> projectRoot
        $dbDir = $projectRoot . '/data';
        if (!is_dir($dbDir)) {
            mkdir($dbDir, 0755, true);
        }
        $dbPath = $dbDir . '/feelinga.db';
        $pdo_instance = new PDO('sqlite:' . $dbPath, null, null, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
        $db_type = 'sqlite';
        $pdo_instance->exec('PRAGMA journal_mode=WAL');
        $pdo_instance->exec('PRAGMA foreign_keys=ON');
    }

    return $pdo_instance;
}

/**
 * Initialize SQLite schema (creates tables if they don't exist)
 */
function init_sqlite_schema(): void
{
    global $db_type, $pdo_instance;
    if ($db_type !== 'sqlite' || $pdo_instance === null) return;

    $pdo_instance->exec('CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL, role TEXT NOT NULL DEFAULT "customer", phone TEXT DEFAULT NULL,
        refresh_token TEXT DEFAULT NULL, password_reset_token TEXT DEFAULT NULL,
        password_reset_expires TEXT DEFAULT NULL, email_verified INTEGER NOT NULL DEFAULT 1,
        email_verify_token TEXT DEFAULT NULL, email_verify_expires TEXT DEFAULT NULL,
        google_id TEXT DEFAULT NULL, login_attempts INTEGER NOT NULL DEFAULT 0,
        lock_until TEXT DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    $pdo_instance->exec('CREATE TABLE IF NOT EXISTS addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
        label TEXT NOT NULL DEFAULT "Home", full_name TEXT NOT NULL, phone TEXT NOT NULL,
        address_line1 TEXT NOT NULL, address_line2 TEXT DEFAULT NULL,
        city TEXT NOT NULL, state TEXT NOT NULL, pincode TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )');
    $pdo_instance->exec('CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
        type TEXT NOT NULL, description TEXT NOT NULL, short_description TEXT DEFAULT NULL,
        price_50g REAL DEFAULT NULL, price_100g REAL NOT NULL, price_200g REAL DEFAULT NULL,
        moods TEXT DEFAULT NULL, origin TEXT NOT NULL, caffeine TEXT NOT NULL DEFAULT "medium",
        tasting_notes TEXT DEFAULT NULL, brewing_temperature TEXT DEFAULT NULL,
        brewing_steep_time TEXT DEFAULT NULL, brewing_amount TEXT DEFAULT NULL,
        brewing_steps TEXT DEFAULT NULL, images TEXT DEFAULT NULL,
        rating REAL NOT NULL DEFAULT 0.0, review_count INTEGER NOT NULL DEFAULT 0,
        in_stock INTEGER NOT NULL DEFAULT 1, stock INTEGER NOT NULL DEFAULT 100,
        is_best_seller INTEGER NOT NULL DEFAULT 0, is_new_arrival INTEGER NOT NULL DEFAULT 1,
        tags TEXT DEFAULT NULL, deleted_at TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    $pdo_instance->exec('CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
        order_number TEXT NOT NULL UNIQUE, subtotal REAL NOT NULL,
        shipping REAL NOT NULL DEFAULT 0, tax REAL NOT NULL DEFAULT 0,
        discount REAL NOT NULL DEFAULT 0, coupon_code TEXT DEFAULT NULL,
        total REAL NOT NULL, status TEXT NOT NULL DEFAULT "pending",
        payment_method TEXT NOT NULL, payment_status TEXT NOT NULL DEFAULT "pending",
        razorpay_order_id TEXT DEFAULT NULL, razorpay_payment_id TEXT DEFAULT NULL,
        tracking_number TEXT DEFAULT NULL, tracking_url TEXT DEFAULT NULL,
        cancelled_at TEXT DEFAULT NULL, cancel_reason TEXT DEFAULT NULL,
        notes TEXT DEFAULT NULL, ship_first_name TEXT NOT NULL, ship_last_name TEXT NOT NULL,
        ship_line1 TEXT NOT NULL, ship_line2 TEXT DEFAULT NULL, ship_city TEXT NOT NULL,
        ship_state TEXT NOT NULL, ship_pincode TEXT NOT NULL, ship_phone TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )');
    $pdo_instance->exec('CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL, name TEXT NOT NULL, size TEXT NOT NULL DEFAULT "100g",
        price REAL NOT NULL, qty INTEGER NOT NULL, image TEXT DEFAULT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
    )');
    $pdo_instance->exec('CREATE TABLE IF NOT EXISTS carts (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )');
    $pdo_instance->exec('CREATE TABLE IF NOT EXISTS cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT, cart_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL, size TEXT NOT NULL DEFAULT "100g",
        qty INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
    )');
    $pdo_instance->exec('CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL, rating INTEGER NOT NULL, title TEXT DEFAULT NULL,
        body TEXT DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE(user_id, product_id)
    )');
    $pdo_instance->exec('CREATE TABLE IF NOT EXISTS coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL DEFAULT "",
        code TEXT NOT NULL UNIQUE, campaign_type TEXT NOT NULL DEFAULT "regular",
        campaign_label TEXT NOT NULL DEFAULT "", banner_text TEXT NOT NULL DEFAULT "",
        featured_on_store INTEGER NOT NULL DEFAULT 0, priority INTEGER NOT NULL DEFAULT 0,
        description TEXT DEFAULT NULL, discount_type TEXT NOT NULL, discount_value REAL NOT NULL,
        min_order_amount REAL NOT NULL DEFAULT 0, max_discount REAL DEFAULT NULL,
        usage_limit INTEGER DEFAULT NULL, per_user_limit INTEGER DEFAULT NULL,
        used_count INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
        valid_from TIMESTAMP NOT NULL, valid_to TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    $pdo_instance->exec('CREATE TABLE IF NOT EXISTS wishlist (
        user_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, product_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )');
    $pdo_instance->exec('CREATE TABLE IF NOT EXISTS testimonials (
        id INTEGER PRIMARY KEY AUTOINCREMENT, author TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT "Customer", text TEXT NOT NULL,
        rating INTEGER NOT NULL DEFAULT 5, approved INTEGER NOT NULL DEFAULT 0,
        featured INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    $pdo_instance->exec('CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id INTEGER NOT NULL,
        actor_name TEXT NOT NULL, actor_role TEXT NOT NULL DEFAULT "admin",
        action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT DEFAULT NULL,
        summary TEXT NOT NULL, meta TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (actor_id) REFERENCES users(id)
    )');
    $pdo_instance->exec('CREATE TABLE IF NOT EXISTS contact_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
        email TEXT NOT NULL, subject TEXT NOT NULL DEFAULT "General Inquiry",
        message TEXT NOT NULL, status TEXT NOT NULL DEFAULT "new",
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    $pdo_instance->exec('CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE,
        subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        active INTEGER NOT NULL DEFAULT 1, unsubscribe_token TEXT DEFAULT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    $pdo_instance->exec('CREATE TABLE IF NOT EXISTS counters (
        name TEXT PRIMARY KEY, seq INTEGER NOT NULL DEFAULT 0
    )');
    $pdo_instance->exec('INSERT OR IGNORE INTO counters (name, seq) VALUES ("orderNumber", 0)');
}

function check_db_health(): array
{
    try {
        $db = get_db();
        $stmt = $db->query('SELECT 1');
        if ($stmt->fetch()) {
            return ['status' => 'success', 'database' => 'connected'];
        }
    } catch (Exception $e) {
        return ['status' => 'error', 'database' => 'disconnected', 'message' => $e->getMessage()];
    }
    return ['status' => 'error', 'database' => 'unknown'];
}
