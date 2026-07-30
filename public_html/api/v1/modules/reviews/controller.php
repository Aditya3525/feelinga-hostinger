<?php
declare(strict_types=1);

/**
 * Reviews Controller
 * Reference: backend/src/modules/reviews/controller.ts (66 lines)
 */

function reviews_list(): void
{
    $productId = query_string('productId');
    if (!$productId) json_error('productId is required', 400);
    $page = max(1, query_int('page', 1));
    $limit = min(50, max(1, query_int('limit', 10)));
    $offset = ($page - 1) * $limit;
    $db = get_db();

    $countStmt = $db->prepare('SELECT COUNT(*) FROM reviews WHERE product_id = ?');
    $countStmt->execute([$productId]);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $db->prepare('SELECT r.id as _id, r.rating, r.title, r.body, r.created_at as createdAt, r.updated_at as updatedAt, u.name as user_name FROM reviews r LEFT JOIN users u ON r.user_id = u.id WHERE r.product_id = ? ORDER BY r.created_at DESC LIMIT ? OFFSET ?');
    $stmt->execute([$productId, $limit, $offset]);
    $reviews = $stmt->fetchAll();
    foreach ($reviews as &$r) { $r['user'] = ['name' => $r['user_name']]; unset($r['user_name']); }

    json_list($reviews, $total, ['page' => $page, 'totalPages' => (int)ceil($total / $limit), 'total' => $total]);
}

function reviews_create(): void
{
    $user = authenticate();
    $body = get_request_body();
    $productId = $body['productId'] ?? '';
    $rating = (int)($body['rating'] ?? 0);
    $title = trim($body['title'] ?? '');
    $bodyText = trim($body['body'] ?? '');

    if (!$productId) json_error('productId is required', 400);
    if ($rating < 1 || $rating > 5) json_error('Rating must be between 1 and 5', 400);

    $db = get_db();
    // Check duplicate
    $stmt = $db->prepare('SELECT id FROM reviews WHERE user_id = ? AND product_id = ?');
    $stmt->execute([$user['id'], $productId]);
    if ($stmt->fetch()) json_error('You have already reviewed this product', 400);

    $stmt = $db->prepare('INSERT INTO reviews (user_id, product_id, rating, title, body) VALUES (?,?,?,?,?)');
    $stmt->execute([$user['id'], $productId, $rating, $title ?: null, $bodyText ?: null]);
    $reviewId = (int)$db->lastInsertId();

    // Update product rating
    $stmt = $db->prepare('SELECT ROUND(AVG(rating),1) as avg_rating, COUNT(*) as cnt FROM reviews WHERE product_id = ?');
    $stmt->execute([$productId]);
    $stats = $stmt->fetch();
    $db->prepare('UPDATE products SET rating = ?, review_count = ? WHERE id = ?')
       ->execute([$stats['avg_rating'] ?? 0, $stats['cnt'], $productId]);

    $stmt = $db->prepare('SELECT r.id as _id, r.rating, r.title, r.body, r.created_at as createdAt, u.name as user_name FROM reviews r LEFT JOIN users u ON r.user_id = u.id WHERE r.id = ?');
    $stmt->execute([$reviewId]);
    $review = $stmt->fetch();
    $review['user'] = ['name' => $review['user_name'] ?? ''];
    unset($review['user_name']);

    http_response_code(201);
    echo json_encode(['status' => 'success', 'data' => $review], JSON_UNESCAPED_UNICODE);
}

function reviews_remove(string $id): void
{
    $user = authenticate();
    $db = get_db();
    $stmt = $db->prepare('SELECT id, user_id, product_id FROM reviews WHERE id = ?');
    $stmt->execute([$id]);
    $review = $stmt->fetch();
    if (!$review) json_error('Review not found', 404);
    if ($user['role'] !== 'admin' && (string)$review['user_id'] !== (string)$user['id']) json_error('Not authorized to delete this review', 403);

    $productId = $review['product_id'];
    $db->prepare('DELETE FROM reviews WHERE id = ?')->execute([$id]);

    // Recalculate rating
    $stmt = $db->prepare('SELECT ROUND(AVG(rating),1) as avg_rating, COUNT(*) as cnt FROM reviews WHERE product_id = ?');
    $stmt->execute([$productId]);
    $stats = $stmt->fetch();
    $db->prepare('UPDATE products SET rating = ?, review_count = ? WHERE id = ?')
       ->execute([$stats['avg_rating'] ?? 0, $stats['cnt'], $productId]);

    json_no_content();
}
