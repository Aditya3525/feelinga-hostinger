<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

$envPath = dirname(dirname(dirname(__DIR__))) . '/.env';
if (!file_exists($envPath)) {
    $envPath = getcwd() . '/../../.env';
}
if (!file_exists($envPath)) {
    $envPath = __DIR__ . '/../../../../.env'; // Hostinger common structure
}

require_once __DIR__ . '/config/env.php';
load_env($envPath);
require_once __DIR__ . '/config/constants.php';
require_once __DIR__ . '/config/database.php';


try {
    $db = get_db();

    // 1. Add pricing_variants column if it doesn't exist
    try {
        $db->exec("ALTER TABLE products ADD COLUMN pricing_variants JSON DEFAULT NULL AFTER price_200g");
        echo "Added pricing_variants column.\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
            echo "Column pricing_variants already exists.\n";
        } else {
            throw $e;
        }
    }

    // 2. Migrate existing data
    $stmt = $db->query("SELECT id, price_50g, price_100g, price_200g, pricing_variants FROM products");
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $updateStmt = $db->prepare("UPDATE products SET pricing_variants = ? WHERE id = ?");

    $count = 0;
    foreach ($products as $p) {
        if (!$p['pricing_variants']) {
            $variants = [];
            if ($p['price_50g'] !== null) {
                $variants[] = ['weight' => '50g', 'price' => (float)$p['price_50g']];
            }
            if ($p['price_100g'] !== null) {
                $variants[] = ['weight' => '100g', 'price' => (float)$p['price_100g']];
            }
            if ($p['price_200g'] !== null) {
                $variants[] = ['weight' => '200g', 'price' => (float)$p['price_200g']];
            }

            if (!empty($variants)) {
                $updateStmt->execute([json_encode($variants), $p['id']]);
                $count++;
            }
        }
    }

    echo "Migrated prices for $count products.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
