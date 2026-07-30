<?php
declare(strict_types=1);

/**
 * Contact + Newsletter Controller
 * Reference: backend/src/modules/contact/controller.ts (89 lines)
 */

function contact_submit(): void
{
    apply_rate_limit('contact:submit', 10, 3600000);
    $body = get_request_body();
    $name = trim($body['name'] ?? '');
    $email = sanitize_email($body['email'] ?? '');
    $subject = trim($body['subject'] ?? 'General Inquiry');
    $message = $body['message'] ?? '';
    if (!$name || !$email || !$message) json_error('Name, email and message are required', 400);

    $db = get_db();
    $stmt = $db->prepare('INSERT INTO contact_messages (name, email, subject, message) VALUES (?,?,?,?)');
    $stmt->execute([$name, $email, $subject, $message]);
    http_response_code(201);
    echo json_encode(['status' => 'success', 'message' => "Thank you! We'll get back to you within 24 hours.", 'data' => ['id' => (string)$db->lastInsertId()]], JSON_UNESCAPED_UNICODE);
}

function contact_list_messages(): void
{
    $user = require_admin();
    $db = get_db();
    $page = max(1, query_int('page', 1));
    $limit = min(100, max(1, query_int('limit', 50)));
    $status = query_string('status');
    $offset = ($page - 1) * $limit;

    $where = []; $params = [];
    if ($status) { $where[] = 'status = ?'; $params[] = $status; }
    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $total = (int)$db->prepare("SELECT COUNT(*) FROM contact_messages {$whereClause}")->execute($params) ? 0 : 0;
    $cnt = $db->prepare("SELECT COUNT(*) FROM contact_messages {$whereClause}");
    $cnt->execute($params);
    $total = (int)$cnt->fetchColumn();

    $stmt = $db->prepare("SELECT * FROM contact_messages {$whereClause} ORDER BY created_at DESC LIMIT {$limit} OFFSET {$offset}");
    $stmt->execute($params);
    $messages = $stmt->fetchAll();

    json_list($messages, $total, ['page' => $page, 'limit' => $limit, 'totalPages' => (int)ceil($total / $limit), 'total' => $total]);
}

function contact_update_status(string $id): void
{
    require_admin();
    $body = get_request_body();
    $status = $body['status'] ?? 'new';
    if (!in_array($status, ['new', 'read', 'replied'])) json_error('Invalid status', 400);
    $db = get_db();
    $stmt = $db->prepare('UPDATE contact_messages SET status = ? WHERE id = ?');
    $stmt->execute([$status, $id]);
    if ($stmt->rowCount() === 0) json_error('Message not found', 404);
    $message = $db->query("SELECT * FROM contact_messages WHERE id = " . (int)$id)->fetch();
    json_success($message);
}

function newsletter_subscribe(): void
{
    apply_rate_limit('newsletter:subscribe', 10, 3600000);
    $body = get_request_body();
    $email = sanitize_email($body['email'] ?? '');
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) json_error('Valid email is required', 400);

    $db = get_db();
    $stmt = $db->prepare('SELECT id, active FROM newsletter_subscribers WHERE email = ?');
    $stmt->execute([$email]);
    $existing = $stmt->fetch();

    if ($existing) {
        if ($existing['active']) {
            http_response_code(200);
            echo json_encode(['status' => 'success', 'message' => "You're already subscribed!"], JSON_UNESCAPED_UNICODE);
            exit;
        } else {
            $db->prepare('UPDATE newsletter_subscribers SET active = 1 WHERE id = ?')->execute([$existing['id']]);
            http_response_code(200);
            echo json_encode(['status' => 'success', 'message' => "Welcome back! Your subscription is active again."], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    $token = bin2hex(random_bytes(24));
    $db->prepare('INSERT INTO newsletter_subscribers (email, active, unsubscribe_token, subscribed_at) VALUES (?, 1, ?, CURRENT_TIMESTAMP)')
       ->execute([$email, $token]);

    http_response_code(201);
    echo json_encode(['status' => 'success', 'message' => "You're subscribed! Welcome to the Feelinga community."], JSON_UNESCAPED_UNICODE);
    exit;
}

function newsletter_unsubscribe(): void
{
    $body = get_request_body();
    $token = $body['token'] ?? '';
    $email = $body['email'] ?? '';

    $db = get_db();
    if ($token) {
        $stmt = $db->prepare('UPDATE newsletter_subscribers SET active = 0 WHERE unsubscribe_token = ?');
        $stmt->execute([$token]);
        if ($stmt->rowCount() === 0) json_error('Invalid unsubscribe token', 404);
    } elseif ($email) {
        $db->prepare('UPDATE newsletter_subscribers SET active = 0 WHERE email = ?')->execute([sanitize_email($email)]);
    } else {
        json_error('Token or email required', 400);
    }
    json_success(['message' => "You've been unsubscribed."]);
}

function newsletter_list_subscribers(): void
{
    require_admin();
    $db = get_db();
    $stmt = $db->query('SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC LIMIT 200');
    json_success($stmt->fetchAll());
}
