<?php
declare(strict_types=1);

/**
 * Coupons Controller
 * Reference: backend/src/modules/coupons/routes.ts (90 lines)
 */

function coupons_active_campaign(): void
{
    $db = get_db();
    $now = date('Y-m-d H:i:s');
    $stmt = $db->prepare('SELECT * FROM coupons WHERE active = 1 AND featured_on_store = 1 AND (valid_from IS NULL OR valid_from <= ?) AND (valid_to IS NULL OR valid_to >= ?) ORDER BY priority DESC, updated_at DESC LIMIT 1');
    $stmt->execute([$now, $now]);
    $coupon = $stmt->fetch();

    if (!$coupon) {
        json_success(null);
        return;
    }

    $discountDisplay = $coupon['discount_type'] === 'percentage'
        ? "{$coupon['discount_value']}% OFF"
        : "Flat ₹{$coupon['discount_value']} OFF";

    $details = [];
    if ((float)$coupon['min_order_amount'] > 0) $details[] = "Min order ₹{$coupon['min_order_amount']}";
    if ($coupon['max_discount'] && $coupon['discount_type'] === 'percentage') $details[] = "Max discount ₹{$coupon['max_discount']}";

    json_success([
        'id' => (string)$coupon['id'],
        'name' => $coupon['name'] ?: $coupon['code'],
        'code' => $coupon['code'],
        'campaignType' => $coupon['campaign_type'],
        'campaignLabel' => $coupon['campaign_label'] ?: null,
        'bannerText' => $coupon['banner_text'] ?: "{$discountDisplay} with code {$coupon['code']}",
        'discountType' => $coupon['discount_type'],
        'discountValue' => (float)$coupon['discount_value'],
        'discountDisplay' => $discountDisplay,
        'details' => !empty($details) ? implode(' • ', $details) : null,
        'validTo' => $coupon['valid_to'],
    ]);
}

function coupons_validate(): void
{
    $user = authenticate();
    $body = get_request_body();
    $code = strtoupper(trim($body['code'] ?? ''));
    $subtotal = (float)($body['subtotal'] ?? 0);

    if (!$code) json_error('Coupon code required', 400);

    $db = get_db();
    $now = date('Y-m-d H:i:s');
    $stmt = $db->prepare('SELECT * FROM coupons WHERE code = ? AND active = 1 AND (valid_from IS NULL OR valid_from <= ?) AND (valid_to IS NULL OR valid_to >= ?)');
    $stmt->execute([$code, $now, $now]);
    $coupon = $stmt->fetch();
    if (!$coupon) json_error('Invalid or expired coupon', 404);
    if ($coupon['usage_limit'] && $coupon['used_count'] >= $coupon['usage_limit']) json_error('Coupon usage limit reached', 400);
    if ($subtotal > 0 && $subtotal < (float)$coupon['min_order_amount']) json_error("Minimum order ₹{$coupon['min_order_amount']}", 400);

    $discount = 0;
    if ($coupon['discount_type'] === 'percentage') {
        $discount = round($subtotal * (float)$coupon['discount_value'] / 100);
        if ($coupon['max_discount']) $discount = min($discount, (float)$coupon['max_discount']);
    } else {
        $discount = (float)$coupon['discount_value'];
    }

    json_success([
        'code' => $coupon['code'],
        'discountType' => $coupon['discount_type'],
        'discountValue' => (float)$coupon['discount_value'],
        'discount' => $discount,
        'description' => $coupon['description'],
    ]);
}
