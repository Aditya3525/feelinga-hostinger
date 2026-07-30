<?php
/**
 * TEMPORARY DIAGNOSTIC FILE - DELETE AFTER CONFIRMING LOGIN WORKS
 * Access: https://orangered-dogfish-506444.hostingersite.com/api/v1/diag.php
 */

// Search for .env in all likely Hostinger paths
$envPaths = [
    dirname(__DIR__, 4) . '/.env',                          // public_html/api/v1 -> root
    dirname(__DIR__, 5) . '/.env',                          // one more level up
    '/home/' . get_current_user() . '/feelinga-hostinger/.env',
    '/home/' . get_current_user() . '/.env',
    getcwd() . '/.env',
];

$envFound = false;
$envPath  = '';
$envVars  = [];

foreach ($envPaths as $p) {
    if (@file_exists($p)) {
        $envFound = true;
        $envPath  = $p;
        foreach (file($p, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) continue;
            [$k, $v] = explode('=', $line, 2);
            $envVars[trim($k)] = trim($v, " \t\n\r\0\x0B\"'");
        }
        break;
    }
}

$dbHost = $envVars['DB_HOST'] ?? '';
$dbUser = $envVars['DB_USER'] ?? '';
$dbPass = $envVars['DB_PASS'] ?? '';
$dbName = $envVars['DB_NAME'] ?? '';

$dbStatus  = 'not_tested';
$userCount = 0;
$errorMsg  = '';

if ($dbHost && $dbUser) {
    try {
        $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
        $dbStatus  = 'CONNECTED ✅';
        $userCount = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    } catch (Exception $e) {
        $dbStatus = 'ERROR ❌';
        $errorMsg = $e->getMessage();
    }
} else {
    $dbStatus = 'NO ENV VARS FOUND ❌ — .env file is missing or not loaded';
}

header('Content-Type: application/json');
echo json_encode([
    'env_file_found' => $envFound,
    'env_file_path'  => $envFound ? $envPath : 'NOT FOUND — searched: ' . implode(' | ', $envPaths),
    'db_host'        => $dbHost ?: '(empty)',
    'db_user'        => $dbUser ?: '(empty)',
    'db_name'        => $dbName ?: '(empty)',
    'db_status'      => $dbStatus,
    'user_count_in_db' => $userCount,
    'error'          => $errorMsg ?: null,
    'php_version'    => PHP_VERSION,
    'server_cwd'     => getcwd(),
    'this_file_dir'  => __DIR__,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
