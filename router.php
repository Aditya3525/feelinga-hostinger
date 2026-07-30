<?php
/**
 * Self-contained API server router for PHP built-in server.
 * Everything bootstraps via __DIR__ relative to THIS file.
 */
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);

// Static files: serve directly from public_html
$filePath = __DIR__ . '/public_html' . $path;
if (file_exists($filePath) && !is_dir($filePath)) {
    $ext = pathinfo($filePath, PATHINFO_EXTENSION);
    $mimeTypes = [
        'css' => 'text/css',
        'js' => 'application/javascript',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'ico' => 'image/x-icon',
        'svg' => 'image/svg+xml',
        'webp' => 'image/webp',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf' => 'font/ttf',
        'json' => 'application/json',
        'txt' => 'text/plain',
    ];
    if (isset($mimeTypes[$ext])) {
        header('Content-Type: ' . $mimeTypes[$ext]);
    }
    readfile($filePath);
    return true;
}

// Root: serve index.html or JSON info
if ($path === '/' || $path === '') {
    $indexFile = __DIR__ . '/public_html/index.html';
    if (file_exists($indexFile)) {
        header('Content-Type: text/html');
        readfile($indexFile);
        return true;
    }
    http_response_code(200);
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'success',
        'message' => 'Feelinga API v1',
        'endpoints' => ['/api/v1/health', '/api/v1/products', '/api/v1/testimonials'],
    ]);
    return true;
}

// API routes: bootstrap everything
if (strpos($path, '/api/') === 0) {
    // Load env
    require_once __DIR__ . '/public_html/api/v1/config/env.php';
    $envFile = __DIR__ . '/.env';
    if (!file_exists($envFile)) $envFile = dirname($envFile) . '/.env';
    load_env($envFile);

    // Load config
    require_once __DIR__ . '/public_html/api/v1/config/constants.php';
    require_once __DIR__ . '/public_html/api/v1/config/database.php';

    // Init schema (no-op if tables exist)
    init_sqlite_schema();

    // Load utils
    require_once __DIR__ . '/public_html/api/v1/utils/response.php';
    require_once __DIR__ . '/public_html/api/v1/utils/sanitize.php';
    require_once __DIR__ . '/public_html/api/v1/utils/cache.php';
    require_once __DIR__ . '/public_html/api/v1/utils/audit.php';

    // Load middleware
    require_once __DIR__ . '/public_html/api/v1/middleware/cors.php';
    require_once __DIR__ . '/public_html/api/v1/middleware/auth.php';
    require_once __DIR__ . '/public_html/api/v1/middleware/rate_limit.php';

    handle_cors();

    // Parse request
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $apiPath = preg_replace('#^/api/v1#', '', $path);
    $apiPath = '/' . trim($apiPath, '/');
    $segments = array_values(array_filter(explode('/', $apiPath)));
    $module = $segments[0] ?? '';

    try {
        switch ($module) {
            case 'health':
                echo json_encode(check_db_health(), JSON_UNESCAPED_UNICODE);
                exit;
            case 'auth':
                require __DIR__ . '/public_html/api/v1/modules/auth/routes.php';
                exit;
            case 'products':
                require __DIR__ . '/public_html/api/v1/modules/products/routes.php';
                exit;
            case 'orders':
                require __DIR__ . '/public_html/api/v1/modules/orders/routes.php';
                exit;
            case 'reviews':
                require __DIR__ . '/public_html/api/v1/modules/reviews/routes.php';
                exit;
            case 'cart':
                require __DIR__ . '/public_html/api/v1/modules/cart/routes.php';
                exit;
            case 'admin':
                require __DIR__ . '/public_html/api/v1/modules/admin/routes.php';
                exit;
            case 'contact':
                require __DIR__ . '/public_html/api/v1/modules/contact/routes.php';
                exit;
            case 'upload':
                require __DIR__ . '/public_html/api/v1/modules/upload/routes.php';
                exit;
            case 'testimonials':
                require __DIR__ . '/public_html/api/v1/modules/testimonials/routes.php';
                exit;
            case 'coupons':
                require __DIR__ . '/public_html/api/v1/modules/coupons/routes.php';
                exit;
            case 'newsletter':
                require __DIR__ . '/public_html/api/v1/modules/contact/routes.php';
                exit;
            default:
                json_error('Endpoint not found', 404);
        }
    } catch (Exception $e) {
        error_log('[API] ' . $e->getMessage());
        json_error('Internal server error', 500);
    }
    return true;
}

// SPA fallback: serve index.html for frontend routes
$spaIndex = __DIR__ . '/public_html/index.html';
if (file_exists($spaIndex)) {
    header('Content-Type: text/html');
    readfile($spaIndex);
    return true;
}

http_response_code(404);
header('Content-Type: application/json');
echo json_encode(['status' => 'error', 'message' => 'Not found']);
return true;
