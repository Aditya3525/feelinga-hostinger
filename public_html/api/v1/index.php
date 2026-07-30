<?php
declare(strict_types=1);

/**
 * Feelinga Tea API — Main Router
 * 
 * Entry point for all API requests. Parses the URI, loads modules,
 * and dispatches to the appropriate controller.
 * 
 * Reference: backend/src/app.ts — route registration (lines 18-29)
 */

// ===== BOOTSTRAP =====
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// Load environment and config
// Resolve .env path relative to the project root
$envPath = dirname(dirname(dirname(__DIR__))) . '/.env';
if (!file_exists($envPath)) {
    // Fallback: try from the working directory (router.php chdir)
    $envPath = dirname(getcwd()) . '/.env';
}
if (!file_exists($envPath)) {
    $envPath = getcwd() . '/../../.env';
}
require_once __DIR__ . '/config/env.php';
load_env($envPath);
require_once __DIR__ . '/config/constants.php';
require_once __DIR__ . '/config/database.php';

// Load utilities
require_once __DIR__ . '/utils/response.php';
require_once __DIR__ . '/utils/sanitize.php';
require_once __DIR__ . '/utils/cache.php';
require_once __DIR__ . '/utils/audit.php';

// Load middleware
require_once __DIR__ . '/middleware/cors.php';
require_once __DIR__ . '/middleware/auth.php';
require_once __DIR__ . '/middleware/rate_limit.php';

// ===== INIT DATABASE (SQLite auto-schema) =====
init_sqlite_schema();

// ===== CORS =====
handle_cors();

// ===== PARSE REQUEST =====
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Determine URI path from all candidate server variables
$uriCandidate = $_SERVER['PATH_INFO'] 
             ?? $_SERVER['REQUEST_URI'] 
             ?? $_SERVER['REDIRECT_URL'] 
             ?? $_SERVER['SCRIPT_URL'] 
             ?? '/';

$rawPath = parse_url($uriCandidate, PHP_URL_PATH) ?? '/';

// Extract everything after /api/v1 (e.g. /api/v1/products -> /products)
if (preg_match('#/api/v1(?:/(.*))?$#i', $rawPath, $matches)) {
    $uri = '/' . ltrim($matches[1] ?? '', '/');
} else {
    $uri = '/' . ltrim($rawPath, '/');
}

// Split into path segments (e.g. ['products', 'assam-breakfast'])
$segments = array_values(array_filter(explode('/', $uri), fn($s) => $s !== ''));

// First segment = module name (e.g. 'products', 'orders', 'auth', 'coupons')
$module = strtolower($segments[0] ?? '');

// ===== ROUTE DISPATCH =====
try {
    switch ($module) {

        // ---- Health check ----
        case 'health':
            $health = check_db_health();
            echo json_encode($health, JSON_UNESCAPED_UNICODE);
            exit;

        // ---- Auth routes ----
        // Reference: backend/src/app.ts line 19 — authRoutes
        case 'auth':
            require __DIR__ . '/modules/auth/routes.php';
            exit;

        // ---- Products routes ----
        // Reference: backend/src/app.ts line 20 — productRoutes
        case 'products':
            require __DIR__ . '/modules/products/routes.php';
            exit;

        // ---- Orders routes ----
        // Reference: backend/src/app.ts line 21 — orderRoutes
        case 'orders':
            require __DIR__ . '/modules/orders/routes.php';
            exit;

        // ---- Reviews routes ----
        // Reference: backend/src/app.ts line 22 — reviewRoutes
        case 'reviews':
            require __DIR__ . '/modules/reviews/routes.php';
            exit;

        // ---- Cart routes ----
        // Reference: backend/src/app.ts line 23 — cartRoutes
        case 'cart':
            require __DIR__ . '/modules/cart/routes.php';
            exit;

        // ---- Admin routes ----
        // Reference: backend/src/app.ts line 24 — adminRoutes
        case 'admin':
            require __DIR__ . '/modules/admin/routes.php';
            exit;

        // ---- Contact routes ----
        // Reference: backend/src/app.ts line 25 — contactRoutes
        case 'contact':
            require __DIR__ . '/modules/contact/routes.php';
            exit;

        // ---- Upload routes ----
        // Reference: backend/src/app.ts line 26 — uploadRoutes
        case 'upload':
            require __DIR__ . '/modules/upload/routes.php';
            exit;

        // ---- Testimonials routes ----
        // Reference: backend/src/app.ts line 27 — testimonialRoutes
        case 'testimonials':
            require __DIR__ . '/modules/testimonials/routes.php';
            exit;

        // ---- Coupons routes ----
        // Reference: backend/src/app.ts line 28 — couponRoutes
        case 'coupons':
            require __DIR__ . '/modules/coupons/routes.php';
            exit;

        // ---- Newsletter (sub-route of contact) ----
        case 'newsletter':
            require __DIR__ . '/modules/contact/routes.php';
            exit;

        // ---- 404 ----
        default:
            json_error('Endpoint not found', 404);
    }
} catch (Exception $e) {
    error_log('[API] Unhandled error: ' . $e->getMessage());
    json_error('Internal server error', 500);
}
