<?php
declare(strict_types=1);

require_once __DIR__ . '/controller.php';
global $method, $segments;
$action = $segments[1] ?? '';
$param = $segments[2] ?? '';

switch (true) {
    case $method === 'GET' && $action === '': admin_dashboard(); break;
    case $method === 'GET' && $action === 'activity': admin_activity(); break;
    case $method === 'GET' && $action === 'users': admin_list_users(); break;
    case $method === 'GET' && $action === 'users' && $param: admin_get_user($param); break;
    case $method === 'PATCH' && $action === 'users' && $param && $segments[3] === 'role': admin_change_role($param); break;
    case $method === 'GET' && $action === 'low-stock': admin_low_stock(); break;
    case $method === 'GET' && $action === 'export' && $param === 'orders': admin_export_orders(); break;
    case $method === 'GET' && $action === 'export' && $param === 'products': admin_export_products(); break;
    case $method === 'GET' && $action === 'export' && $param === 'users': admin_export_users(); break;
    case $method === 'PATCH' && $action === 'orders' && $param && $segments[3] === 'tracking': admin_update_tracking($param); break;
    case $method === 'GET' && $action === 'orders' && $param && $segments[3] === 'invoice': admin_invoice($param); break;
    case $method === 'GET' && $action === 'coupons': admin_list_coupons(); break;
    case $method === 'POST' && $action === 'coupons': admin_create_coupon(); break;
    case $method === 'PATCH' && $action === 'coupons' && $param: admin_update_coupon($param); break;
    case $method === 'DELETE' && $action === 'coupons' && $param: admin_delete_coupon($param); break;
    case $method === 'GET' && $action === 'testimonials': require_once __DIR__ . '/../testimonials/routes.php'; testimonials_list_admin(); break;
    case $method === 'POST' && $action === 'testimonials': require_once __DIR__ . '/../testimonials/routes.php'; testimonials_create(); break;
    case $method === 'PATCH' && $action === 'testimonials' && $param: require_once __DIR__ . '/../testimonials/routes.php'; testimonials_update($param); break;
    case $method === 'DELETE' && $action === 'testimonials' && $param: require_once __DIR__ . '/../testimonials/routes.php'; testimonials_remove($param); break;
    default: json_error('Admin endpoint not found', 404);
}
