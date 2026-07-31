<?php
declare(strict_types=1);

/**
 * Products Controller
 * Reference: backend/src/modules/products/controller.ts (280 lines)
 */

/**
 * GET /products
 * Ref: controller.ts:10-77
 */
function products_list(): void
{
    $queryParams = $_GET;
    ksort($queryParams);
    $cacheKey = 'products:' . md5(json_encode($queryParams));
    $cached = cache_get($cacheKey);
    if ($cached) {
        echo json_encode($cached, JSON_UNESCAPED_UNICODE);
        return;
    }

    $type = query_string('type');
    $mood = null; // Mood filter removed — kept for API compat
    $caffeine = query_string('caffeine');
    $minPrice = query_string('minPrice');
    $maxPrice = query_string('maxPrice');
    $sort = query_string('sort', '-createdAt');
    $page = max(1, query_int('page', 1));
    $limit = min(50, max(1, query_int('limit', 12)));
    $q = query_string('q');
    $isNewArrival = query_string('isNewArrival');
    $isBestSeller = query_string('isBestSeller');
    $origin = query_string('origin');

    $where = ['deleted_at IS NULL'];
    $params = [];

    if ($type) { $where[] = 'type = ?'; $params[] = $type; }
    if ($caffeine) { $where[] = 'caffeine = ?'; $params[] = $caffeine; }
    if ($minPrice) { $where[] = 'price_100g >= ?'; $params[] = (float)$minPrice; }
    if ($maxPrice) { $where[] = 'price_100g <= ?'; $params[] = (float)$maxPrice; }
    if ($isNewArrival === 'true') { $where[] = 'is_new_arrival = 1'; }
    if ($isBestSeller === 'true') { $where[] = 'is_best_seller = 1'; }
    if ($origin) { $where[] = 'origin LIKE ?'; $params[] = '%' . $origin . '%'; }
    if ($q) { $like = '%' . $q . '%'; $where[] = '(name LIKE ? OR type LIKE ? OR description LIKE ?)'; $params[] = $like; $params[] = $like; $params[] = $like; }


    $whereClause = implode(' AND ', $where);

    $sortMap = [
        'price' => 'price_100g ASC',
        '-price' => 'price_100g DESC',
        'rating' => 'rating DESC',
        'name' => 'name ASC',
        'newest' => 'created_at DESC',
        '-createdAt' => 'created_at DESC',
        '-reviewCount' => 'review_count DESC',
        '-rating' => 'rating DESC',
    ];
    $orderBy = $sortMap[$sort] ?? 'created_at DESC';
    $offset = ($page - 1) * $limit;

    $db = get_db();

    $countStmt = $db->prepare("SELECT COUNT(*) FROM products WHERE {$whereClause}");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $dataStmt = $db->prepare("SELECT * FROM products WHERE {$whereClause} ORDER BY {$orderBy} LIMIT {$limit} OFFSET {$offset}");
    $dataStmt->execute($params);
    $products = $dataStmt->fetchAll();

    $formatted = array_map('format_product', $products);

    $response = [
        'status' => 'success',
        'results' => count($formatted),
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'totalPages' => (int) ceil($total / $limit),
            'total' => $total,
        ],
        'data' => $formatted,
    ];

    cache_set($cacheKey, $response, TTL_PRODUCTS_LIST);
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
}

/**
 * GET /products/search
 * Ref: controller.ts:80-108
 */
function products_search(): void
{
    $q = query_string('q');
    if (!$q || strlen(trim($q)) < 2) {
        json_error('Search query must be at least 2 characters', 400);
    }

    $db = get_db();
    $term = trim($q);

    // Search using LIKE (works on both MySQL and SQLite)
    $like = '%' . $term . '%';
    $stmt = $db->prepare('SELECT * FROM products WHERE deleted_at IS NULL AND (name LIKE ? OR type LIKE ? OR description LIKE ?) LIMIT 20');
    $stmt->execute([$like, $like, $like]);
    $products = $stmt->fetchAll();

    echo json_encode(['status' => 'success', 'results' => count($products), 'data' => array_map('format_product', $products)], JSON_UNESCAPED_UNICODE);
}

/**
 * GET /products/autocomplete
 * Ref: controller.ts:111-128
 */
function products_autocomplete(): void
{
    $q = query_string('q');
    if (!$q || strlen(trim($q)) < 1) {
        json_success([]);
        return;
    }

    $db = get_db();
    $like = trim($q) . '%';
    $stmt = $db->prepare("SELECT id as _id, name, slug, type, price_100g, SUBSTRING(images, 1, 500) as images FROM products WHERE deleted_at IS NULL AND name LIKE ? LIMIT 6");
    $stmt->execute([$like]);
    $suggestions = $stmt->fetchAll();

    foreach ($suggestions as &$s) {
        $s['prices'] = ['100g' => (float) $s['price_100g']];
        $imgs = json_decode($s['images'] ?? '[]', true);
        $s['images'] = $imgs ? [array_shift($imgs)] : [];
        unset($s['price_100g']);
    }

    json_success($suggestions);
}

/**
 * GET /products/:slug
 * Ref: controller.ts:131-139
 */
function products_get_by_slug(string $slug): void
{
    $db = get_db();
    $stmt = $db->prepare('SELECT * FROM products WHERE slug = ? AND deleted_at IS NULL');
    $stmt->execute([$slug]);
    $product = $stmt->fetch();

    if (!$product) json_error('Product not found', 404);

    json_success(format_product($product));
}

/**
 * POST /products (admin)
 * Ref: controller.ts:142-189
 */
function products_create(): void
{
    $user = require_admin();
    $body = get_request_body();
    $slug = strtolower(trim($body['slug'] ?? ''));
    if (!$slug) json_error('Slug is required', 400);

    $db = get_db();

    // Check existing (including soft-deleted)
    $stmt = $db->prepare('SELECT id, deleted_at FROM products WHERE slug = ?');
    $stmt->execute([$slug]);
    $existing = $stmt->fetch();

    $stock = isset($body['stock']) ? (int)$body['stock'] : 100;
    $inStock = $stock > 0 ? 1 : 0;

    $pricingVariants = null;
    if (isset($body['sizes']) && is_array($body['sizes'])) {
        $pricingVariants = json_encode($body['sizes']);
    } else {
        // Fallback for old clients
        $sizes = [];
        if (isset($body['prices']['50g'])) $sizes[] = ['weight' => '50g', 'price' => (float)$body['prices']['50g']];
        if (isset($body['prices']['100g'])) $sizes[] = ['weight' => '100g', 'price' => (float)$body['prices']['100g']];
        if (isset($body['prices']['200g'])) $sizes[] = ['weight' => '200g', 'price' => (float)$body['prices']['200g']];
        if (!empty($sizes)) $pricingVariants = json_encode($sizes);
    }
    
    // Determine a base price for sorting
    $basePrice = 0;
    if (isset($body['prices']['100g'])) {
        $basePrice = (float)$body['prices']['100g'];
    } elseif (isset($body['sizes']) && is_array($body['sizes']) && count($body['sizes']) > 0) {
        $basePrice = (float)$body['sizes'][0]['price'];
    }

    $data = [
        $slug,
        $body['name'] ?? '',
        $body['type'] ?? 'Black Tea',
        $body['description'] ?? '',
        $body['shortDescription'] ?? null,
        isset($body['prices']['50g']) ? (float)$body['prices']['50g'] : null,
        $basePrice,
        isset($body['prices']['200g']) ? (float)$body['prices']['200g'] : null,
        $pricingVariants,
        isset($body['moods']) ? json_encode($body['moods']) : null,
        $body['origin'] ?? '',
        $body['caffeine'] ?? 'medium',
        isset($body['tastingNotes']) ? json_encode($body['tastingNotes']) : null,
        $body['brewingInstructions']['temperature'] ?? null,
        $body['brewingInstructions']['steepTime'] ?? null,
        $body['brewingInstructions']['amount'] ?? null,
        isset($body['brewingInstructions']['steps']) ? json_encode($body['brewingInstructions']['steps']) : null,
        isset($body['images']) ? json_encode($body['images']) : null,
        $stock,
        $inStock,
        !empty($body['isBestSeller']) ? 1 : 0,
        !empty($body['isNewArrival']) ? 1 : 0,
        isset($body['tags']) ? json_encode($body['tags']) : null,
    ];

    if ($existing && $existing['deleted_at']) {
        // Restore soft-deleted product
        $stmt = $db->prepare('UPDATE products SET slug=?, name=?, type=?, description=?, short_description=?, price_50g=?, price_100g=?, price_200g=?, pricing_variants=?, moods=?, origin=?, caffeine=?, tasting_notes=?, brewing_temperature=?, brewing_steep_time=?, brewing_amount=?, brewing_steps=?, images=?, stock=?, in_stock=?, is_best_seller=?, is_new_arrival=?, tags=?, deleted_at=NULL WHERE id=?');
        $data[] = $existing['id'];
        $stmt->execute($data);
        cache_invalidate('products:');
        log_admin_action(['actor' => $user, 'action' => 'product.restore', 'entityType' => 'product', 'entityId' => (string)$existing['id'], 'summary' => "Restored product \"{$body['name']}\"", 'meta' => ['slug' => $slug]]);
        $product = $db->query("SELECT * FROM products WHERE id = {$existing['id']}")->fetch();
    } elseif ($existing) {
        json_error('A product with this slug already exists. Please use a different name or slug.', 409);
    } else {
        $placeholders = str_repeat('?,', count($data) - 1) . '?';
        $stmt = $db->prepare("INSERT INTO products (slug, name, type, description, short_description, price_50g, price_100g, price_200g, pricing_variants, moods, origin, caffeine, tasting_notes, brewing_temperature, brewing_steep_time, brewing_amount, brewing_steps, images, stock, in_stock, is_best_seller, is_new_arrival, tags) VALUES ({$placeholders})");
        $stmt->execute($data);
        $newId = (int) $db->lastInsertId();
        cache_invalidate('products:');
        log_admin_action(['actor' => $user, 'action' => 'product.create', 'entityType' => 'product', 'entityId' => (string)$newId, 'summary' => "Created product \"{$body['name']}\"", 'meta' => ['slug' => $slug]]);
        $product = $db->query("SELECT * FROM products WHERE id = {$newId}")->fetch();
    }

    http_response_code(201);
    echo json_encode(['status' => 'success', 'data' => format_product($product)], JSON_UNESCAPED_UNICODE);
}

/**
 * PATCH /products/:id (admin)
 * Ref: controller.ts:236-259
 */
function products_update(string $id): void
{
    $user = require_admin();
    $body = get_request_body();
    $db = get_db();

    $allowed = ['name','type','description','short_description','price_50g','price_100g','price_200g','pricing_variants','moods','origin','caffeine','tasting_notes','brewing_temperature','brewing_steep_time','brewing_amount','brewing_steps','images','stock','in_stock','is_best_seller','is_new_arrival','tags','slug'];

    $updates = [];
    $params = [];
    $fieldMap = [
        'shortDescription' => 'short_description',
        'isBestSeller' => 'is_best_seller',
        'isNewArrival' => 'is_new_arrival',
        'inStock' => 'in_stock',
        'tastingNotes' => 'tasting_notes',
        'brewingInstructions' => null, // handled separately
    ];

    foreach ($body as $key => $value) {
        $dbKey = $fieldMap[$key] ?? $key;
        if ($dbKey === null) continue;
        // Convert camelCase for prices
        if ($key === 'sizes') {
            $updates[] = 'pricing_variants = ?';
            $params[] = json_encode($value);
            if (is_array($value) && count($value) > 0) {
                $updates[] = 'price_100g = ?';
                $params[] = (float)$value[0]['price'];
            }
            continue;
        }
        if ($key === 'prices') {
            if (isset($value['50g'])) { $updates[] = 'price_50g = ?'; $params[] = (float)$value['50g']; }
            if (isset($value['100g'])) { $updates[] = 'price_100g = ?'; $params[] = (float)$value['100g']; }
            if (isset($value['200g'])) { $updates[] = 'price_200g = ?'; $params[] = (float)$value['200g']; }
            continue;
        }
        if ($key === 'brewingInstructions') {
            if (isset($value['temperature'])) { $updates[] = 'brewing_temperature = ?'; $params[] = $value['temperature']; }
            if (isset($value['steepTime'])) { $updates[] = 'brewing_steep_time = ?'; $params[] = $value['steepTime']; }
            if (isset($value['amount'])) { $updates[] = 'brewing_amount = ?'; $params[] = $value['amount']; }
            if (isset($value['steps'])) { $updates[] = 'brewing_steps = ?'; $params[] = json_encode($value['steps']); }
            continue;
        }
        if (!in_array($dbKey, $allowed)) continue;

        if (is_array($value)) { $value = json_encode($value); }
        if (is_bool($value)) { $value = $value ? 1 : 0; }
        $updates[] = "`{$dbKey}` = ?";
        $params[] = $value;
    }

    // Auto-update in_stock based on stock
    if (isset($body['stock'])) {
        $stock = (int)$body['stock'];
        $updates[] = 'in_stock = ?';
        $params[] = $stock > 0 ? 1 : 0;
    }

    if (empty($updates)) json_error('No fields to update', 400);

    $params[] = $id;
    $sql = 'UPDATE products SET ' . implode(', ', $updates) . ' WHERE id = ?';
    $db->prepare($sql)->execute($params);

    cache_invalidate('products:');
    log_admin_action(['actor' => $user, 'action' => 'product.update', 'entityType' => 'product', 'entityId' => $id, 'summary' => "Updated product", 'meta' => ['fields' => array_keys($body)]]);

    $product = $db->query("SELECT * FROM products WHERE id = " . (int)$id)->fetch();
    if (!$product) json_error('Product not found', 404);
    json_success(format_product($product));
}

/**
 * DELETE /products/:id (admin, soft delete)
 * Ref: controller.ts:262-279
 */
function products_remove(string $id): void
{
    $user = require_admin();
    $db = get_db();
    $stmt = $db->prepare("UPDATE products SET deleted_at = NOW() WHERE id = ?");
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) json_error('Product not found', 404);

    cache_invalidate('products:');
    log_admin_action(['actor' => $user, 'action' => 'product.delete', 'entityType' => 'product', 'entityId' => $id, 'summary' => 'Soft-deleted product', 'meta' => []]);
    json_no_content();
}

/**
 * PATCH /products/bulk-stock (admin)
 * Ref: controller.ts:192-211
 */
function products_bulk_stock(): void
{
    $user = require_admin();
    $body = get_request_body();
    $productIds = $body['productIds'] ?? [];
    $stock = (int)($body['stock'] ?? 0);
    $inStock = $stock > 0 ? 1 : 0;

    if (empty($productIds)) json_error('productIds required', 400);

    $db = get_db();
    $placeholders = implode(',', array_fill(0, count($productIds), '?'));
    $stmt = $db->prepare("UPDATE products SET stock = ?, in_stock = ? WHERE id IN ({$placeholders})");
    $stmt->execute(array_merge([$stock, $inStock], $productIds));
    $modified = $stmt->rowCount();

    cache_invalidate('products:');
    log_admin_action(['actor' => $user, 'action' => 'product.bulk_stock_update', 'entityType' => 'product', 'summary' => "Bulk updated stock for {$modified} products", 'meta' => ['requested' => count($productIds), 'modified' => $modified, 'stock' => $stock]]);

    json_success(['matched' => count($productIds), 'modified' => $modified, 'stock' => $stock]);
}

/**
 * DELETE /products/bulk (admin)
 * Ref: controller.ts:214-233
 */
function products_bulk_delete(): void
{
    $user = require_admin();
    $body = get_request_body();
    $productIds = $body['productIds'] ?? [];

    if (empty($productIds)) json_error('productIds required', 400);

    $db = get_db();
    $placeholders = implode(',', array_fill(0, count($productIds), '?'));
    $stmt = $db->prepare("UPDATE products SET deleted_at = NOW() WHERE id IN ({$placeholders})");
    $stmt->execute($productIds);
    $modified = $stmt->rowCount();

    cache_invalidate('products:');
    log_admin_action(['actor' => $user, 'action' => 'product.bulk_delete', 'entityType' => 'product', 'summary' => "Bulk soft-deleted {$modified} products", 'meta' => ['requested' => count($productIds), 'modified' => $modified]]);

    json_success(['deleted' => $modified, 'modified' => $modified]);
}

// ===== FORMAT HELPER =====

function format_product(array $p): array
{
    return [
        '_id' => (string) $p['id'],
        'id' => (string) $p['id'],
        'slug' => $p['slug'],
        'name' => $p['name'],
        'type' => $p['type'],
        'description' => $p['description'],
        'shortDescription' => $p['short_description'],
        'prices' => [
            '50g' => $p['price_50g'] !== null ? (float)$p['price_50g'] : null,
            '100g' => (float) $p['price_100g'],
            '200g' => $p['price_200g'] !== null ? (float)$p['price_200g'] : null,
        ],
        'sizes' => json_decode($p['pricing_variants'] ?? '[]', true) ?: [],
        'price' => (float) $p['price_100g'],
        'moods' => json_decode($p['moods'] ?? '[]', true) ?: [],
        'origin' => $p['origin'],
        'caffeine' => $p['caffeine'],
        'tastingNotes' => json_decode($p['tasting_notes'] ?? '[]', true) ?: [],
        'brewingInstructions' => [
            'temperature' => $p['brewing_temperature'],
            'steepTime' => $p['brewing_steep_time'],
            'amount' => $p['brewing_amount'],
            'steps' => json_decode($p['brewing_steps'] ?? '[]', true) ?: [],
        ],
        'images' => json_decode($p['images'] ?? '[]', true) ?: [],
        'rating' => (float) $p['rating'],
        'reviewCount' => (int) $p['review_count'],
        'inStock' => (bool) $p['in_stock'],
        'stock' => (int) $p['stock'],
        'isBestSeller' => (bool) $p['is_best_seller'],
        'isNewArrival' => (bool) $p['is_new_arrival'],
        'tags' => json_decode($p['tags'] ?? '[]', true) ?: [],
        'createdAt' => $p['created_at'],
        'updatedAt' => $p['updated_at'],
    ];
}
