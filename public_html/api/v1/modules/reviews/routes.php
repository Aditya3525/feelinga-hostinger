<?php
declare(strict_types=1);

require_once __DIR__ . '/controller.php';
global $method, $segments;

$action = $segments[1] ?? '';

switch (true) {
    case $method === 'GET' && $action === '': reviews_list(); break;
    case $method === 'POST' && $action === '': reviews_create(); break;
    case $method === 'DELETE' && $action: reviews_remove($action); break;
    default: json_error('Reviews endpoint not found', 404);
}
