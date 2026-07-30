<?php
declare(strict_types=1);

/**
 * Cart Controller
 * Reference: backend/src/modules/cart/controller.ts (141 lines)
 */

function cart_get(): void
{
    $user = authenticate();
    $db = get_db();

    $stmt = $db->prepare('SELECT id FROM carts WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $cart = $stmt->fetch();

    if (!$cart) {
        json_success(['items' => [], 'subtotal' => 0, 'shipping' => FREE_SHIPPING_THRESHOLD > 0 ? FLAT_SHIPPING_RATE : 0, 'itemCount' => 0]);
        return;
    }

    $stmt = $db->prepare('
        SELECT ci.id, ci.product_id as productId, ci.size, ci.qty,
               p.name, p.type, p.slug, p.stock, p.in_stock as inStock,
               p.price_50g, p.price_100g, p.price_200g, p.images
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.cart_id = ?
    ');
    $stmt->execute([$cart['id']]);
    $rows = $stmt->fetchAll();

    $items = [];
    foreach ($rows as $row) {
        $priceMap = ['50g' => $row['price_50g'], '100g' => $row['price_100g'], '200g' => $row['price_200g']];
        $price = (float)($priceMap[$row['size']] ?? $row['price_100g']);
        $images = json_decode($row['images'] ?? '[]', true);
        $items[] = [
            'id' => (string)$row['id'],
            'productId' => (string)$row['productId'],
            'name' => $row['name'],
            'type' => $row['type'],
            'size' => $row['size'],
            'qty' => (int)$row['qty'],
            'price' => $price,
            'total' => $price * (int)$row['qty'],
            'image' => $images[0] ?? null,
            'slug' => $row['slug'],
            'stock' => (int)$row['stock'],
            'inStock' => (bool)$row['inStock'],
        ];
    }

    $subtotal = array_sum(array_column($items, 'total'));
    $shipping = $subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_RATE;
    $itemCount = array_sum(array_column($items, 'qty'));

    json_success(['items' => $items, 'subtotal' => $subtotal, 'shipping' => $shipping, 'itemCount' => $itemCount]);
}

function cart_add_item(): void
{
    $user = authenticate();
    $body = get_request_body();
    $productId = $body['productId'] ?? '';
    $size = $body['size'] ?? '100g';
    $qty = (int)($body['qty'] ?? 1);

    $db = get_db();

    $stmt = $db->prepare('SELECT id, stock, in_stock FROM products WHERE id = ? AND deleted_at IS NULL');
    $stmt->execute([$productId]);
    $product = $stmt->fetch();
    if (!$product) json_error('Product not found', 404);
    if (!$product['in_stock']) json_error('Product out of stock', 400);

    // Get or create cart
    $stmt = $db->prepare('SELECT id FROM carts WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $cart = $stmt->fetch();

    if (!$cart) {
        $db->prepare('INSERT INTO carts (user_id) VALUES (?)')->execute([$user['id']]);
        $cartId = (int)$db->lastInsertId();
    } else {
        $cartId = (int)$cart['id'];
    }

    // Check existing qty
    $stmt = $db->prepare('SELECT id, qty FROM cart_items WHERE cart_id = ? AND product_id = ? AND size = ?');
    $stmt->execute([$cartId, $productId, $size]);
    $existing = $stmt->fetch();
    $existingQty = $existing ? (int)$existing['qty'] : 0;

    if ($existingQty + $qty > (int)$product['stock']) {
        json_error("Only {$product['stock']} units available (you have {$existingQty} in cart)", 400);
    }

    if ($existing) {
        $db->prepare('UPDATE cart_items SET qty = qty + ? WHERE id = ?')
           ->execute([$qty, $existing['id']]);
    } else {
        $db->prepare('INSERT INTO cart_items (cart_id, product_id, size, qty) VALUES (?,?,?,?)')
           ->execute([$cartId, $productId, $size, $qty]);
    }

    json_success(['message' => 'Item added to cart'], 201);
}

function cart_update_item(string $itemId): void
{
    $user = authenticate();
    $body = get_request_body();
    $qty = (int)($body['qty'] ?? 0);
    if ($qty < 1) json_error('qty must be at least 1', 400);

    $db = get_db();
    $stmt = $db->prepare('SELECT ci.id, ci.product_id FROM cart_items ci JOIN carts c ON ci.cart_id = c.id WHERE ci.id = ? AND c.user_id = ?');
    $stmt->execute([$itemId, $user['id']]);
    $item = $stmt->fetch();
    if (!$item) json_error('Cart item not found', 404);

    $stmt = $db->prepare('SELECT stock FROM products WHERE id = ?');
    $stmt->execute([$item['product_id']]);
    $product = $stmt->fetch();
    if ($product && $qty > (int)$product['stock']) {
        json_error("Only {$product['stock']} units available", 400);
    }

    $db->prepare('UPDATE cart_items SET qty = ? WHERE id = ?')->execute([$qty, $itemId]);
    json_success(['message' => 'Cart updated']);
}

function cart_remove_item(string $itemId): void
{
    $user = authenticate();
    $db = get_db();
    $stmt = $db->prepare('DELETE FROM cart_items WHERE id = ? AND cart_id IN (SELECT id FROM carts WHERE user_id = ?)');
    $stmt->execute([$itemId, $user['id']]);
    if ($stmt->rowCount() === 0) json_error('Cart item not found', 404);
    json_success(['message' => 'Item removed']);
}

function cart_sync(): void
{
    $user = authenticate();
    $body = get_request_body();
    $items = $body['items'] ?? [];
    if (!is_array($items)) json_error('items must be an array', 400);

    $db = get_db();

    // Get or create cart
    $stmt = $db->prepare('SELECT id FROM carts WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $cart = $stmt->fetch();
    if (!$cart) {
        $db->prepare('INSERT INTO carts (user_id) VALUES (?)')->execute([$user['id']]);
        $cartId = (int)$db->lastInsertId();
    } else {
        $cartId = (int)$cart['id'];
    }

    // Resolve products
    $productIds = array_unique(array_filter(array_map(fn($i) => $i['productId'] ?? null, $items)));
    $slugs = array_unique(array_filter(array_map(fn($i) => $i['slug'] ?? null, $items)));

    $productMap = [];
    if (!empty($productIds)) {
        $ph = implode(',', array_fill(0, count($productIds), '?'));
        $stmt = $db->prepare("SELECT id, slug FROM products WHERE id IN ({$ph}) AND deleted_at IS NULL");
        $stmt->execute(array_values($productIds));
        foreach ($stmt->fetchAll() as $p) {
            $productMap[$p['id']] = $p;
            $productMap['slug:' . $p['slug']] = $p;
        }
    }
    if (!empty($slugs)) {
        $ph = implode(',', array_fill(0, count($slugs), '?'));
        $stmt = $db->prepare("SELECT id, slug FROM products WHERE slug IN ({$ph}) AND deleted_at IS NULL");
        $stmt->execute(array_values($slugs));
        foreach ($stmt->fetchAll() as $p) {
            $productMap['slug:' . $p['slug']] = $p;
        }
    }

    foreach ($items as $item) {
        $product = null;
        if (!empty($item['productId'])) $product = $productMap[$item['productId']] ?? null;
        if (!$product && !empty($item['slug'])) $product = $productMap['slug:' . $item['slug']] ?? null;
        if (!$product) continue;

        $size = $item['size'] ?? '100g';
        $qty = max(1, (int)($item['qty'] ?? 1));

        $stmt = $db->prepare('SELECT id, qty FROM cart_items WHERE cart_id = ? AND product_id = ? AND size = ?');
        $stmt->execute([$cartId, $product['id'], $size]);
        $existing = $stmt->fetch();

        if ($existing) {
            $newQty = max((int)$existing['qty'], $qty);
            $db->prepare('UPDATE cart_items SET qty = ? WHERE id = ?')->execute([$newQty, $existing['id']]);
        } else {
            $db->prepare('INSERT INTO cart_items (cart_id, product_id, size, qty) VALUES (?,?,?,?)')
               ->execute([$cartId, $product['id'], $size, $qty]);
        }
    }

    json_success(['message' => "Synced " . count($items) . " items"]);
}

function cart_clear(): void
{
    $user = authenticate();
    $db = get_db();
    $stmt = $db->prepare('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = ?)');
    $stmt->execute([$user['id']]);
    json_success(['message' => 'Cart cleared']);
}
