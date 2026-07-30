<?php
declare(strict_types=1);

/**
 * Email utility — PHPMailer
 * Reference: backend/src/utils/email.ts (183 lines)
 * All 4 email templates preserved exactly.
 */

require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

function get_mailer(): PHPMailer
{
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = env('SMTP_HOST', 'smtp.hostinger.com');
    $mail->SMTPAuth = true;
    $mail->Username = env('SMTP_USER');
    $mail->Password = env('SMTP_PASS');
    $mail->SMTPSecure = env('SMTP_SECURE', 'false') === 'true' ? PHPMailer::ENCRYPTION_STARTTLS : PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port = (int)env('SMTP_PORT', '587');
    $mail->CharSet = 'UTF-8';
    $mail->setFrom(env('EMAIL_FROM', 'noreply@feelinga.com'), 'Feelinga Tea');
    return $mail;
}

/**
 * Send password reset email
 * Ref: email.ts:58-76
 */
function send_password_reset_email(string $email, string $resetUrl): void
{
    $mail = get_mailer();
    $mail->addAddress($email);
    $mail->isHTML(true);
    $mail->Subject = 'Reset your Feelinga password';
    $mail->Body = <<<HTML
<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e5e1d8;border-radius:12px">
    <h2 style="color:#8b6f47;margin-top:0">Reset Your Password</h2>
    <p>You requested a password reset for your <strong>Feelinga</strong> account.</p>
    <p>Click the button below — the link expires in <strong>10 minutes</strong>.</p>
    <a href="{$resetUrl}" style="display:inline-block;padding:12px 28px;background:#8b6f47;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
        Reset Password
    </a>
    <p style="font-size:0.85rem;color:#888">If you didn't request this, you can safely ignore this email.</p>
    <hr style="border:none;border-top:1px solid #e5e1d8;margin:24px 0"/>
    <p style="font-size:0.8rem;color:#aaa;margin:0">Feelinga — happiness is here 🍵</p>
</div>
HTML;
    $mail->AltBody = "Reset your Feelinga password: {$resetUrl}\n\nThis link expires in 10 minutes.";
    $mail->send();
}

/**
 * Send order confirmation email
 * Ref: email.ts:78-117
 */
function send_order_confirmation_email(string $email, array $order): void
{
    $items = $order['items'] ?? [];
    $addr = $order['shippingAddress'] ?? [];
    $itemRows = '';
    foreach ($items as $item) {
        $total = number_format((float)$item['price'] * (int)$item['qty'], 0, '.', ',');
        $itemRows .= "<tr><td style=\"padding:8px;border-bottom:1px solid #eee\">{$item['name']} ({$item['size']})</td><td style=\"padding:8px;border-bottom:1px solid #eee;text-align:center\">{$item['qty']}</td><td style=\"padding:8px;border-bottom:1px solid #eee;text-align:right\">₹{$total}</td></tr>";
    }
    $sub = number_format((float)($order['subtotal'] ?? 0), 0, '.', ',');
    $tot = number_format((float)($order['total'] ?? 0), 0, '.', ',');
    $ship = ($order['shipping'] ?? 0) == 0 ? 'FREE' : '₹' . number_format((float)$order['shipping'], 0);
    $tax = number_format((float)($order['tax'] ?? 0), 0);
    $firstName = $addr['firstName'] ?? 'there';
    $orderNum = $order['orderNumber'] ?? $order['order_number'] ?? 'N/A';
    $payMethod = strtoupper($order['paymentMethod'] ?? $order['payment_method'] ?? 'COD');
    $address = htmlspecialchars($addr['line1'] ?? '');

    $mail = get_mailer();
    $mail->addAddress($email);
    $mail->isHTML(true);
    $mail->Subject = "Order Confirmed — {$orderNum}";
    $mail->Body = <<<HTML
<div style="font-family:system-ui,sans-serif;max-width:580px;margin:auto;padding:32px;border:1px solid #e5e1d8;border-radius:12px">
    <h2 style="color:#8b6f47;margin-top:0">Thank you for your order! 🍵</h2>
    <p>Hi {$firstName},</p>
    <p>Your order <strong>{$orderNum}</strong> has been placed successfully.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead><tr style="background:#f9f6f0"><th style="padding:8px;text-align:left">Item</th><th style="padding:8px;text-align:center">Qty</th><th style="padding:8px;text-align:right">Total</th></tr></thead>
        <tbody>{$itemRows}</tbody>
        <tfoot>
            <tr><td style="padding:8px" colspan="2"><strong>Subtotal</strong></td><td style="padding:8px;text-align:right">₹{$sub}</td></tr>
            <tr><td style="padding:8px" colspan="2">Shipping</td><td style="padding:8px;text-align:right">{$ship}</td></tr>
            <tr><td style="padding:8px" colspan="2">Tax (GST 5%)</td><td style="padding:8px;text-align:right">₹{$tax}</td></tr>
            <tr style="background:#f9f6f0"><td style="padding:8px" colspan="2"><strong>Total</strong></td><td style="padding:8px;text-align:right;font-weight:700;font-size:1.1rem">₹{$tot}</td></tr>
        </tfoot>
    </table>
    <p><strong>Payment:</strong> {$payMethod}</p>
    <hr style="border:none;border-top:1px solid #e5e1d8;margin:24px 0"/>
    <p style="font-size:0.8rem;color:#aaa;margin:0">Feelinga — happiness is here 🍵</p>
</div>
HTML;
    $mail->send();
}

/**
 * Send order status update email
 * Ref: email.ts:119-154
 */
function send_order_status_email(string $email, array $order, string $newStatus): void
{
    $statusMessages = [
        'confirmed' => '✅ Your order has been confirmed and is being prepared.',
        'processing' => '📦 Your order is being packed with care.',
        'shipped' => '🚚 Your order is on its way!',
        'delivered' => '🎉 Your order has been delivered. Enjoy your tea!',
        'cancelled' => '❌ Your order has been cancelled.',
    ];
    $msg = $statusMessages[$newStatus] ?? "Your order status has been updated to: {$newStatus}";
    $orderNum = $order['orderNumber'] ?? $order['order_number'] ?? 'N/A';
    $trackingHtml = '';
    if ($newStatus === 'shipped' && !empty($order['trackingNumber'])) {
        $trackUrl = $order['trackingUrl'] ?? '';
        $trackUrlHtml = $trackUrl ? "<p style=\"margin:8px 0 0\"><a href=\"{$trackUrl}\" style=\"color:#8b6f47;font-weight:600\">Track Your Shipment →</a></p>" : '';
        $trackingHtml = "<div style=\"background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0\"><strong>📦 Tracking Information</strong><p style=\"margin:8px 0 0\">Tracking Number: <strong>{$order['trackingNumber']}</strong></p>{$trackUrlHtml}</div>";
    }

    $mail = get_mailer();
    $mail->addAddress($email);
    $mail->isHTML(true);
    $mail->Subject = "Order {$orderNum} — " . ucfirst($newStatus);
    $mail->Body = <<<HTML
<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e5e1d8;border-radius:12px">
    <h2 style="color:#8b6f47;margin-top:0">Order Update</h2>
    <p>{$msg}</p>
    {$trackingHtml}
    <p><strong>Order:</strong> {$orderNum}<br><strong>Status:</strong> {$newStatus}</p>
    <hr style="border:none;border-top:1px solid #e5e1d8;margin:24px 0"/>
    <p style="font-size:0.8rem;color:#aaa;margin:0">Feelinga — happiness is here 🍵</p>
</div>
HTML;
    $mail->send();
}

/**
 * Send low stock alert to admin
 * Ref: email.ts:157-183
 */
function send_low_stock_alert(string $adminEmail, array $products): void
{
    $rows = '';
    foreach ($products as $p) {
        $stock = (int)($p['stock'] ?? 0);
        $color = $stock === 0 ? '#e74c3c' : '#f39c12';
        $rows .= "<tr><td style=\"padding:8px;border-bottom:1px solid #eee\">{$p['name']}</td><td style=\"padding:8px;border-bottom:1px solid #eee;text-align:center;color:{$color};font-weight:600\">{$stock}</td></tr>";
    }
    $count = count($products);

    $mail = get_mailer();
    $mail->addAddress($adminEmail);
    $mail->isHTML(true);
    $mail->Subject = "⚠️ Low Stock Alert — {$count} product(s)";
    $mail->Body = <<<HTML
<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e5e1d8;border-radius:12px">
    <h2 style="color:#e74c3c;margin-top:0">⚠️ Low Stock Alert</h2>
    <p>The following products are running low or out of stock:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead><tr style="background:#f9f6f0"><th style="padding:8px;text-align:left">Product</th><th style="padding:8px;text-align:center">Stock</th></tr></thead>
        <tbody>{$rows}</tbody>
    </table>
    <p>Please restock these items from the admin dashboard.</p>
    <hr style="border:none;border-top:1px solid #e5e1d8;margin:24px 0"/>
    <p style="font-size:0.8rem;color:#aaa;margin:0">Feelinga Admin — automated inventory alert</p>
</div>
HTML;
    $mail->send();
}
