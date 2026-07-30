<?php
declare(strict_types=1);

/**
 * Environment loader — reads .env file into $_ENV / getenv()
 */

function load_env(string $path): void
{
    if (!file_exists($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') {
            continue;
        }

        $eqPos = strpos($line, '=');
        if ($eqPos === false) {
            continue;
        }

        $key = trim(substr($line, 0, $eqPos));
        $value = trim(substr($line, $eqPos + 1));

        // Strip surrounding quotes
        if (strlen($value) >= 2 && $value[0] === '"' && $value[strlen($value) - 1] === '"') {
            $value = substr($value, 1, -1);
        } elseif (strlen($value) >= 2 && $value[0] === "'" && $value[strlen($value) - 1] === "'") {
            $value = substr($value, 1, -1);
        }

        $_ENV[$key] = $value;
        putenv("$key=$value");
    }
}

/**
 * Get env var with optional default
 */
function env(string $key, string $default = ''): string
{
    return $_ENV[$key] ?? getenv($key) ?: $default;
}

/**
 * Get env var as integer
 */
function env_int(string $key, int $default = 0): int
{
    $value = env($key, (string) $default);
    return (int) $value;
}

/**
 * Get env var as boolean
 */
function env_bool(string $key, bool $default = false): bool
{
    $value = strtolower(env($key, $default ? 'true' : 'false'));
    return in_array($value, ['true', '1', 'yes', 'on'], true);
}
