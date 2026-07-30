<?php
declare(strict_types=1);

require_once __DIR__ . '/controller.php';
global $method, $segments;
$action = $segments[1] ?? '';

switch (true) {
    case $method === 'GET' && $action === 'campaign': coupons_active_campaign(); break;
    case $method === 'POST' && $action === 'validate': coupons_validate(); break;
    default: json_error('Coupons endpoint not found', 404);
}
