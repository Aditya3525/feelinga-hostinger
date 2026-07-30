<?php
declare(strict_types=1);

require_once __DIR__ . '/controller.php';
global $method, $segments;

$action = $segments[1] ?? '';
$param = $segments[2] ?? '';

switch (true) {
    case $method === 'POST' && $action === '':
        orders_create();
        break;
    case $method === 'GET' && $action === '':
        orders_list();
        break;
    case $method === 'PATCH' && $action === 'bulk-status':
        orders_bulk_status();
        break;
    case $method === 'GET' && $action && $param === 'invoice':
        orders_invoice($action);
        break;
    case $method === 'GET' && $action:
        orders_get_by_id($action);
        break;
    case $method === 'PATCH' && $action && $param === 'cancel':
        orders_cancel($action);
        break;
    case $method === 'PATCH' && $action && $param === 'status':
        orders_update_status($action);
        break;
    default:
        json_error('Orders endpoint not found', 404);
}
