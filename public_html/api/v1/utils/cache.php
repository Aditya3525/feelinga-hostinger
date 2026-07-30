<?php
declare(strict_types=1);

/**
 * File-based cache
 * Reference: backend/src/utils/cache.ts — in-memory TTL cache
 * For shared hosting we use file-based caching since we can't keep process memory.
 */

$cache_dir = sys_get_temp_dir() . '/feelinga_cache';
if (!is_dir($cache_dir)) {
    mkdir($cache_dir, 0755, true);
}

// TTL constants (seconds) — matches backend/src/utils/cache.ts
define('TTL_PRODUCTS_LIST', 300);   // 5 minutes
define('TTL_PRODUCT_DETAIL', 300);  // 5 minutes
define('TTL_DASHBOARD', 120);       // 2 minutes
define('TTL_TESTIMONIALS', 600);    // 10 minutes
define('TTL_COUPON_CAMPAIGN', 60);  // 1 minute

/**
 * Get a cached value by key
 */
function cache_get(string $key): mixed
{
    global $cache_dir;
    $file = $cache_dir . '/' . md5($key) . '.cache';
    if (!file_exists($file)) {
        return null;
    }

    $data = unserialize(file_get_contents($file));
    if ($data === false || time() > $data['expires']) {
        @unlink($file);
        return null;
    }

    return $data['value'];
}

/**
 * Set a cached value with TTL in seconds
 */
function cache_set(string $key, mixed $value, int $ttl): void
{
    global $cache_dir;
    $file = $cache_dir . '/' . md5($key) . '.cache';
    $data = [
        'expires' => time() + $ttl,
        'value' => $value,
    ];
    file_put_contents($file, serialize($data));
}

/**
 * Invalidate all cache entries matching a prefix
 */
function cache_invalidate(string $prefix): void
{
    global $cache_dir;
    $files = glob($cache_dir . '/*.cache');
    if ($files === false) {
        return;
    }
    // Clear all cache files — catches products:*, admin:dashboard, etc.
    foreach ($files as $file) {
        @unlink($file);
    }
}

/**
 * Clear all cache
 */
function cache_clear(): void
{
    global $cache_dir;
    $files = glob($cache_dir . '/*.cache');
    if ($files !== false) {
        foreach ($files as $file) {
            @unlink($file);
        }
    }
}
