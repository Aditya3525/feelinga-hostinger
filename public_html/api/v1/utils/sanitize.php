<?php
declare(strict_types=1);

/**
 * Input sanitization utilities
 * Reference: backend/src/utils/sanitize.ts
 */

/**
 * Escape special regex characters in a string
 * Direct port of escapeRegex() from backend/src/utils/sanitize.ts
 */
function escape_regex(string $str): string
{
    return preg_quote($str, '/');
}

/**
 * Sanitize a string for safe HTML output (basic XSS prevention)
 */
function sanitize_string(string $input): string
{
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

/**
 * Sanitize and validate email
 */
function sanitize_email(string $email): string
{
    return strtolower(trim($email));
}

/**
 * Get a string from request body, trimmed
 */
function input_string(string $key, string $default = ''): string
{
    $body = get_request_body();
    return trim($body[$key] ?? $default);
}

/**
 * Get an integer from request body
 */
function input_int(string $key, int $default = 0): int
{
    $body = get_request_body();
    return isset($body[$key]) ? (int) $body[$key] : $default;
}

/**
 * Get a float from request body
 */
function input_float(string $key, float $default = 0.0): float
{
    $body = get_request_body();
    return isset($body[$key]) ? (float) $body[$key] : $default;
}

/**
 * Get a boolean from request body
 */
function input_bool(string $key, bool $default = false): bool
{
    $body = get_request_body();
    if (!isset($body[$key])) {
        return $default;
    }
    return filter_var($body[$key], FILTER_VALIDATE_BOOLEAN);
}

/**
 * Get the parsed JSON request body (cached)
 */
function get_request_body(): array
{
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }

    if ($_SERVER['CONTENT_TYPE'] === 'application/json' || str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) {
        $raw = file_get_contents('php://input');
        $parsed = json_decode($raw ?? '', true);
        $cached = is_array($parsed) ? $parsed : [];
    } else {
        $cached = $_POST ?? [];
    }

    return $cached;
}

/**
 * Get query string parameter
 */
function query_string(string $key, string $default = ''): string
{
    return $_GET[$key] ?? $default;
}

/**
 * Get query string as integer
 */
function query_int(string $key, int $default = 0): int
{
    return isset($_GET[$key]) ? (int) $_GET[$key] : $default;
}
