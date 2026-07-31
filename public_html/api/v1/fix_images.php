<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

$envPath = dirname(dirname(dirname(__DIR__))) . '/.env';
if (!file_exists($envPath)) $envPath = __DIR__ . '/../../../../.env';

require_once __DIR__ . '/config/env.php';
load_env($envPath);
require_once __DIR__ . '/config/constants.php';
require_once __DIR__ . '/config/database.php';

try {
    $db = get_db();
    $stmt = $db->query("SELECT id, name, images FROM products");
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $updateStmt = $db->prepare("UPDATE products SET images = ? WHERE id = ?");
    $fixed = 0;

    foreach ($products as $p) {
        $images = json_decode($p['images'] ?? '[]', true) ?: [];
        $changed = false;
        $newImages = [];

        foreach ($images as $img) {
            // Already correct API path - keep as is
            if (str_starts_with($img, '/api/v1/upload/images/')) {
                $newImages[] = $img;
                continue;
            }
            // Already correct static path - keep as is
            if (str_starts_with($img, '/images/')) {
                $newImages[] = $img;
                continue;
            }
            // Strip to just filename if it's a bare filename or relative path
            $filename = basename($img);
            // Only keep if it's actually in the uploads folder
            $uploadsPath = dirname(dirname(dirname(dirname(dirname(__DIR__))))) . '/feelinga_uploads/' . $filename;
            if (file_exists($uploadsPath)) {
                $newImages[] = '/api/v1/upload/images/' . $filename;
                $changed = true;
            } else {
                // Bad path - remove it
                echo "Removing invalid image '{$img}' from product #{$p['id']} ({$p['name']})\n";
                $changed = true;
                // Don't add to newImages - effectively removes it
            }
        }

        if ($changed) {
            $updateStmt->execute([json_encode($newImages), $p['id']]);
            $fixed++;
            echo "Fixed images for product #{$p['id']}: {$p['name']}\n";
        }
    }

    echo "\nDone! Fixed $fixed products.\n";
    echo "\nCurrent product images:\n";
    $stmt2 = $db->query("SELECT id, name, images FROM products");
    foreach ($stmt2->fetchAll(PDO::FETCH_ASSOC) as $p) {
        $imgs = json_decode($p['images'] ?? '[]', true) ?: [];
        echo "  #{$p['id']} {$p['name']}: " . (empty($imgs) ? '(no images)' : implode(', ', $imgs)) . "\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
