<?php
declare(strict_types=1);

require_once __DIR__ . '/controller.php';
global $method, $segments;
$action = $segments[1] ?? '';

switch (true) {
    case $method === 'GET' && $action === '': testimonials_list_public(); break;
    case $method === 'POST' && $action === '': testimonials_create(); break;
    case $method === 'GET' && $action === 'all': testimonials_list_admin(); break;
    case $method === 'PATCH' && $action: testimonials_update($action); break;
    case $method === 'DELETE' && $action: testimonials_remove($action); break;
    default: json_error('Testimonials endpoint not found', 404);
}
