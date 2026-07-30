<?php
declare(strict_types=1);

/**
 * Orders Controller
 * Reference: backend/src/modules/orders/controller.ts (427 lines)
 */

function orders_create(): void
{
    $user = authenticate();
    $body = get_request_body();
    $items = $body['items'] ?? [];
    $shippingAddress = $body['shippingAddress'] ?? [];
    $paymentMethod = $body['paymentMethod'] ?? '';
    $couponCode = strtoupper(trim($body['couponCode'] ?? ''));
    $notes = $body['notes'] ?? null;

    if (empty($items)) json_error('Items are required', 400);
    if (!in_array($paymentMethod, PAYMENT_METHODS)) json_error('Invalid payment method', 400);

    $db = get_db();
    $db->beginTransaction();

    try {
        // Fetch products with lock
        $productIds = array_unique(array_map(fn($i) => (int)$i['productId'], $items));
        $ph = implode(',', array_fill(0, count($productIds), '?'));
        // MySQL: use FOR UPDATE for row-level lock during concurrent order creation
        $stmt = $db->prepare("SELECT * FROM products WHERE id IN ({$ph}) FOR UPDATE");
        $stmt->execute($productIds);
        $products = $stmt->fetchAll();
        $productMap = [];
        foreach ($products as $p) $productMap[$p['id']] = $p;

        // Build order items
        $orderItems = [];
        foreach ($items as $item) {
            $product = $productMap[(int)$item['productId']] ?? null;
            if (!$product) json_error("Product {$item['productId']} not found", 404);
            if (!$product['in_stock']) json_error("{$product['name']} is out of stock", 400);
            $priceMap = ['50g' => $product['price_50g'], '100g' => $product['price_100g'], '200g' => $product['price_200g']];
            $price = (float)($priceMap[$item['size'] ?? '100g'] ?? $product['price_100g']);
            if (!$price) json_error("Invalid size {$item['size']} for {$product['name']}", 400);
            $images = json_decode($product['images'] ?? '[]', true);
            $orderItems[] = [
                'product_id' => (int)$product['id'],
                'name' => $product['name'],
                'size' => $item['size'] ?? '100g',
                'price' => $price,
                'qty' => (int)$item['qty'],
                'image' => $images[0] ?? null,
            ];
        }

        $subtotal = array_sum(array_map(fn($i) => $i['price'] * $i['qty'], $orderItems));
        $shipping = $subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_RATE;
        $tax = round($subtotal * TAX_RATE);

        // Coupon validation
        $discount = 0;
        $appliedCoupon = null;
        if ($couponCode) {
            $stmt = $db->prepare('SELECT * FROM coupons WHERE code = ? AND active = 1 AND (valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP) AND (valid_to IS NULL OR valid_to >= CURRENT_TIMESTAMP)');
            $stmt->execute([$couponCode]);
            $coupon = $stmt->fetch();
            if (!$coupon) { $db->rollBack(); json_error('Invalid or expired coupon code', 400); }
            if ($coupon['usage_limit'] && $coupon['used_count'] >= $coupon['usage_limit']) { $db->rollBack(); json_error('Coupon usage limit reached', 400); }
            if ($subtotal < (float)$coupon['min_order_amount']) { $db->rollBack(); json_error("Minimum order amount for this coupon is ₹{$coupon['min_order_amount']}", 400); }

            if ($coupon['per_user_limit']) {
                $stmt = $db->prepare('SELECT COUNT(*) FROM orders WHERE user_id = ? AND coupon_code = ?');
                $stmt->execute([$user['id'], $coupon['code']]);
                if ((int)$stmt->fetchColumn() >= (int)$coupon['per_user_limit']) { $db->rollBack(); json_error('You have already used this coupon', 400); }
            }

            if ($coupon['discount_type'] === 'percentage') {
                $discount = round($subtotal * (float)$coupon['discount_value'] / 100);
                if ($coupon['max_discount']) $discount = min($discount, (float)$coupon['max_discount']);
            } else {
                $discount = (float)$coupon['discount_value'];
            }
            $appliedCoupon = $coupon['code'];
        }

        $total = $subtotal + $shipping + $tax - $discount;

        // Deduct stock
        foreach ($orderItems as $oi) {
            $stmt = $db->prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?');
            $stmt->execute([$oi['qty'], $oi['product_id'], $oi['qty']]);
            if ($stmt->rowCount() === 0) { $db->rollBack(); json_error("Insufficient stock for {$oi['name']}", 400); }
            // Auto mark out of stock
            $db->prepare('UPDATE products SET in_stock = 0 WHERE id = ? AND stock = 0 AND in_stock = 1')->execute([$oi['product_id']]);
        }

        // Generate order number
        $db->prepare("UPDATE counters SET seq = seq + 1 WHERE name = 'orderNumber'")->execute();
        $seq = (int)$db->query("SELECT seq FROM counters WHERE name = 'orderNumber'")->fetchColumn();
        $orderNumber = 'FLG-' . substr((string)($seq + 100000), -6);

        // Insert order
        $stmt = $db->prepare('INSERT INTO orders (user_id, order_number, subtotal, shipping, tax, discount, coupon_code, total, payment_method, payment_status, notes, ship_first_name, ship_last_name, ship_line1, ship_line2, ship_city, ship_state, ship_pincode, ship_phone) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        $stmt->execute([
            $user['id'], $orderNumber, $subtotal, $shipping, $tax, $discount, $appliedCoupon, $total,
            $paymentMethod, 'pending', $notes,
            $shippingAddress['firstName'] ?? '', $shippingAddress['lastName'] ?? '',
            $shippingAddress['line1'] ?? '', $shippingAddress['line2'] ?? null,
            $shippingAddress['city'] ?? '', $shippingAddress['state'] ?? '',
            $shippingAddress['pincode'] ?? '', $shippingAddress['phone'] ?? '',
        ]);
        $orderId = (int)$db->lastInsertId();

        // Insert order items
        $itemStmt = $db->prepare('INSERT INTO order_items (order_id, product_id, name, size, price, qty, image) VALUES (?,?,?,?,?,?,?)');
        foreach ($orderItems as $oi) {
            $itemStmt->execute([$orderId, $oi['product_id'], $oi['name'], $oi['size'], $oi['price'], $oi['qty'], $oi['image']]);
        }

        // Increment coupon usage
        if ($appliedCoupon && isset($coupon)) {
            $db->prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?')->execute([$coupon['id']]);
        }

        // SQLite doesn't support multi-table DELETE; use subquery
        $db->prepare('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = ?)')->execute([$user['id']]);

        $db->commit();

        // Fetch complete order
        $order = fetch_order_by_id($db, $orderId);

        // Send emails (non-blocking, errors logged)
        require_once __DIR__ . '/../../utils/email.php';
        try { send_order_confirmation_email($user['email'], $order); } catch (Exception $e) { error_log('Email error: ' . $e->getMessage()); }

        // Low stock alert
        $lowStockProducts = [];
        foreach ($orderItems as $oi) {
            $stmt = $db->prepare('SELECT name, slug, stock FROM products WHERE id = ? AND stock <= 10 AND deleted_at IS NULL');
            $stmt->execute([$oi['product_id']]);
            $low = $stmt->fetch();
            if ($low) $lowStockProducts[] = $low;
        }
        $adminEmail = env('ADMIN_EMAIL');
        if (!empty($lowStockProducts) && $adminEmail) {
            try { send_low_stock_alert($adminEmail, $lowStockProducts); } catch (Exception $e) { error_log('Low stock email error: ' . $e->getMessage()); }
        }

        http_response_code(201);
        echo json_encode(['status' => 'success', 'data' => $order], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
}

function orders_list(): void
{
    $user = authenticate();
    $db = get_db();
    $page = max(1, query_int('page', 1));
    $limit = min(50, max(1, query_int('limit', 10)));
    $status = query_string('status');
    $q = query_string('q');

    $where = [];
    $params = [];

    if ($user['role'] !== 'admin') {
        $where[] = 'o.user_id = ?';
        $params[] = $user['id'];
    }
    if ($status) { $where[] = 'o.status = ?'; $params[] = $status; }
    if ($q) {
        $regex = '%' . $q . '%';
        if ($user['role'] === 'admin') {
            $where[] = '(o.order_number LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
            $params = array_merge($params, [$regex, $regex, $regex]);
        } else {
            $where[] = 'o.order_number LIKE ?';
            $params[] = $regex;
        }
    }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $offset = ($page - 1) * $limit;

    $countStmt = $db->prepare("SELECT COUNT(*) FROM orders o LEFT JOIN users u ON o.user_id = u.id {$whereClause}");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $dataStmt = $db->prepare("SELECT o.*, u.name as user_name, u.email as user_email FROM orders o LEFT JOIN users u ON o.user_id = u.id {$whereClause} ORDER BY o.created_at DESC LIMIT {$limit} OFFSET {$offset}");
    $dataStmt->execute($params);
    $orders = $dataStmt->fetchAll();

    $formatted = array_map('format_order', $orders);

    json_list($formatted, count($formatted), [
        'page' => $page,
        'totalPages' => (int)ceil($total / $limit),
        'total' => $total,
    ]);
}

function orders_get_by_id(string $id): void
{
    $user = authenticate();
    $db = get_db();
    $order = fetch_order_by_id($db, (int)$id);
    if (!$order) json_error('Order not found', 404);
    if ($user['role'] !== 'admin' && (string)$order['user_id'] !== (string)$user['id']) json_error('Not authorized', 403);
    json_success($order);
}

function orders_cancel(string $id): void
{
    $user = authenticate();
    $db = get_db();
    $stmt = $db->prepare('SELECT * FROM orders WHERE id = ?');
    $stmt->execute([$id]);
    $order = $stmt->fetch();
    if (!$order) json_error('Order not found', 404);
    if ((string)$order['user_id'] !== (string)$user['id']) json_error('Not authorized', 403);
    if ($order['status'] !== 'pending') json_error('Order can only be cancelled while pending', 400);

    $body = get_request_body();
    $reason = $body['reason'] ?? 'Customer requested cancellation';
    $db->prepare('UPDATE orders SET status = ?, cancelled_at = CURRENT_TIMESTAMP, cancel_reason = ? WHERE id = ?')
       ->execute(['cancelled', $reason, $id]);

    restore_stock($db, (int)$id);
    rollback_coupon_usage($db, $order['coupon_code']);

    $order = fetch_order_by_id($db, (int)$id);
    json_success($order);
}

function orders_update_status(string $id): void
{
    $user = require_admin();
    $body = get_request_body();
    $status = $body['status'] ?? '';
    $validStatuses = ['pending','confirmed','processing','shipped','delivered','cancelled'];
    if (!in_array($status, $validStatuses)) json_error("Invalid status. Must be one of: " . implode(', ', $validStatuses), 400);

    $db = get_db();
    $stmt = $db->prepare('SELECT * FROM orders WHERE id = ?');
    $stmt->execute([$id]);
    $order = $stmt->fetch();
    if (!$order) json_error('Order not found', 404);

    $prev = $order['status'];
    if (!can_transition_status($prev, $status)) json_error("Invalid status transition from \"{$prev}\" to \"{$status}\"", 400);

    if ($status === 'cancelled' && $prev !== 'cancelled') {
        $db->prepare('UPDATE orders SET status = ?, cancelled_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([$status, $id]);
        restore_stock($db, (int)$id);
        rollback_coupon_usage($db, $order['coupon_code']);
    } else {
        $db->prepare('UPDATE orders SET status = ? WHERE id = ?')->execute([$status, $id]);
    }

    log_admin_action(['actor' => $user, 'action' => 'order.status_update', 'entityType' => 'order', 'entityId' => $id, 'summary' => "Updated {$order['order_number']} from \"{$prev}\" to \"{$status}\"", 'meta' => ['orderNumber' => $order['order_number'], 'previousStatus' => $prev, 'status' => $status]]);

    // Email notification
    $stmt = $db->prepare('SELECT email FROM users WHERE id = ?');
    $stmt->execute([$order['user_id']]);
    $orderUser = $stmt->fetch();
    if ($orderUser) {
        require_once __DIR__ . '/../../utils/email.php';
        $updatedOrder = fetch_order_by_id($db, (int)$id);
        try { send_order_status_email($orderUser['email'], $updatedOrder, $status); } catch (Exception $e) { error_log('Email error: ' . $e->getMessage()); }
    }

    json_success(fetch_order_by_id($db, (int)$id));
}

function orders_bulk_status(): void
{
    $user = require_admin();
    $body = get_request_body();
    $orderIds = $body['orderIds'] ?? $body['ids'] ?? [];
    $status = $body['status'] ?? '';

    if (empty($orderIds) || !$status) json_error('orderIds and status required', 400);

    $db = get_db();
    $ph = implode(',', array_fill(0, count($orderIds), '?'));
    $stmt = $db->prepare("SELECT * FROM orders WHERE id IN ({$ph})");
    $stmt->execute($orderIds);
    $orders = $stmt->fetchAll();

    foreach ($orders as $o) {
        if (!can_transition_status($o['status'], $status)) {
            json_error("Invalid status transition from \"{$o['status']}\" to \"{$status}\" for order {$o['order_number']}", 400);
        }
    }

    if ($status === 'cancelled') {
        foreach ($orders as $o) {
            if ($o['status'] !== 'cancelled') {
                restore_stock($db, (int)$o['id']);
                rollback_coupon_usage($db, $o['coupon_code']);
            }
        }
    }

    $stmt = $db->prepare("UPDATE orders SET status = ? WHERE id IN ({$ph})");
    $stmt->execute(array_merge([$status], $orderIds));
    $modified = $stmt->rowCount();

    log_admin_action(['actor' => $user, 'action' => 'order.bulk_status_update', 'entityType' => 'order', 'summary' => "Bulk updated {$modified} orders to \"{$status}\"", 'meta' => ['requested' => count($orderIds), 'modified' => $modified, 'status' => $status]]);

    json_success(['matched' => count($orderIds), 'modified' => $modified, 'status' => $status]);
}

function orders_invoice(string $id): void
{
    $user = authenticate();
    $db = get_db();
    $order = fetch_order_by_id($db, (int)$id);
    if (!$order) json_error('Order not found', 404);
    if ($user['role'] !== 'admin' && (string)$order['user_id'] !== (string)$user['id']) json_error('You are not authorized to access this invoice', 403);

    $stmt = $db->prepare('SELECT name, email, phone FROM users WHERE id = ?');
    $stmt->execute([$order['user_id']]);
    $orderUser = $stmt->fetch();

    require_once __DIR__ . '/../utils/pdf.php';
    generate_invoice_pdf($order, $orderUser);
}

// ===== HELPERS =====

function can_transition_status(string $from, string $to): bool
{
    if ($from === $to) return true;
    return in_array($to, ORDER_STATUS_TRANSITIONS[$from] ?? []);
}

function restore_stock(PDO $db, int $orderId): void
{
    $stmt = $db->prepare('SELECT product_id, qty FROM order_items WHERE order_id = ?');
    $stmt->execute([$orderId]);
    foreach ($stmt->fetchAll() as $item) {
        $db->prepare('UPDATE products SET stock = stock + ? WHERE id = ?')->execute([$item['qty'], $item['product_id']]);
        $db->prepare('UPDATE products SET in_stock = 1 WHERE id = ? AND stock > 0 AND in_stock = 0')->execute([$item['product_id']]);
    }
}

function rollback_coupon_usage(PDO $db, ?string $couponCode): void
{
    if (!$couponCode) return;
    $db->prepare('UPDATE coupons SET used_count = MAX(used_count - 1, 0) WHERE code = ?')->execute([$couponCode]);
}

function fetch_order_by_id(PDO $db, int $id): ?array
{
    $stmt = $db->prepare('SELECT o.*, u.name as user_name, u.email as user_email FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.id = ?');
    $stmt->execute([$id]);
    $order = $stmt->fetch();
    if (!$order) return null;

    $stmt = $db->prepare('SELECT oi.*, p.slug, p.images as product_images FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?');
    $stmt->execute([$id]);
    $order['items'] = $stmt->fetchAll();

    return format_order($order);
}

function format_order(array $o): array
{
    $items = [];
    foreach (($o['items'] ?? []) as $item) {
        $pImages = json_decode($item['product_images'] ?? '[]', true);
        $items[] = [
            'product' => ['_id' => (string)$item['product_id'], 'slug' => $item['slug'] ?? null, 'images' => $pImages],
            'name' => $item['name'],
            'size' => $item['size'],
            'price' => (float)$item['price'],
            'qty' => (int)$item['qty'],
            'image' => $item['image'],
        ];
    }

    return [
        '_id' => (string)$o['id'],
        'id' => (string)$o['id'],
        'user' => isset($o['user_name']) ? ['_id' => (string)$o['user_id'], 'name' => $o['user_name'], 'email' => $o['user_email']] : (string)$o['user_id'],
        'user_id' => (string)$o['user_id'],
        'orderNumber' => $o['order_number'],
        'items' => $items,
        'shippingAddress' => [
            'firstName' => $o['ship_first_name'],
            'lastName' => $o['ship_last_name'],
            'line1' => $o['ship_line1'],
            'line2' => $o['ship_line2'],
            'city' => $o['ship_city'],
            'state' => $o['ship_state'],
            'pincode' => $o['ship_pincode'],
            'phone' => $o['ship_phone'],
        ],
        'subtotal' => (float)$o['subtotal'],
        'shipping' => (float)$o['shipping'],
        'tax' => (float)$o['tax'],
        'discount' => (float)$o['discount'],
        'couponCode' => $o['coupon_code'],
        'total' => (float)$o['total'],
        'status' => $o['status'],
        'paymentMethod' => $o['payment_method'],
        'paymentStatus' => $o['payment_status'],
        'trackingNumber' => $o['tracking_number'],
        'trackingUrl' => $o['tracking_url'],
        'cancelledAt' => $o['cancelled_at'],
        'cancelReason' => $o['cancel_reason'],
        'notes' => $o['notes'],
        'createdAt' => $o['created_at'],
        'updatedAt' => $o['updated_at'],
    ];
}
