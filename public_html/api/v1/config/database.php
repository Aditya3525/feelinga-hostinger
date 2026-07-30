<?php
declare(strict_types=1);

/**
 * Database connection — MySQL only (Hostinger production)
 * Uses __DIR__ for reliable path resolution in any context.
 */

$pdo_instance = null;

function get_db(): PDO
{
    global $pdo_instance;
    if ($pdo_instance !== null) {
        return $pdo_instance;
    }

    $dbHost = env('DB_HOST', '');
    $dbName = env('DB_NAME', '');
    $dbUser = env('DB_USER', '');
    $dbPass = env('DB_PASS', '');

    if ($dbHost === '' || $dbName === '' || $dbUser === '') {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'status'  => 'error',
            'message' => 'Database is not configured. Please set DB_HOST, DB_NAME, DB_USER, DB_PASS in the .env file.',
        ]);
        exit(1);
    }

    $dsn = "mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        $pdo_instance = new PDO($dsn, $dbUser, $dbPass, $options);
    } catch (PDOException $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'status'  => 'error',
            'message' => 'MySQL connection failed: ' . $e->getMessage(),
        ]);
        exit(1);
    }

    return $pdo_instance;
}


function check_db_health(): array
{
    try {
        $db  = get_db();
        $stmt = $db->query('SELECT 1');
        if ($stmt->fetch()) {
            return ['status' => 'success', 'database' => 'connected'];
        }
    } catch (Exception $e) {
        return ['status' => 'error', 'database' => 'disconnected', 'message' => $e->getMessage()];
    }
    return ['status' => 'error', 'database' => 'unknown'];
}
