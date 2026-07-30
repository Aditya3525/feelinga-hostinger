<?php
declare(strict_types=1);

require_once __DIR__ . '/controller.php';
global $method, $segments;
$action = $segments[1] ?? '';

switch (true) {
    case $method === 'POST' && $action === 'images': upload_images(); break;
    case $method === 'DELETE' && $action === 'images': upload_delete_image(); break;
    default: json_error('Upload endpoint not found', 404);
}
