<?php
declare(strict_types=1);

/**
 * Testimonials Controller
 * Reference: backend/src/modules/testimonials/routes.ts (18 lines) + admin controller
 */

function testimonials_list_public(): void
{
    $db = get_db();
    $stmt = $db->query('SELECT * FROM testimonials WHERE approved = 1 ORDER BY featured DESC, sort_order ASC, created_at DESC');
    json_success($stmt->fetchAll());
}

function testimonials_list_admin(): void
{
    require_admin();
    $db = get_db();
    $rows = $db->query('SELECT * FROM testimonials ORDER BY sort_order ASC, created_at DESC')->fetchAll();
    $formatted = [];
    foreach ($rows as $t) {
        $formatted[] = [
            '_id' => (string)$t['id'],
            'id' => (string)$t['id'],
            'author' => $t['author'],
            'role' => $t['role'],
            'text' => $t['text'],
            'rating' => (int)$t['rating'],
            'approved' => (bool)$t['approved'],
            'featured' => (bool)$t['featured'],
            'order' => (int)$t['sort_order'],
            'sort_order' => (int)$t['sort_order'],
            'createdAt' => $t['created_at'],
            'created_at' => $t['created_at'],
        ];
    }
    json_success($formatted);
}

function testimonials_create(): void
{
    $user = require_admin();
    $body = get_request_body();
    $author = trim($body['author'] ?? '');
    $text = trim($body['text'] ?? '');
    if (!$author || !$text) json_error('Author and text are required', 400);

    $db = get_db();
    $orderVal = $body['order'] ?? $body['sort_order'] ?? 0;
    $stmt = $db->prepare('INSERT INTO testimonials (author, role, text, rating, approved, featured, sort_order) VALUES (?,?,?,?,?,?,?)');
    $stmt->execute([
        $author, trim($body['role'] ?? 'Customer'), $text,
        $body['rating'] ?? 5,
        isset($body['approved']) ? ($body['approved'] ? 1 : 0) : 0,
        !empty($body['featured']) ? 1 : 0,
        (int)$orderVal,
    ]);
    $t = $db->query("SELECT * FROM testimonials WHERE id = " . (int)$db->lastInsertId())->fetch();
    $formatted = [
        '_id' => (string)$t['id'],
        'id' => (string)$t['id'],
        'author' => $t['author'],
        'role' => $t['role'],
        'text' => $t['text'],
        'rating' => (int)$t['rating'],
        'approved' => (bool)$t['approved'],
        'featured' => (bool)$t['featured'],
        'order' => (int)$t['sort_order'],
        'sort_order' => (int)$t['sort_order'],
        'createdAt' => $t['created_at'],
        'created_at' => $t['created_at'],
    ];
    http_response_code(201);
    echo json_encode(['status' => 'success', 'data' => $formatted], JSON_UNESCAPED_UNICODE);
}

function testimonials_update(string $id): void
{
    $user = require_admin();
    $body = get_request_body();
    $db = get_db();

    $map = ['order' => 'sort_order'];
    $allowed = ['author','role','text','rating','approved','featured','sort_order','order'];
    $updates = []; $params = [];
    foreach ($body as $key => $value) {
        if (in_array($key, $allowed)) {
            $col = $map[$key] ?? $key;
            $updates[] = "{$col} = ?";
            $params[] = is_bool($value) ? ($value ? 1 : 0) : $value;
        }
    }
    if (empty($updates)) json_error('No fields to update', 400);
    $params[] = $id;
    $db->prepare('UPDATE testimonials SET ' . implode(', ', $updates) . ' WHERE id = ?')->execute($params);

    $t = $db->query("SELECT * FROM testimonials WHERE id = " . (int)$id)->fetch();
    if (!$t) json_error('Testimonial not found', 404);
    $formatted = [
        '_id' => (string)$t['id'],
        'id' => (string)$t['id'],
        'author' => $t['author'],
        'role' => $t['role'],
        'text' => $t['text'],
        'rating' => (int)$t['rating'],
        'approved' => (bool)$t['approved'],
        'featured' => (bool)$t['featured'],
        'order' => (int)$t['sort_order'],
        'sort_order' => (int)$t['sort_order'],
        'createdAt' => $t['created_at'],
        'created_at' => $t['created_at'],
    ];
    json_success($formatted);
}

function testimonials_remove(string $id): void
{
    $user = require_admin();
    $db = get_db();
    $stmt = $db->prepare('DELETE FROM testimonials WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) json_error('Testimonial not found', 404);
    json_no_content();
}
