<?php
declare(strict_types=1);

/**
 * Auth Controller — All authentication endpoints
 * Reference: backend/src/modules/auth/controller.ts (367 lines)
 */

/**
 * POST /auth/register
 * Ref: controller.ts:50-62
 */
function auth_register(): void
{
    apply_rate_limit('auth:register', 10, 3600000); // 10/hour

    $body = get_request_body();
    $name = trim($body['name'] ?? '');
    $email = sanitize_email($body['email'] ?? '');
    $password = $body['password'] ?? '';

    if (!$name || !$email || !$password) {
        json_error('Name, email and password are required', 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_error('Please provide a valid email address', 400);
    }
    if (!preg_match(STRONG_PASSWORD_REGEX, $password)) {
        json_error('Password must be 8-100 characters and include uppercase, lowercase, number, and special character', 400);
    }

    check_password_breach($password);

    $db = get_db();
    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        json_error('Unable to create account with provided details.', 409);
    }

    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $stmt = $db->prepare('INSERT INTO users (name, email, password, email_verified) VALUES (?, ?, ?, 1)');
    $stmt->execute([$name, $email, $hash]);
    $userId = (int) $db->lastInsertId();

    $user = fetch_user_by_id($db, $userId);
    $tokens = issue_session($db, $user);

    http_response_code(201);
    echo json_encode([
        'status' => 'success',
        'data' => [
            'user' => sanitize_user_output($user),
            'accessToken' => $tokens['accessToken'],
            'refreshToken' => $tokens['refreshToken'],
        ],
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * POST /auth/login
 * Ref: controller.ts:65-93
 */
function auth_login(): void
{
    apply_rate_limit('auth:login', 20, 900000); // 20/15min

    $body = get_request_body();
    $email = sanitize_email($body['email'] ?? '');
    $password = $body['password'] ?? '';

    if (!$email || !$password) {
        json_error('Email and password are required', 400);
    }

    $db = get_db();
    $stmt = $db->prepare('SELECT id, name, email, password, role, phone, email_verified, login_attempts, lock_until FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // Check lock
    if ($user && $user['lock_until'] && strtotime($user['lock_until']) > time()) {
        $minutesLeft = (int) ceil((strtotime($user['lock_until']) - time()) / 60);
        json_error("Account temporarily locked. Try again in {$minutesLeft} minute(s).", 423);
    }

    // Verify password
    if (!$user || !password_verify($password, $user['password'])) {
        if ($user) {
            $attempts = ($user['login_attempts'] ?? 0) + 1;
            if ($attempts >= 5) {
                $lockMs = env_int('LOGIN_LOCK_MS', 900000);
                $lockUntil = date('Y-m-d H:i:s', time() + (int)($lockMs / 1000));
                $db->prepare('UPDATE users SET login_attempts = 0, lock_until = ? WHERE id = ?')
                   ->execute([$lockUntil, $user['id']]);
            } else {
                $db->prepare('UPDATE users SET login_attempts = ? WHERE id = ?')
                   ->execute([$attempts, $user['id']]);
            }
        }
        json_error('Invalid email or password', 401);
    }

    // Clear login attempts
    if (($user['login_attempts'] ?? 0) > 0 || $user['lock_until']) {
        $db->prepare('UPDATE users SET login_attempts = 0, lock_until = NULL WHERE id = ?')
           ->execute([$user['id']]);
    }

    // Mark email verified
    $db->prepare('UPDATE users SET email_verified = 1 WHERE id = ?')
       ->execute([$user['id']]);
    $user['email_verified'] = 1;

    $tokens = issue_session($db, $user);

    echo json_encode([
        'status' => 'success',
        'data' => [
            'user' => sanitize_user_output($user),
            'accessToken' => $tokens['accessToken'],
            'refreshToken' => $tokens['refreshToken'],
        ],
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * POST /auth/refresh
 * Ref: controller.ts:96-109
 */
function auth_refresh(): void
{
    $refreshToken = extract_refresh_token();
    if (!$refreshToken) {
        json_error('Refresh token required', 400);
    }

    $jwtRefreshSecret = env('JWT_REFRESH_SECRET');
    try {
        $decoded = \Firebase\JWT\JWT::decode($refreshToken, new \Firebase\JWT\Key($jwtRefreshSecret, 'HS256'));
    } catch (Exception $e) {
        json_error('Invalid refresh token', 401);
    }

    $db = get_db();
    $stmt = $db->prepare('SELECT id, name, email, role, phone, email_verified, refresh_token FROM users WHERE id = ?');
    $stmt->execute([(int) $decoded->id]);
    $user = $stmt->fetch();

    if (!$user || $user['refresh_token'] !== hash('sha256', $refreshToken)) {
        json_error('Invalid refresh token', 401);
    }

    $tokens = issue_session($db, $user);

    echo json_encode([
        'status' => 'success',
        'data' => [
            'accessToken' => $tokens['accessToken'],
            'refreshToken' => $tokens['refreshToken'],
        ],
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * POST /auth/logout
 * Ref: controller.ts:111-118
 */
function auth_logout(): void
{
    $user = authenticate();
    $db = get_db();
    $db->prepare('UPDATE users SET refresh_token = NULL WHERE id = ?')
       ->execute([$user['id']]);
    clear_auth_cookies();
    json_success(['message' => 'Logged out']);
}

/**
 * GET /auth/me
 * Ref: controller.ts:120-122
 */
function auth_get_me(): void
{
    $user = authenticate();
    $db = get_db();
    $full = fetch_user_by_id($db, (int)$user['id']);
    // Also load addresses
    $stmt = $db->prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id ASC');
    $stmt->execute([$user['id']]);
    $addresses = $stmt->fetchAll();
    $full['addresses'] = $addresses;
    json_success(['user' => sanitize_user_output($full)]);
}

/**
 * PATCH /auth/profile
 * Ref: controller.ts:124-144
 */
function auth_update_profile(): void
{
    $user = authenticate();
    $body = get_request_body();
    $db = get_db();
    $updates = [];
    $params = [];

    if (isset($body['name']) && trim($body['name']) !== '') {
        $updates[] = 'name = ?';
        $params[] = trim($body['name']);
    }
    if (isset($body['phone'])) {
        $updates[] = 'phone = ?';
        $params[] = trim($body['phone']);
    }
    if (isset($body['email']) && sanitize_email($body['email']) !== $user['email']) {
        $newEmail = sanitize_email($body['email']);
        if (!filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
            json_error('Please provide a valid email address', 400);
        }
        $currentPassword = $body['currentPassword'] ?? '';
        if (!$currentPassword) {
            json_error('Current password is required to change email', 400);
        }
        $stmt = $db->prepare('SELECT password FROM users WHERE id = ?');
        $stmt->execute([$user['id']]);
        $row = $stmt->fetch();
        if (!$row || !password_verify($currentPassword, $row['password'])) {
            json_error('Current password is incorrect', 401);
        }
        $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$newEmail]);
        if ($stmt->fetch()) {
            json_error('Email already in use', 409);
        }
        $updates[] = 'email = ?';
        $params[] = $newEmail;
    }

    if (empty($updates)) {
        json_error('No fields to update', 400);
    }

    $params[] = $user['id'];
    $sql = 'UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ?';
    $db->prepare($sql)->execute($params);

    $updated = fetch_user_by_id($db, (int)$user['id']);
    json_success(['user' => sanitize_user_output($updated)]);
}

/**
 * PATCH /auth/password
 * Ref: controller.ts:146-158
 */
function auth_change_password(): void
{
    $user = authenticate();
    $body = get_request_body();
    $currentPassword = $body['currentPassword'] ?? '';
    $newPassword = $body['newPassword'] ?? '';

    $db = get_db();
    $stmt = $db->prepare('SELECT password FROM users WHERE id = ?');
    $stmt->execute([$user['id']]);
    $row = $stmt->fetch();

    if (!$row || !password_verify($currentPassword, $row['password'])) {
        json_error('Current password is incorrect', 401);
    }
    if (!preg_match(STRONG_PASSWORD_REGEX, $newPassword)) {
        json_error('Password must be 8-100 characters and include uppercase, lowercase, number, and special character', 400);
    }

    check_password_breach($newPassword);

    $hash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
    $db->prepare('UPDATE users SET password = ? WHERE id = ?')
       ->execute([$hash, $user['id']]);

    json_success(['message' => 'Password updated successfully']);
}

/**
 * POST /auth/address
 * Ref: controller.ts:160-172
 */
function auth_add_address(): void
{
    $user = authenticate();
    $body = get_request_body();
    $db = get_db();

    $isDefault = !empty($body['isDefault']);
    // Check if user has any addresses
    $stmt = $db->prepare('SELECT COUNT(*) FROM addresses WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $count = (int) $stmt->fetchColumn();
    if ($count === 0) $isDefault = true;

    if ($isDefault) {
        $db->prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?')
           ->execute([$user['id']]);
    }

    $stmt = $db->prepare('INSERT INTO addresses (user_id, label, full_name, phone, address_line1, address_line2, city, state, pincode, is_default) VALUES (?,?,?,?,?,?,?,?,?,?)');
    $stmt->execute([
        $user['id'],
        $body['label'] ?? 'Home',
        $body['fullName'] ?? '',
        $body['phone'] ?? '',
        $body['addressLine1'] ?? '',
        $body['addressLine2'] ?? null,
        $body['city'] ?? '',
        $body['state'] ?? '',
        $body['pincode'] ?? '',
        $isDefault ? 1 : 0,
    ]);

    $stmt = $db->prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id ASC');
    $stmt->execute([$user['id']]);
    $addresses = $stmt->fetchAll();

    http_response_code(201);
    echo json_encode(['status' => 'success', 'data' => ['addresses' => $addresses]], JSON_UNESCAPED_UNICODE);
}

/**
 * PATCH /auth/address/:id
 * Ref: controller.ts:174-206
 */
function auth_update_address(string $addressId): void
{
    $user = authenticate();
    $body = get_request_body();
    $db = get_db();

    $stmt = $db->prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?');
    $stmt->execute([$addressId, $user['id']]);
    $address = $stmt->fetch();
    if (!$address) json_error('Address not found', 404);

    if (!empty($body['isDefault'])) {
        $db->prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?')
           ->execute([$user['id']]);
    }

    $db->prepare('UPDATE addresses SET label=?, full_name=?, phone=?, address_line1=?, address_line2=?, city=?, state=?, pincode=?, is_default=? WHERE id=? AND user_id=?')
       ->execute([
           $body['label'] ?? $address['label'],
           $body['fullName'] ?? $address['full_name'],
           $body['phone'] ?? $address['phone'],
           $body['addressLine1'] ?? $address['address_line1'],
           $body['addressLine2'] ?? $address['address_line2'],
           $body['city'] ?? $address['city'],
           $body['state'] ?? $address['state'],
           $body['pincode'] ?? $address['pincode'],
           !empty($body['isDefault']) ? 1 : ($address['is_default']),
           $addressId, $user['id'],
       ]);

    $stmt = $db->prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id ASC');
    $stmt->execute([$user['id']]);
    json_success(['addresses' => $stmt->fetchAll()]);
}

/**
 * DELETE /auth/address/:id
 * Ref: controller.ts:208-221
 */
function auth_remove_address(string $addressId): void
{
    $user = authenticate();
    $db = get_db();

    $stmt = $db->prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?');
    $stmt->execute([$addressId, $user['id']]);
    $address = $stmt->fetch();
    if (!$address) json_error('Address not found', 404);

    $wasDefault = (bool) $address['is_default'];
    $db->prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?')
       ->execute([$addressId, $user['id']]);

    if ($wasDefault) {
        $db->prepare('UPDATE addresses SET is_default = 1 WHERE user_id = ? ORDER BY id ASC LIMIT 1')
           ->execute([$user['id']]);
    }

    $stmt = $db->prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id ASC');
    $stmt->execute([$user['id']]);
    json_success(['addresses' => $stmt->fetchAll()]);
}

/**
 * POST /auth/google
 * Ref: controller.ts:223-256
 */
function auth_google_login(): void
{
    apply_rate_limit('auth:google', 20, 900000);

    $body = get_request_body();
    $credential = $body['credential'] ?? '';
    if (!$credential) json_error('Google credential required', 400);

    $googleClientId = env('GOOGLE_CLIENT_ID');
    if (!$googleClientId) json_error('Google login not configured', 500);

    // Verify Google ID token
    $payload = verify_google_id_token($credential, $googleClientId);
    if (!$payload) json_error('Invalid Google token', 401);

    $email = strtolower($payload['email'] ?? '');
    $name = $payload['name'] ?? '';
    $googleId = $payload['sub'] ?? '';

    $db = get_db();
    $stmt = $db->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        $randomPass = password_hash(bin2hex(random_bytes(32)), PASSWORD_BCRYPT);
        $stmt = $db->prepare('INSERT INTO users (name, email, password, google_id, email_verified) VALUES (?,?,?,?,1)');
        $stmt->execute([$name, $email, $randomPass, $googleId]);
        $userId = (int) $db->lastInsertId();
        $user = fetch_user_by_id($db, $userId);
    } else {
        if (!$user['google_id']) {
            $db->prepare('UPDATE users SET google_id = ?, email_verified = 1 WHERE id = ?')
               ->execute([$googleId, $user['id']]);
        } else {
            $db->prepare('UPDATE users SET email_verified = 1 WHERE id = ?')
               ->execute([$user['id']]);
        }
        $user = fetch_user_by_id($db, (int) $user['id']);
    }

    $tokens = issue_session($db, $user);

    echo json_encode([
        'status' => 'success',
        'data' => [
            'user' => sanitize_user_output($user),
            'accessToken' => $tokens['accessToken'],
            'refreshToken' => $tokens['refreshToken'],
        ],
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * POST /auth/forgot-password
 * Ref: controller.ts:258-273
 */
function auth_forgot_password(): void
{
    apply_rate_limit('auth:forgot', 5, 3600000);

    $body = get_request_body();
    $email = sanitize_email($body['email'] ?? '');
    if (!$email) json_error('Email is required', 400);

    $db = get_db();
    $stmt = $db->prepare('SELECT id, email FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user) {
        $resetToken = bin2hex(random_bytes(32));
        $hashedToken = hash('sha256', $resetToken);
        $expires = date('Y-m-d H:i:s', time() + 600);
        $db->prepare('UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?')
           ->execute([$hashedToken, $expires, $user['id']]);
        $clientUrl = env('CLIENT_URL', env('SITE_URL', 'https://feelinga.com'));
        $resetUrl = "{$clientUrl}/reset-password?token={$resetToken}";

        require_once __DIR__ . '/../../utils/email.php';
        try {
            send_password_reset_email($email, $resetUrl);
        } catch (Exception $e) {
            error_log('Reset email error: ' . $e->getMessage());
        }
    }

    json_success(['message' => 'If that email exists, a reset link has been sent.']);
}

/**
 * POST /auth/reset-password
 * Ref: controller.ts:275-293
 */
function auth_reset_password(): void
{
    $body = get_request_body();
    $token = $body['token'] ?? '';
    $password = $body['password'] ?? '';

    if (!$token || !$password) json_error('Token and new password are required', 400);
    if (!preg_match(STRONG_PASSWORD_REGEX, $password)) {
        json_error('Password must be 8-100 characters and include uppercase, lowercase, number, and special character', 400);
    }

    check_password_breach($password);

    $hashedToken = hash('sha256', $token);
    $db = get_db();
    $stmt = $db->prepare('SELECT id FROM users WHERE password_reset_token = ? AND password_reset_expires > CURRENT_TIMESTAMP');
    $stmt->execute([$hashedToken]);
    $user = $stmt->fetch();

    if (!$user) json_error('Token is invalid or has expired', 400);

    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $db->prepare('UPDATE users SET password = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?')
       ->execute([$hash, $user['id']]);

    json_success(['message' => 'Password has been reset successfully. You can now log in.']);
}

/**
 * POST /auth/verify-email
 * Ref: controller.ts:295-309
 */
function auth_verify_email(): void
{
    $body = get_request_body();
    $token = $body['token'] ?? '';
    if (!$token) json_error('Verification token required', 400);

    $hashedToken = hash('sha256', $token);
    $db = get_db();
    $stmt = $db->prepare('SELECT id FROM users WHERE email_verify_token = ? AND email_verify_expires > CURRENT_TIMESTAMP');
    $stmt->execute([$hashedToken]);
    $user = $stmt->fetch();

    if (!$user) json_error('Invalid or expired verification token', 400);

    $db->prepare('UPDATE users SET email_verified = 1, email_verify_token = NULL, email_verify_expires = NULL WHERE id = ?')
       ->execute([$user['id']]);

    json_success(['message' => 'Email verified successfully!']);
}

/**
 * POST /auth/check-email
 * Ref: controller.ts:311-317
 */
function auth_check_email(): void
{
    $body = get_request_body();
    $email = sanitize_email($body['email'] ?? '');
    $valid = filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    // Basic disposable email check
    $reason = null;
    if (!$valid) $reason = 'Invalid email format';
    json_success(['valid' => $valid, 'reason' => $reason]);
}

/**
 * GET /auth/wishlist
 * Ref: controller.ts:319-324
 */
function auth_get_wishlist(): void
{
    $user = authenticate();
    $db = get_db();
    $stmt = $db->prepare('
        SELECT p.id as _id, p.name, p.slug, p.images, p.price_50g, p.price_100g, p.price_200g,
               p.type, p.short_description, p.rating, p.review_count, p.in_stock, p.stock
        FROM wishlist w
        JOIN products p ON w.product_id = p.id
        WHERE w.user_id = ? AND p.deleted_at IS NULL
    ');
    $stmt->execute([$user['id']]);
    $items = $stmt->fetchAll();

    // Format to match MongoDB output
    foreach ($items as &$item) {
        $item['prices'] = [
            '50g' => $item['price_50g'] ? (float)$item['price_50g'] : null,
            '100g' => (float) $item['price_100g'],
            '200g' => $item['price_200g'] ? (float)$item['price_200g'] : null,
        ];
        $item['images'] = json_decode($item['images'] ?? '[]', true);
        $item['inStock'] = (bool) $item['in_stock'];
        $item['shortDescription'] = $item['short_description'];
        $item['reviewCount'] = (int) $item['review_count'];
        $item['rating'] = (float) $item['rating'];
        $item['stock'] = (int) $item['stock'];
        unset($item['price_50g'], $item['price_100g'], $item['price_200g'], $item['in_stock'], $item['short_description'], $item['review_count']);
    }

    json_success($items);
}

/**
 * POST /auth/wishlist/:productId
 * Ref: controller.ts:326-338
 */
function auth_toggle_wishlist(string $productId): void
{
    $user = authenticate();
    $db = get_db();

    $stmt = $db->prepare('SELECT user_id FROM wishlist WHERE user_id = ? AND product_id = ?');
    $stmt->execute([$user['id'], $productId]);
    $exists = $stmt->fetch();

    if ($exists) {
        $db->prepare('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?')
           ->execute([$user['id'], $productId]);
        $action = 'removed';
    } else {
        $db->prepare('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)')
           ->execute([$user['id'], $productId]);
        $action = 'added';
    }

    $stmt = $db->prepare('SELECT product_id FROM wishlist WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $wishlist = array_column($stmt->fetchAll(), 'product_id');

    echo json_encode(['status' => 'success', 'action' => $action, 'wishlist' => $wishlist], JSON_UNESCAPED_UNICODE);
}

/**
 * GET /auth/data-export
 * Ref: controller.ts:340-351
 */
function auth_data_export(): void
{
    $user = authenticate();
    $db = get_db();
    $userId = $user['id'];

    $profile = fetch_user_by_id($db, (int)$userId);
    $stmt = $db->prepare('SELECT * FROM addresses WHERE user_id = ?');
    $stmt->execute([$userId]);
    $profile['addresses'] = $stmt->fetchAll();

    $stmt = $db->prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC');
    $stmt->execute([$userId]);
    $orders = $stmt->fetchAll();

    $stmt = $db->prepare('SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC');
    $stmt->execute([$userId]);
    $reviews = $stmt->fetchAll();

    $stmt = $db->prepare('SELECT ci.* FROM cart_items ci JOIN carts c ON ci.cart_id = c.id WHERE c.user_id = ?');
    $stmt->execute([$userId]);
    $cartItems = $stmt->fetchAll();

    json_success([
        'profile' => sanitize_user_output($profile),
        'orders' => $orders,
        'reviews' => $reviews,
        'cart' => $cartItems,
        'exportedAt' => date('c'),
    ]);
}

/**
 * DELETE /auth/account
 * Ref: controller.ts:353-366
 */
function auth_delete_account(): void
{
    $user = authenticate();
    $body = get_request_body();
    $currentPassword = $body['currentPassword'] ?? '';

    $db = get_db();
    $stmt = $db->prepare('SELECT password FROM users WHERE id = ?');
    $stmt->execute([$user['id']]);
    $row = $stmt->fetch();

    if (!$row || !password_verify($currentPassword, $row['password'])) {
        json_error('Current password is incorrect', 401);
    }

    // Anonymize order data
    $db->prepare("UPDATE orders SET ship_first_name='Deleted', ship_last_name='User', ship_phone='0000000000', ship_line1='Account deleted', ship_line2='' WHERE user_id = ?")
       ->execute([$user['id']]);

    // Delete related data (cascades handle reviews/cart/wishlist/addresses)
    $db->prepare('DELETE FROM users WHERE id = ?')->execute([$user['id']]);

    json_success(['message' => 'Your account and personal data have been deleted.']);
}

// ===== HELPERS =====

function issue_session(PDO $db, array $user): array
{
    $accessToken = sign_access_token($user);
    $refreshToken = sign_refresh_token($user);
    $hashedRefresh = hash('sha256', $refreshToken);

    $db->prepare('UPDATE users SET refresh_token = ? WHERE id = ?')
       ->execute([$hashedRefresh, $user['id']]);

    set_auth_cookies($accessToken, $refreshToken);

    return ['accessToken' => $accessToken, 'refreshToken' => $refreshToken];
}

function fetch_user_by_id(PDO $db, int $id): ?array
{
    $stmt = $db->prepare('SELECT id, name, email, role, phone, email_verified, google_id, created_at, updated_at FROM users WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

function sanitize_user_output(array $user): array
{
    $out = [
        '_id' => (string) $user['id'],
        'id' => (string) $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'role' => $user['role'],
        'phone' => $user['phone'] ?? null,
        'emailVerified' => (bool) ($user['email_verified'] ?? false),
        'createdAt' => $user['created_at'] ?? null,
        'updatedAt' => $user['updated_at'] ?? null,
    ];
    if (isset($user['addresses'])) {
        $out['addresses'] = array_map(function($a) {
            return [
                '_id' => (string)$a['id'],
                'label' => $a['label'],
                'fullName' => $a['full_name'],
                'phone' => $a['phone'],
                'addressLine1' => $a['address_line1'],
                'addressLine2' => $a['address_line2'],
                'city' => $a['city'],
                'state' => $a['state'],
                'pincode' => $a['pincode'],
                'isDefault' => (bool)$a['is_default'],
            ];
        }, $user['addresses'] ?? []);
    }
    return $out;
}

function verify_google_id_token(string $idToken, string $clientId): ?array
{
    // Verify using Google's tokeninfo endpoint (simplest for shared hosting)
    $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken);
    $ctx = stream_context_create(['http' => ['timeout' => 5]]);
    $response = @file_get_contents($url, false, $ctx);
    if (!$response) return null;

    $payload = json_decode($response, true);
    if (!$payload || ($payload['aud'] ?? '') !== $clientId) return null;
    if (($payload['iss'] ?? '') !== 'accounts.google.com' && ($payload['iss'] ?? '') !== 'https://accounts.google.com') return null;

    return $payload;
}

function check_password_breach(string $password): void
{
    if (!env_bool('HIBP_ENFORCE', false)) return;

    $sha1 = strtoupper(sha1($password));
    $prefix = substr($sha1, 0, 5);
    $suffix = substr($sha1, 5);

    $timeoutMs = env_int('HIBP_TIMEOUT_MS', 4000);
    $ctx = stream_context_create(['http' => ['timeout' => $timeoutMs / 1000]]);
    $response = @file_get_contents("https://api.pwnedpasswords.com/range/{$prefix}", false, $ctx);
    if (!$response) {
        if (env_bool('HIBP_FAIL_CLOSED', false)) {
            json_error('Unable to verify password safety. Please try again.', 503);
        }
        return;
    }

    $lines = explode("\n", $response);
    $minCount = env_int('HIBP_MIN_BREACH_COUNT', 1);
    foreach ($lines as $line) {
        $parts = explode(':', trim($line));
        if (count($parts) === 2 && strtoupper($parts[0]) === $suffix && (int)$parts[1] >= $minCount) {
            json_error('This password has appeared in a data breach. Please choose a different password.', 400);
        }
    }
}
