<?php
/**
 * TEMPORARY DIAGNOSTIC FILE - DELETE AFTER USE
 * Access: https://orangered-dogfish-506444.hostingersite.com/api/v1/diag.php
 */

// Load env
$envPaths = [
    dirname(dirname(dirname(__DIR__))) . '/.env',
    dirname(getcwd()) . '/.env',
    getcwd() . '/.env',
    __DIR__ . '/../../../../.env',
    '/home/' . get_current_user() . '/.env',
];

$envFound = false;
$envPath = '';
foreach ($envPaths as $p) {
    if (file_exists($p)) {
        $envFound = true;
        $envPath = $p;
        break;
    }
}

// Parse env manually
$envVars = [];
if ($envFound) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if ($line[0] === '#' || !str_contains($line, '=')) continue;
        [$k, $v] = explode('=', $line, 2);
        $envVars[trim($k)] = trim($v);
    }
}

$dbHost = $envVars['DB_HOST'] ?? '';
$dbUser = $envVars['DB_USER'] ?? '';
$dbPass = $envVars['DB_PASS'] ?? '';
$dbName = $envVars['DB_NAME'] ?? '';

// Test DB
$dbStatus = 'not_tested';
$dbMode   = 'unknown';
$userCount = 0;
$errorMsg = '';

if ($dbHost && $dbUser && $dbUser !== 'your_db_user') {
    $dbMode = 'mysql';
    try {
        $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
        $dbStatus = 'connected';
        $userCount = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    } catch (Exception $e) {
        $dbStatus = 'error';
        $errorMsg = $e->getMessage();
    }
} else {
    $dbMode = 'sqlite_fallback';
    $dbStatus = 'fallback_active';
}

header('Content-Type: application/json');
echo json_encode([
    'env_file_found'  => $envFound,
    'env_file_path'   => $envFound ? $envPath : 'NOT FOUND - tried: ' . implode(', ', $envPaths),
    'db_mode'         => $dbMode,
    'db_host'         => $dbHost ?: '(empty)',
    'db_user'         => $dbUser ?: '(empty)',
    'db_name'         => $dbName ?: '(empty)',
    'db_status'       => $dbStatus,
    'user_count'      => $userCount,
    'error'           => $errorMsg,
    'php_version'     => PHP_VERSION,
    'cwd'             => getcwd(),
    'script_dir'      => __DIR__,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
