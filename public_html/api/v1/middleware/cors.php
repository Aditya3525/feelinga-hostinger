<?php
declare(strict_types=1);

/**
 * CORS middleware
 * Reference: backend/src/app.ts — cors() middleware
 * Since frontend + API are on same domain (feelinga.com), CORS is same-origin.
 * We still set headers for any external tools or dev testing.
 */

function handle_cors(): void
{
    $allowedOrigin = env('CLIENT_URL', 'https://feelinga.com');

    header("Access-Control-Allow-Origin: {$allowedOrigin}");
    header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');

    // Handle preflight OPTIONS request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
