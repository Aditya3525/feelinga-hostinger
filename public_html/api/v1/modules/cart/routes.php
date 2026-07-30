<?php
declare(strict_types=1);

require_once __DIR__ . '/controller.php';
global $method, $segments;

$action = $segments[1] ?? '';
$param = $segments[2] ?? '';

switch (true) {
    case $method === 'GET' && $action === '':
        cart_get();
        break;
    case $method === 'POST' && $action === 'items':
        cart_add_item();
        break;
    case $method === 'POST' && $action === 'sync':
        cart_sync();
        break;
    case $method === 'PATCH' && $action === 'items' && $param:
        cart_update_item($param);
        break;
    case $method === 'DELETE' && $action === 'items' && $param:
        cart_remove_item($param);
        break;
    case $method === 'DELETE' && $action === '':
        cart_clear();
        break;
    default:
        json_error('Cart endpoint not found', 404);
}
