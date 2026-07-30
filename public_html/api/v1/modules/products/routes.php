<?php
declare(strict_types=1);

require_once __DIR__ . '/controller.php';

global $method, $segments;

$action = $segments[1] ?? '';
$param = $segments[2] ?? '';

switch (true) {
    case $method === 'GET' && $action === 'search':
        products_search();
        break;
    case $method === 'GET' && $action === 'autocomplete':
        products_autocomplete();
        break;
    case $method === 'PATCH' && $action === 'bulk-stock':
        products_bulk_stock();
        break;
    case $method === 'DELETE' && $action === 'bulk':
        products_bulk_delete();
        break;
    case $method === 'GET' && $action === '':
        products_list();
        break;
    case $method === 'GET' && $action:
        products_get_by_slug($action);
        break;
    case $method === 'POST' && $action === '':
        products_create();
        break;
    case $method === 'PATCH' && $action:
        products_update($action);
        break;
    case $method === 'DELETE' && $action:
        products_remove($action);
        break;
    default:
        json_error('Products endpoint not found', 404);
}
