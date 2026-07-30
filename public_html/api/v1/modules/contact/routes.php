<?php
declare(strict_types=1);

require_once __DIR__ . '/controller.php';
global $method, $segments;

$action = $segments[1] ?? '';
$param = $segments[2] ?? '';

// Newsletter is mounted under /newsletter in router, but also handled here
$module = $segments[0] ?? '';
$isNewsletter = ($module === 'newsletter');

switch (true) {
    // Newsletter routes
    case $isNewsletter && $method === 'POST' && $action === '':
        newsletter_subscribe();
        break;
    case $isNewsletter && $method === 'DELETE' && $action === '':
        newsletter_unsubscribe();
        break;
    case $isNewsletter && $method === 'GET' && $action === '':
        newsletter_list_subscribers();
        break;

    // Contact routes
    case !$isNewsletter && $method === 'POST' && $action === '':
        contact_submit();
        break;
    case !$isNewsletter && $method === 'GET' && $action === '':
        contact_list_messages();
        break;
    case !$isNewsletter && $method === 'PATCH' && $action:
        contact_update_status($action);
        break;

    default:
        json_error('Contact endpoint not found', 404);
}
