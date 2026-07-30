<?php
declare(strict_types=1);

/**
 * Token bucket rate limiter (file-based)
 * Reference: backend/src/app.ts — express-rate-limit
 */

$rate_limit_dir = sys_get_temp_dir() . '/feelinga_rate_limits';
if (!is_dir($rate_limit_dir)) {
    mkdir($rate_limit_dir, 0755, true);
}

/**
 * Check rate limit — returns true if allowed, false if over limit
 */
function check_rate_limit(string $key, int $maxRequests = 100, int $windowMs = 900000): bool
{
    global $rate_limit_dir;
    $windowSec = (int) ceil($windowMs / 1000);
    $file = $rate_limit_dir . '/' . md5($key) . '.rl';
    $now = time();

    // Get client IP for per-user rate limiting
    $clientIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $clientIp = explode(',', $clientIp)[0];
    $fullKey = $key . ':' . $clientIp;
    $file = $rate_limit_dir . '/' . md5($fullKey) . '.rl';

    $data = ['window_start' => $now, 'count' => 0];
    if (file_exists($file)) {
        $raw = @unserialize(file_get_contents($file));
        if (is_array($raw) && $now - ($raw['window_start'] ?? 0) < $windowSec) {
            $data = $raw;
        }
        // If window expired, start fresh
    }

    $data['count']++;

    if ($data['count'] > $maxRequests) {
        file_put_contents($file, serialize($data));
        return false;
    }

    file_put_contents($file, serialize($data));
    return true;
}

/**
 * Apply rate limiting — sends 429 and exits if exceeded
 */
function apply_rate_limit(string $key, int $maxRequests = 100, int $windowMs = 900000): void
{
    if (env('DISABLE_RATE_LIMIT', 'false') === 'true') {
        return;
    }
    if (!check_rate_limit($key, $maxRequests, $windowMs)) {
        $retryAfter = (int) ceil($windowMs / 1000);
        header("Retry-After: {$retryAfter}");
        json_error('Too many requests. Please try again later.', 429);
    }
}
