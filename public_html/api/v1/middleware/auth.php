<?php
declare(strict_types=1);

/**
 * JWT Authentication middleware
 * Reference: backend/src/middleware/auth.ts — authenticate() and authorize()
 *
 * Uses firebase/php-jwt for token verification.
 * Access token is read from httpOnly cookie (primary) or Authorization header (fallback).
 */

require_once __DIR__ . '/../vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * Authenticate the current request — sets $GLOBALS['current_user']
 * Returns the user array or sends 401 and exits.
 */
function authenticate(): array
{
    $token = extract_jwt_token();
    if (!$token) {
        json_error('Authentication required', 401);
    }

    $jwtSecret = env('JWT_SECRET');
    try {
        $decoded = JWT::decode($token, new Key($jwtSecret, 'HS256'));
    } catch (Exception $e) {
        json_error('Invalid or expired token', 401);
    }

    $db = get_db();
    $stmt = $db->prepare('SELECT id, name, email, role, phone, email_verified FROM users WHERE id = ?');
    $stmt->execute([(int) $decoded->id]);
    $user = $stmt->fetch();

    if (!$user) {
        json_error('User not found', 401);
    }

    $GLOBALS['current_user'] = $user;
    return $user;
}

/**
 * Require admin role
 */
function require_admin(): array
{
    $user = authenticate();
    if (($user['role'] ?? '') !== 'admin') {
        json_error('Admin access required', 403);
    }
    return $user;
}

/**
 * Get the currently authenticated user (returns null if not authenticated)
 */
function get_current_auth_user(): ?array
{
    if (isset($GLOBALS['current_user'])) {
        return $GLOBALS['current_user'];
    }

    $token = extract_jwt_token();
    if (!$token) {
        return null;
    }

    $jwtSecret = env('JWT_SECRET');
    try {
        $decoded = JWT::decode($token, new Key($jwtSecret, 'HS256'));
    } catch (Exception $e) {
        return null;
    }

    $db = get_db();
    $stmt = $db->prepare('SELECT id, name, email, role, phone, email_verified FROM users WHERE id = ?');
    $stmt->execute([(int) $decoded->id]);
    $user = $stmt->fetch();

    if ($user) {
        $GLOBALS['current_user'] = $user;
    }

    return $user;
}

/**
 * Sign a JWT access token
 * Reference: backend/src/modules/auth/controller.ts line 38-41
 */
function sign_access_token(array $user): string
{
    $now = time();
    $payload = [
        'iss' => 'feelinga-api',
        'iat' => $now,
        'exp' => $now + env_int('JWT_EXPIRES_IN', 900),
        'id' => (int) $user['id'],
        'role' => $user['role'] ?? 'customer',
    ];
    return JWT::encode($payload, env('JWT_SECRET'), 'HS256');
}

/**
 * Sign a JWT refresh token
 * Reference: backend/src/modules/auth/controller.ts line 43-46
 */
function sign_refresh_token(array $user): string
{
    $now = time();
    $payload = [
        'iss' => 'feelinga-api',
        'iat' => $now,
        'exp' => $now + env_int('JWT_REFRESH_EXPIRES_IN', 604800),
        'id' => (int) $user['id'],
    ];
    return JWT::encode($payload, env('JWT_REFRESH_SECRET'), 'HS256');
}

/**
 * Set auth cookies (matches backend/src/utils/cookies.ts)
 */
function set_auth_cookies(string $accessToken, string $refreshToken): void
{
    $isSecure = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ||
                (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ||
                (env('SITE_URL', '') !== '' && str_starts_with(env('SITE_URL'), 'https'));

    $sameSite = $isSecure ? 'Lax' : 'Lax';

    setcookie('access_token', $accessToken, [
        'expires'  => time() + env_int('JWT_EXPIRES_IN', 900),
        'path'     => '/',
        'secure'   => $isSecure,
        'httponly' => true,
        'samesite' => $sameSite,
    ]);

    setcookie('refresh_token', $refreshToken, [
        'expires'  => time() + env_int('JWT_REFRESH_EXPIRES_IN', 604800),
        'path'     => '/',
        'secure'   => $isSecure,
        'httponly' => true,
        'samesite' => $sameSite,
    ]);
}

/**
 * Clear auth cookies
 */
function clear_auth_cookies(): void
{
    setcookie('access_token', '', ['expires' => time() - 3600, 'path' => '/']);
    setcookie('refresh_token', '', ['expires' => time() - 3600, 'path' => '/']);
}

/**
 * Extract JWT from cookie or Authorization header
 */
function extract_jwt_token(): ?string
{
    // Primary: httpOnly cookie
    if (!empty($_COOKIE['access_token'])) {
        return $_COOKIE['access_token'];
    }

    // Fallback: Authorization header
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
        return $matches[1];
    }

    return null;
}

/**
 * Extract refresh token from cookie or body
 */
function extract_refresh_token(): ?string
{
    // From cookie
    if (!empty($_COOKIE['refresh_token'])) {
        return $_COOKIE['refresh_token'];
    }
    // From request body
    $body = get_request_body();
    return $body['refreshToken'] ?? null;
}
