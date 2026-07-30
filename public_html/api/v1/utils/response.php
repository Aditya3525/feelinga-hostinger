<?php
declare(strict_types=1);

/**
 * JSON response helpers
 * Reference: Standard Express JSON response pattern
 */

/**
 * Send a success response
 */
function json_success(mixed $data = null, int $statusCode = 200): never
{
    http_response_code($statusCode);
    $response = ['status' => 'success'];
    if ($data !== null) {
        $response['data'] = $data;
    }
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Send a success response with results count (list endpoints)
 */
function json_list(array $data, int $totalResults, array $pagination = []): never
{
    http_response_code(200);
    $response = [
        'status' => 'success',
        'results' => count($data),
        'pagination' => $pagination,
        'data' => $data,
    ];
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Send an error response
 */
function json_error(string $message, int $statusCode = 400): never
{
    http_response_code($statusCode);
    echo json_encode([
        'status' => 'error',
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Send a 204 No Content response
 */
function json_no_content(): never
{
    http_response_code(204);
    exit;
}

/**
 * Send CSV response
 */
function send_csv(string $filename, string $header, array $rows): never
{
    http_response_code(200);
    header('Content-Type: text/csv');
    header("Content-Disposition: attachment; filename={$filename}");
    echo $header . "\n";
    foreach ($rows as $row) {
        echo $row . "\n";
    }
    exit;
}
