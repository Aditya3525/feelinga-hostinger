<?php
declare(strict_types=1);

/**
 * Auth routes
 * Reference: backend/src/modules/auth/routes.ts
 */

require_once __DIR__ . '/controller.php';

global $method, $segments;

// $segments[0] = 'auth', $segments[1] = action, $segments[2] = param
$action = $segments[1] ?? '';
$param = $segments[2] ?? '';

switch (true) {
    // POST /auth/register
    case $method === 'POST' && $action === 'register':
        auth_register();
        break;

    // POST /auth/login
    case $method === 'POST' && $action === 'login':
        auth_login();
        break;

    // POST /auth/refresh
    case $method === 'POST' && $action === 'refresh':
        auth_refresh();
        break;

    // POST /auth/logout
    case $method === 'POST' && $action === 'logout':
        auth_logout();
        break;

    // GET /auth/me
    case $method === 'GET' && $action === 'me':
        auth_get_me();
        break;

    // PATCH /auth/profile
    case $method === 'PATCH' && $action === 'profile':
        auth_update_profile();
        break;

    // PATCH /auth/password
    case $method === 'PATCH' && $action === 'password':
        auth_change_password();
        break;

    // POST /auth/address
    case $method === 'POST' && $action === 'address':
        auth_add_address();
        break;

    // PATCH /auth/address/:id
    case $method === 'PATCH' && $action === 'address' && $param:
        auth_update_address($param);
        break;

    // DELETE /auth/address/:id
    case $method === 'DELETE' && $action === 'address' && $param:
        auth_remove_address($param);
        break;

    // POST /auth/google
    case $method === 'POST' && $action === 'google':
        auth_google_login();
        break;

    // POST /auth/forgot-password
    case $method === 'POST' && $action === 'forgot-password':
        auth_forgot_password();
        break;

    // POST /auth/reset-password
    case $method === 'POST' && $action === 'reset-password':
        auth_reset_password();
        break;

    // POST /auth/verify-email
    case $method === 'POST' && $action === 'verify-email':
        auth_verify_email();
        break;

    // POST /auth/check-email
    case $method === 'POST' && $action === 'check-email':
        auth_check_email();
        break;

    // GET /auth/wishlist
    case $method === 'GET' && $action === 'wishlist':
        auth_get_wishlist();
        break;

    // POST /auth/wishlist/:productId
    case $method === 'POST' && $action === 'wishlist' && $param:
        auth_toggle_wishlist($param);
        break;

    // GET /auth/data-export
    case $method === 'GET' && $action === 'data-export':
        auth_data_export();
        break;

    // DELETE /auth/account
    case $method === 'DELETE' && $action === 'account':
        auth_delete_account();
        break;

    default:
        json_error('Auth endpoint not found', 404);
}
