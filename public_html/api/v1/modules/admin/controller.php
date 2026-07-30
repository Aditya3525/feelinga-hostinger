<?php
declare(strict_types=1);

/**
 * Admin Controller
 * Reference: backend/src/modules/admin/controller.ts (286 lines)
 */

function admin_dashboard(): void
{
    $user = require_admin();
    $db = get_db();
    $cacheKey = 'admin:dashboard';
    $cached = cache_get($cacheKey);
    if ($cached) { echo json_encode($cached, JSON_UNESCAPED_UNICODE); return; }

    $totalUsers = (int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn();
    $totalProducts = (int)$db->query('SELECT COUNT(*) FROM products WHERE deleted_at IS NULL')->fetchColumn();
    $totalOrders = (int)$db->query('SELECT COUNT(*) FROM orders')->fetchColumn();
    $revenueResult = $db->query('SELECT COALESCE(SUM(total),0) as totalRevenue FROM orders')->fetch();
    $revenue = (float)($revenueResult['totalRevenue'] ?? 0);

    $statusAgg = $db->query("SELECT status, COUNT(*) as count FROM orders GROUP BY status")->fetchAll();
    $statusBreakdown = [];
    foreach ($statusAgg as $row) $statusBreakdown[$row['status']] = (int)$row['count'];

    require_once __DIR__ . '/../orders/controller.php';
    $recentOrdersRaw = $db->query("SELECT o.*, u.name as user_name, u.email as user_email FROM orders o LEFT JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC LIMIT 5")->fetchAll();
    $recentOrders = array_map('format_order', $recentOrdersRaw);

    // MySQL only — YEAR() / MONTH() functions
    $monthlyRaw = $db->query("SELECT YEAR(created_at) as y, MONTH(created_at) as m, SUM(total) as revenue, COUNT(*) as orders FROM orders GROUP BY y, m ORDER BY y DESC, m DESC LIMIT 6")->fetchAll();

    $monthlyRevenue = [];
    foreach ($monthlyRaw as $r) {
        $monthlyRevenue[] = [
            '_id' => ['year' => (int)$r['y'], 'month' => (int)$r['m']],
            'revenue' => (float)$r['revenue'],
            'orders' => (int)$r['orders'],
        ];
    }

    $activityRaw = $db->query("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 8")->fetchAll();
    $recentActivity = array_map(function($a) {
        return [
            '_id' => (string)$a['id'],
            'id' => (string)$a['id'],
            'actorId' => (string)$a['actor_id'],
            'actorName' => $a['actor_name'],
            'actorRole' => $a['actor_role'],
            'action' => $a['action'],
            'entityType' => $a['entity_type'],
            'entityId' => $a['entity_id'],
            'summary' => $a['summary'],
            'meta' => json_decode($a['meta'] ?? '{}', true),
            'createdAt' => $a['created_at'],
            'created_at' => $a['created_at'],
        ];
    }, $activityRaw);

    $response = [
        'status' => 'success',
        'data' => [
            'totals' => ['users' => $totalUsers, 'products' => $totalProducts, 'orders' => $totalOrders, 'revenue' => $revenue],
            'statusBreakdown' => $statusBreakdown,
            'recentOrders' => $recentOrders,
            'monthlyRevenue' => $monthlyRevenue,
            'recentActivity' => $recentActivity,
        ],
    ];
    cache_set($cacheKey, $response, TTL_DASHBOARD);
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
}

function admin_activity(): void
{
    require_admin();
    $db = get_db();
    $page = max(1, query_int('page', 1));
    $limit = min(100, max(1, query_int('limit', 20)));
    $offset = ($page - 1) * $limit;
    $total = (int)$db->query('SELECT COUNT(*) FROM audit_log')->fetchColumn();
    $stmt = $db->prepare("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT {$limit} OFFSET {$offset}");
    $stmt->execute();
    $rows = $stmt->fetchAll();
    $formatted = array_map(function($a) {
        return [
            '_id' => (string)$a['id'],
            'id' => (string)$a['id'],
            'actorId' => (string)$a['actor_id'],
            'actorName' => $a['actor_name'],
            'actorRole' => $a['actor_role'],
            'action' => $a['action'],
            'entityType' => $a['entity_type'],
            'entityId' => $a['entity_id'],
            'summary' => $a['summary'],
            'meta' => json_decode($a['meta'] ?? '{}', true),
            'createdAt' => $a['created_at'],
            'created_at' => $a['created_at'],
        ];
    }, $rows);
    json_list($formatted, $total, ['page' => $page, 'limit' => $limit, 'totalPages' => (int)ceil($total / $limit), 'total' => $total]);
}

function admin_list_users(): void
{
    require_admin();
    $db = get_db();
    $page = max(1, query_int('page', 1));
    $limit = min(100, max(1, query_int('limit', 20)));
    $q = query_string('q');
    $role = query_string('role');
    $offset = ($page - 1) * $limit;

    $where = []; $params = [];
    if ($role && in_array($role, ['customer', 'admin'])) { $where[] = 'u.role = ?'; $params[] = $role; }
    if ($q) {
        $regex = '%' . $q . '%';
        $where[] = '(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
        $params = array_merge($params, [$regex, $regex, $regex]);
    }
    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $cnt = $db->prepare("SELECT COUNT(*) FROM users u {$whereClause}");
    $cnt->execute($params);
    $total = (int)$cnt->fetchColumn();

    $stmt = $db->prepare("SELECT u.id, u.name, u.email, u.role, u.phone, u.created_at as createdAt FROM users u {$whereClause} ORDER BY u.created_at DESC LIMIT {$limit} OFFSET {$offset}");
    $stmt->execute($params);
    $users = $stmt->fetchAll();

    // Get order counts and total spent per user
    $userIds = array_map(fn($u) => $u['id'], $users);
    $orderStats = [];
    if (!empty($userIds)) {
        $ph = implode(',', array_fill(0, count($userIds), '?'));
        $statStmt = $db->prepare("SELECT user_id, COUNT(*) as orderCount, COALESCE(SUM(total),0) as totalSpent FROM orders WHERE user_id IN ({$ph}) GROUP BY user_id");
        $statStmt->execute($userIds);
        foreach ($statStmt->fetchAll() as $s) $orderStats[$s['user_id']] = $s;
    }

    foreach ($users as &$u) {
        $u['orderCount'] = $orderStats[$u['id']]['orderCount'] ?? 0;
        $u['totalSpent'] = (float)($orderStats[$u['id']]['totalSpent'] ?? 0);
        // Load addresses
        $aStmt = $db->prepare('SELECT * FROM addresses WHERE user_id = ?');
        $aStmt->execute([$u['id']]);
        $u['addresses'] = $aStmt->fetchAll();
    }

    json_list($users, $total, ['page' => $page, 'totalPages' => (int)ceil($total / $limit), 'total' => $total]);
}

function admin_get_user(string $id): void
{
    require_admin();
    $db = get_db();
    $stmt = $db->prepare('SELECT id, name, email, role, phone, created_at as createdAt FROM users WHERE id = ?');
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    if (!$user) json_error('User not found', 404);

    $stmt = $db->prepare('SELECT * FROM addresses WHERE user_id = ?');
    $stmt->execute([$id]);
    $user['addresses'] = $stmt->fetchAll();

    $stmt = $db->prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20');
    $stmt->execute([$id]);
    $user['orders'] = $stmt->fetchAll();

    json_success($user);
}

function admin_change_role(string $id): void
{
    $user = require_admin();
    $body = get_request_body();
    $role = $body['role'] ?? '';
    if (!in_array($role, ['customer', 'admin'])) json_error('Role must be customer or admin', 400);

    $db = get_db();
    $target = $db->query("SELECT id, email, role FROM users WHERE id = " . (int)$id)->fetch();
    if (!$target) json_error('User not found', 404);

    $adminEmail = strtolower(env('ADMIN_EMAIL'));
    if ($role === 'customer' && $adminEmail && strtolower($target['email']) === $adminEmail) {
        json_error('Cannot demote the primary admin account', 400);
    }

    $db->prepare('UPDATE users SET role = ? WHERE id = ?')->execute([$role, $id]);
    log_admin_action(['actor' => $user, 'action' => 'user.role_change', 'entityType' => 'user', 'entityId' => $id, 'summary' => "Changed {$target['email']} role from {$target['role']} to {$role}", 'meta' => ['previousRole' => $target['role'], 'newRole' => $role]]);

    $updated = $db->query("SELECT id, name, email, role FROM users WHERE id = " . (int)$id)->fetch();
    json_success($updated);
}

function admin_low_stock(): void
{
    require_admin();
    $db = get_db();
    $threshold = query_int('threshold', 10);
    $stmt = $db->prepare("SELECT id as _id, name, slug, stock, type, images, price_50g, price_100g, price_200g FROM products WHERE stock <= ? AND deleted_at IS NULL ORDER BY stock ASC");
    $stmt->execute([$threshold]);
    $products = $stmt->fetchAll();
    foreach ($products as &$p) {
        $p['images'] = json_decode($p['images'] ?? '[]', true);
        $p['prices'] = ['50g' => $p['price_50g'] ? (float)$p['price_50g'] : null, '100g' => (float)$p['price_100g'], '200g' => $p['price_200g'] ? (float)$p['price_200g'] : null];
        unset($p['price_50g'], $p['price_100g'], $p['price_200g']);
    }
    echo json_encode(['status' => 'success', 'data' => $products, 'count' => count($products), 'threshold' => $threshold], JSON_UNESCAPED_UNICODE);
}

function admin_export_orders(): void
{
    $user = require_admin();
    $db = get_db();
    log_admin_action(['actor' => $user, 'action' => 'export.orders', 'entityType' => 'order', 'summary' => 'Exported orders CSV']);

    $status = query_string('status');
    $from = query_string('from');
    $to = query_string('to');
    $where = []; $params = [];
    if ($status) { $where[] = 'o.status = ?'; $params[] = $status; }
    if ($from) { $where[] = 'o.created_at >= ?'; $params[] = $from; }
    if ($to) { $where[] = 'o.created_at <= ?'; $params[] = $to; }
    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $stmt = $db->prepare("SELECT o.*, u.name as user_name, u.email as user_email FROM orders o LEFT JOIN users u ON o.user_id = u.id {$whereClause} ORDER BY o.created_at DESC");
    $stmt->execute($params);
    $orders = $stmt->fetchAll();

    $header = 'Order Number,Date,Customer,Email,Items,Subtotal,Shipping,Tax,Total,Status,Payment Method,Payment Status';
    $rows = array_map(function($o) {
        $items = $o['items'] ?? '';
        return [$o['order_number'], date('Y-m-d', strtotime($o['created_at'])), '"' . ($o['user_name'] ?? 'N/A') . '"', $o['user_email'] ?? '', '"' . $items . '"', $o['subtotal'], $o['shipping'], $o['tax'], $o['total'], $o['status'], $o['payment_method'], $o['payment_status']];
    }, $orders);

    $csvRows = array_map(function($r) { return implode(',', $r); }, $rows);
    send_csv("orders-" . time() . ".csv", $header, $csvRows);
}

function admin_export_products(): void
{
    $user = require_admin();
    $db = get_db();
    log_admin_action(['actor' => $user, 'action' => 'export.products', 'entityType' => 'product', 'summary' => 'Exported products CSV']);

    $products = $db->query("SELECT * FROM products WHERE deleted_at IS NULL ORDER BY created_at DESC")->fetchAll();
    $header = 'Name,Slug,Type,Origin,Price 50g,Price 100g,Price 200g,Stock,In Stock,Caffeine,Moods,Rating,Review Count,Created';
    $rows = array_map(function($p) {
        return ['"' . $p['name'] . '"', $p['slug'], $p['type'], '"' . $p['origin'] . '"', $p['price_50g'] ?? '', $p['price_100g'], $p['price_200g'] ?? '', $p['stock'], $p['in_stock'] ? '1' : '0', $p['caffeine'], '"' . ($p['moods'] ?? '') . '"', $p['rating'], $p['review_count'], date('Y-m-d', strtotime($p['created_at']))];
    }, $products);
    $csvRows = array_map(function($r) { return implode(',', $r); }, $rows);
    send_csv("products-" . time() . ".csv", $header, $csvRows);
}

function admin_export_users(): void
{
    $user = require_admin();
    $db = get_db();
    log_admin_action(['actor' => $user, 'action' => 'export.users', 'entityType' => 'user', 'summary' => 'Exported users CSV (contains PII)']);

    $users = $db->query("SELECT name, email, role, phone, created_at FROM users ORDER BY created_at DESC")->fetchAll();
    $header = 'Name,Email,Role,Phone,Created';
    $rows = array_map(function($u) {
        return ['"' . $u['name'] . '"', $u['email'], $u['role'], $u['phone'] ?? '', date('Y-m-d', strtotime($u['created_at']))];
    }, $users);
    $csvRows = array_map(function($r) { return implode(',', $r); }, $rows);
    send_csv("users-" . time() . ".csv", $header, $csvRows);
}

function admin_update_tracking(string $orderId): void
{
    $user = require_admin();
    $body = get_request_body();
    $db = get_db();
    $stmt = $db->prepare('UPDATE orders SET tracking_number = ?, tracking_url = ? WHERE id = ?');
    $stmt->execute([$body['trackingNumber'] ?? null, $body['trackingUrl'] ?? null, $orderId]);
    if ($stmt->rowCount() === 0 && $db->query("SELECT COUNT(*) FROM orders WHERE id = " . (int)$orderId)->fetchColumn() == 0) json_error('Order not found', 404);
    $order = $db->query("SELECT * FROM orders WHERE id = " . (int)$orderId)->fetch();
    json_success($order);
}

function admin_invoice(string $orderId): void
{
    require_admin();
    $db = get_db();
    $stmt = $db->prepare('SELECT o.*, u.name as user_name, u.email as user_email, u.phone as user_phone FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.id = ?');
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();
    if (!$order) json_error('Order not found', 404);

    require_once __DIR__ . '/../utils/pdf.php';
    $orderUser = ['name' => $order['user_name'], 'email' => $order['user_email'], 'phone' => $order['user_phone']];
    generate_invoice_pdf($order, $orderUser);
}

// Admin Coupons CRUD
function admin_list_coupons(): void
{
    require_admin();
    $db = get_db();
    $rows = $db->query('SELECT * FROM coupons ORDER BY priority DESC, created_at DESC')->fetchAll();
    $formatted = [];
    foreach ($rows as $c) {
        $formatted[] = [
            '_id' => (string)$c['id'],
            'id' => (string)$c['id'],
            'name' => $c['name'],
            'code' => $c['code'],
            'campaignType' => $c['campaign_type'],
            'campaign_type' => $c['campaign_type'],
            'campaignLabel' => $c['campaign_label'],
            'campaign_label' => $c['campaign_label'],
            'bannerText' => $c['banner_text'],
            'banner_text' => $c['banner_text'],
            'featuredOnStore' => (bool)$c['featured_on_store'],
            'featured_on_store' => (int)$c['featured_on_store'],
            'priority' => (int)$c['priority'],
            'description' => $c['description'],
            'discountType' => $c['discount_type'],
            'discount_type' => $c['discount_type'],
            'discountValue' => (float)$c['discount_value'],
            'discount_value' => (float)$c['discount_value'],
            'minOrderAmount' => (float)$c['min_order_amount'],
            'min_order_amount' => (float)$c['min_order_amount'],
            'maxDiscount' => $c['max_discount'] ? (float)$c['max_discount'] : null,
            'max_discount' => $c['max_discount'] ? (float)$c['max_discount'] : null,
            'usageLimit' => $c['usage_limit'] ? (int)$c['usage_limit'] : null,
            'usage_limit' => $c['usage_limit'] ? (int)$c['usage_limit'] : null,
            'perUserLimit' => $c['per_user_limit'] ? (int)$c['per_user_limit'] : null,
            'per_user_limit' => $c['per_user_limit'] ? (int)$c['per_user_limit'] : null,
            'usedCount' => (int)$c['used_count'],
            'used_count' => (int)$c['used_count'],
            'active' => (bool)$c['active'],
            'validFrom' => $c['valid_from'],
            'valid_from' => $c['valid_from'],
            'validTo' => $c['valid_to'],
            'valid_to' => $c['valid_to'],
            'createdAt' => $c['created_at'],
            'updatedAt' => $c['updated_at'],
        ];
    }
    json_success($formatted);
}

function admin_create_coupon(): void
{
    $user = require_admin();
    $body = get_request_body();
    $db = get_db();

    $code = strtoupper(trim((string)($body['code'] ?? '')));
    $discountType = $body['discountType'] ?? $body['discount_type'] ?? null;
    $discountValue = $body['discountValue'] ?? $body['discount_value'] ?? null;
    $validFrom = $body['validFrom'] ?? $body['valid_from'] ?? null;
    $validTo = $body['validTo'] ?? $body['valid_to'] ?? null;

    if (!$code) json_error("code is required", 400);
    if (!$discountType) json_error("discountType is required", 400);
    if ($discountValue === null) json_error("discountValue is required", 400);
    if (!$validFrom) json_error("validFrom is required", 400);
    if (!$validTo) json_error("validTo is required", 400);

    $stmt = $db->prepare('INSERT INTO coupons (name, code, campaign_type, campaign_label, banner_text, featured_on_store, priority, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, per_user_limit, active, valid_from, valid_to) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $stmt->execute([
        $body['name'] ?? '', $code, $body['campaignType'] ?? $body['campaign_type'] ?? 'regular',
        $body['campaignLabel'] ?? $body['campaign_label'] ?? '', $body['bannerText'] ?? $body['banner_text'] ?? '', !empty($body['featuredOnStore'] ?? $body['featured_on_store']) ? 1 : 0,
        $body['priority'] ?? 0, $body['description'] ?? '', $discountType,
        $discountValue, $body['minOrderAmount'] ?? $body['min_order_amount'] ?? 0, $body['maxDiscount'] ?? $body['max_discount'] ?? null,
        $body['usageLimit'] ?? $body['usage_limit'] ?? null, $body['perUserLimit'] ?? $body['per_user_limit'] ?? null, !isset($body['active']) || $body['active'] ? 1 : 0,
        $validFrom, $validTo,
    ]);
    $coupon = $db->query("SELECT * FROM coupons WHERE id = " . (int)$db->lastInsertId())->fetch();
    http_response_code(201);
    echo json_encode(['status' => 'success', 'data' => $coupon], JSON_UNESCAPED_UNICODE);
}

function admin_update_coupon(string $id): void
{
    require_admin();
    $body = get_request_body();
    $db = get_db();
    $map = [
        'discountType' => 'discount_type',
        'discountValue' => 'discount_value',
        'minOrderAmount' => 'min_order_amount',
        'maxDiscount' => 'max_discount',
        'usageLimit' => 'usage_limit',
        'perUserLimit' => 'per_user_limit',
        'validFrom' => 'valid_from',
        'validTo' => 'valid_to',
        'campaignType' => 'campaign_type',
        'campaignLabel' => 'campaign_label',
        'bannerText' => 'banner_text',
        'featuredOnStore' => 'featured_on_store',
    ];
    $updates = []; $params = [];
    foreach ($body as $key => $value) {
        $col = $map[$key] ?? $key;
        $updates[] = "{$col} = ?";
        $params[] = $value;
    }
    if (empty($updates)) json_error('No fields to update', 400);
    $params[] = $id;
    $db->prepare('UPDATE coupons SET ' . implode(', ', $updates) . ' WHERE id = ?')->execute($params);
    $coupon = $db->query("SELECT * FROM coupons WHERE id = " . (int)$id)->fetch();
    if (!$coupon) json_error('Coupon not found', 404);
    json_success($coupon);
}

function admin_delete_coupon(string $id): void
{
    require_admin();
    $db = get_db();
    $stmt = $db->prepare('DELETE FROM coupons WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) json_error('Coupon not found', 404);
    json_no_content();
}
