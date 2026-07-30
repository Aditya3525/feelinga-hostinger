<?php
declare(strict_types=1);

/**
 * Upload Controller
 * Reference: backend/src/modules/upload/routes.ts (96 lines)
 */

$uploads_dir = realpath(__DIR__ . '/../../../../uploads/products');
if ($uploads_dir === false) {
    $uploads_dir = dirname(__DIR__, 6) . '/uploads/products';
}
if (!is_dir($uploads_dir)) {
    mkdir($uploads_dir, 0755, true);
}

function upload_images(): void
{
    $user = require_admin();

    if (empty($_FILES['images'])) json_error('No files uploaded', 400);

    $files = $_FILES['images'];
    $count = is_array($files['name']) ? count($files['name']) : 1;
    if ($count > MAX_UPLOAD_FILES) json_error("Maximum {$MAX_UPLOAD_FILES} files allowed", 400);

    global $uploads_dir;
    $urls = [];

    for ($i = 0; $i < $count; $i++) {
        $tmpName = is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
        $error = is_array($files['error']) ? $files['error'][$i] : $files['error'];
        $size = is_array($files['size']) ? $files['size'][$i] : $files['size'];
        $type = is_array($files['type']) ? $files['type'][$i] : $files['type'];
        $originalName = is_array($files['name']) ? $files['name'][$i] : $files['name'];

        if ($error !== UPLOAD_ERR_OK) {
            json_error("Upload error for file: {$originalName}", 400);
        }

        // Validate type
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
        if (!in_array($ext, $allowedExts)) {
            json_error("Only JPEG, PNG, WebP, GIF, and AVIF images are allowed. Got: {$ext}", 400);
        }

        // Validate size
        if ($size > MAX_UPLOAD_SIZE_BYTES) {
            json_error('File too large. Maximum 5MB per file.', 400);
        }

        // Generate random filename
        $filename = bin2hex(random_bytes(12)) . '.' . $ext;
        $dest = $uploads_dir . '/' . $filename;

        // Path traversal protection
        if (realpath($uploads_dir) && strpos(realpath($dest), realpath($uploads_dir)) !== 0) {
            json_error('Invalid file path', 400);
        }

        if (!move_uploaded_file($tmpName, $dest)) {
            json_error("Failed to save file: {$filename}", 500);
        }

        $urls[] = '/uploads/products/' . $filename;
    }

    echo json_encode([
        'status' => 'success',
        'data' => ['urls' => $urls, 'count' => count($urls)],
    ], JSON_UNESCAPED_UNICODE);
}

function upload_delete_image(): void
{
    $user = require_admin();
    $body = get_request_body();
    $url = $body['url'] ?? '';
    if (!$url || !is_string($url)) json_error('Image URL required', 400);

    $filename = basename($url);
    if (str_contains($filename, '..') || str_contains($filename, '/') || str_contains($filename, '\\')) {
        json_error('Invalid filename', 400);
    }

    global $uploads_dir;
    $filePath = $uploads_dir . '/' . $filename;

    // Path traversal protection
    if (realpath($uploads_dir) && realpath($filePath) && strpos(realpath($filePath), realpath($uploads_dir)) !== 0) {
        json_error('Invalid file path', 400);
    }

    if (file_exists($filePath)) {
        unlink($filePath);
    }

    json_success(['message' => 'Image deleted']);
}
