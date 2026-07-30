#!/bin/bash
# Comprehensive API test suite for Feelinga
BASE="http://localhost:8000/api/v1"
PASS=0
FAIL=0
RESULTS=""

log_result() {
    local name="$1"
    local expected="$2"
    local actual="$3"
    local body="$4"
    if [[ "$actual" == "$expected" ]]; then
        PASS=$((PASS + 1))
        RESULTS+="PASS|$name|$actual\n"
    else
        FAIL=$((FAIL + 1))
        RESULTS+="FAIL|$name|expected=$expected got=$actual|${body:0:200}\n"
    fi
}

# --- Login admin ---
ADMIN_RESP=$(curl -s -X POST -H 'Content-Type: application/json' \
    -d '{"email":"admin@feelinga.com","password":"Admin@123"}' "$BASE/auth/login")
ADMIN_TOKEN=$(echo "$ADMIN_RESP" | python -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null)
ADMIN_REFRESH=$(echo "$ADMIN_RESP" | python -c "import sys,json; print(json.load(sys.stdin)['data']['refreshToken'])" 2>/dev/null)

# --- Login customer ---
CUST_RESP=$(curl -s -X POST -H 'Content-Type: application/json' \
    -d '{"email":"test@example.com","password":"Test@1234"}' "$BASE/auth/login")
CUST_TOKEN=$(echo "$CUST_RESP" | python -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null)
CUST_REFRESH=$(echo "$CUST_RESP" | python -c "import sys,json; print(json.load(sys.stdin)['data']['refreshToken'])" 2>/dev/null)

echo "=== HEALTH ==="
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' "$BASE/health")
log_result "Health Check" "200" "$CODE" "$(cat /tmp/fbody)"

echo "=== PRODUCTS ==="
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' "$BASE/products")
log_result "Products List" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' "$BASE/products?page=1&limit=3")
log_result "Products Pagination" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' "$BASE/products?type=Black+Tea")
log_result "Products Filter by Type" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' "$BASE/products?sort=price")
log_result "Products Sort by Price" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' "$BASE/products?isBestSeller=true")
log_result "Products Best Sellers" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' "$BASE/products?isNewArrival=true")
log_result "Products New Arrivals" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' "$BASE/products/search?q=darjeeling")
log_result "Products Search" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' "$BASE/products/search?q=a")
log_result "Products Search (too short)" "400" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' "$BASE/products/autocomplete?q=ass")
log_result "Products Autocomplete" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' "$BASE/products/darjeeling-first-flush")
log_result "Product by Slug" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' "$BASE/products/nonexistent-slug")
log_result "Product Not Found" "404" "$CODE" "$(cat /tmp/fbody)"

echo "=== AUTH ==="
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
    -d '{"name":"New User","email":"newuser@test.com","password":"NewP@ss123"}' "$BASE/auth/register")
log_result "Register New User" "201" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
    -d '{"name":"New User","email":"newuser@test.com","password":"NewP@ss123"}' "$BASE/auth/register")
log_result "Register Duplicate" "409" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
    -d '{"email":"admin@feelinga.com","password":"Admin@123"}' "$BASE/auth/login")
log_result "Login Admin" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
    -d '{"email":"admin@feelinga.com","password":"wrong"}' "$BASE/auth/login")
log_result "Login Wrong Password" "401" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -H "Authorization: Bearer $CUST_TOKEN" "$BASE/auth/me")
log_result "Auth Me (customer)" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/auth/me")
log_result "Auth Me (admin)" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
    -d "{\"refreshToken\":\"$CUST_REFRESH\"}" "$BASE/auth/refresh")
log_result "Auth Refresh" "200" "$CODE" "$(cat /tmp/fbody)"
# Update customer token after refresh
NEW_CUST_TOKEN=$(cat /tmp/fbody | python -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null)
if [ -n "$NEW_CUST_TOKEN" ]; then CUST_TOKEN="$NEW_CUST_TOKEN"; fi

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
    -d '{"email":"admin@feelinga.com"}' "$BASE/auth/check-email")
log_result "Check Email (exists)" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
    -d '{"email":"nobody@test.com"}' "$BASE/auth/check-email")
log_result "Check Email (not exists)" "200" "$CODE" "$(cat /tmp/fbody)"

echo "=== PROFILE ==="
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X PATCH -H "Authorization: Bearer $CUST_TOKEN" \
    -H 'Content-Type: application/json' -d '{"name":"Updated Name","phone":"+919876543210"}' "$BASE/auth/profile")
log_result "Update Profile" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X PATCH -H "Authorization: Bearer $CUST_TOKEN" \
    -H 'Content-Type: application/json' -d '{"currentPassword":"Test@1234","newPassword":"Test@12345"}' "$BASE/auth/password")
log_result "Change Password" "200" "$CODE" "$(cat /tmp/fbody)"

# Change password back
curl -s -o /dev/null -X PATCH -H "Authorization: Bearer $CUST_TOKEN" \
    -H 'Content-Type: application/json' -d '{"currentPassword":"Test@12345","newPassword":"Test@1234"}' "$BASE/auth/password"

echo "=== ADDRESSES ==="
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X POST -H "Authorization: Bearer $CUST_TOKEN" \
    -H 'Content-Type: application/json' -d '{"fullName":"Test User","phone":"9876543210","addressLine1":"123 Main St","city":"Mumbai","state":"Maharashtra","pincode":"400001"}' "$BASE/auth/address")
log_result "Add Address" "201" "$CODE" "$(cat /tmp/fbody)"
ADDR_ID=$(cat /tmp/fbody | python -c "import sys,json; d=json.load(sys.stdin); print(d['data']['addresses'][0]['id'])" 2>/dev/null)

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X PATCH -H "Authorization: Bearer $CUST_TOKEN" \
    -H 'Content-Type: application/json' -d '{"fullName":"Updated User"}' "$BASE/auth/address/$ADDR_ID")
log_result "Update Address" "200" "$CODE" "$(cat /tmp/fbody)"

echo "=== CART ==="
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -H "Authorization: Bearer $CUST_TOKEN" "$BASE/cart")
log_result "Cart Get (empty)" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X POST -H "Authorization: Bearer $CUST_TOKEN" \
    -H 'Content-Type: application/json' -d '{"productId":1,"size":"100g","qty":2}' "$BASE/cart/items")
log_result "Cart Add Item" "201" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -H "Authorization: Bearer $CUST_TOKEN" "$BASE/cart")
log_result "Cart Get (with items)" "200" "$CODE" "$(cat /tmp/fbody)"
CART_ITEM_ID=$(cat /tmp/fbody | python -c "import sys,json; d=json.load(sys.stdin); print(d['data']['items'][0]['id'])" 2>/dev/null)

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X PATCH -H "Authorization: Bearer $CUST_TOKEN" \
    -H 'Content-Type: application/json' -d '{"qty":3}' "$BASE/cart/items/$CART_ITEM_ID")
log_result "Cart Update Item" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X DELETE -H "Authorization: Bearer $CUST_TOKEN" "$BASE/cart/items/$CART_ITEM_ID")
log_result "Cart Remove Item" "200" "$CODE" "$(cat /tmp/fbody)"

echo "=== REVIEWS ==="
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' "$BASE/reviews?productId=1")
log_result "Reviews List" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X POST -H "Authorization: Bearer $CUST_TOKEN" \
    -H 'Content-Type: application/json' -d '{"productId":2,"rating":5,"title":"Great tea","body":"Love it!"}' "$BASE/reviews")
log_result "Review Create" "201" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X POST -H "Authorization: Bearer $CUST_TOKEN" \
    -H 'Content-Type: application/json' -d '{"productId":2,"rating":4,"title":"Dupe","body":"Dup review"}' "$BASE/reviews")
log_result "Review Duplicate" "400" "$CODE" "$(cat /tmp/fbody)"

echo "=== WISHLIST ==="
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X POST -H "Authorization: Bearer $CUST_TOKEN" "$BASE/auth/wishlist/1")
log_result "Toggle Wishlist (add)" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -H "Authorization: Bearer $CUST_TOKEN" "$BASE/auth/wishlist")
log_result "Get Wishlist" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X POST -H "Authorization: Bearer $CUST_TOKEN" "$BASE/auth/wishlist/1")
log_result "Toggle Wishlist (remove)" "200" "$CODE" "$(cat /tmp/fbody)"

echo "=== CONTACT ==="
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
    -d '{"name":"John","email":"john@test.com","message":"Hello!"}' "$BASE/contact")
log_result "Contact Submit" "201" "$CODE" "$(cat /tmp/fbody)"

echo "=== NEWSLETTER ==="
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
    -d '{"email":"newsletter@test.com"}' "$BASE/newsletter")
log_result "Newsletter Subscribe" "201" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
    -d '{"email":"newsletter@test.com"}' "$BASE/newsletter")
log_result "Newsletter Duplicate" "200" "$CODE" "$(cat /tmp/fbody)"

echo "=== TESTIMONIALS ==="
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' "$BASE/testimonials")
log_result "Testimonials Public" "200" "$CODE" "$(cat /tmp/fbody)"

echo "=== COUPONS ==="
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' "$BASE/coupons/campaign")
log_result "Coupons Campaign" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X POST -H "Authorization: Bearer $CUST_TOKEN" \
    -H 'Content-Type: application/json' -d '{"code":"WELCOME10","subtotal":500}' "$BASE/coupons/validate")
log_result "Coupon Validate" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X POST -H "Authorization: Bearer $CUST_TOKEN" \
    -H 'Content-Type: application/json' -d '{"code":"INVALID123","subtotal":500}' "$BASE/coupons/validate")
log_result "Coupon Invalid" "404" "$CODE" "$(cat /tmp/fbody)"

echo "=== ORDERS ==="
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X POST -H "Authorization: Bearer $CUST_TOKEN" \
    -H 'Content-Type: application/json' -d '{"items":[{"productId":1,"size":"100g","qty":1}],"shippingAddress":{"firstName":"Test","lastName":"User","line1":"123 St","city":"Mumbai","state":"MH","pincode":"400001","phone":"9876543210"},"paymentMethod":"cod"}' "$BASE/orders")
log_result "Create Order" "201" "$CODE" "$(cat /tmp/fbody)"
ORDER_ID=$(cat /tmp/fbody | python -c "import sys,json; d=json.load(sys.stdin); print(d['data']['_id'])" 2>/dev/null)

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -H "Authorization: Bearer $CUST_TOKEN" "$BASE/orders")
log_result "Orders List (customer)" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -H "Authorization: Bearer $CUST_TOKEN" "$BASE/orders/$ORDER_ID")
log_result "Order Get by ID" "200" "$CODE" "$(cat /tmp/fbody)"

echo "=== ADMIN ==="
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/admin")
log_result "Admin Dashboard" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/admin/activity")
log_result "Admin Activity" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/admin/users")
log_result "Admin Users" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/admin/low-stock")
log_result "Admin Low Stock" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/admin/coupons")
log_result "Admin Coupons" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/admin/export/orders")
log_result "Admin Export Orders" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/admin/export/products")
log_result "Admin Export Products" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/admin/export/users")
log_result "Admin Export Users" "200" "$CODE" "$(cat /tmp/fbody)"

# Admin update order status
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X PATCH -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H 'Content-Type: application/json' -d '{"status":"confirmed"}' "$BASE/orders/$ORDER_ID/status")
log_result "Admin Update Order Status" "200" "$CODE" "$(cat /tmp/fbody)"

# Admin update tracking
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X PATCH -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H 'Content-Type: application/json' -d '{"trackingNumber":"TRK123","trackingUrl":"https://track.example.com/TRK123"}' "$BASE/admin/orders/$ORDER_ID/tracking")
log_result "Admin Update Tracking" "200" "$CODE" "$(cat /tmp/fbody)"

# Admin create coupon
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H 'Content-Type: application/json' -d '{"name":"Test Coupon","code":"TEST20","discountType":"percentage","discountValue":20,"validFrom":"2026-01-01","validTo":"2027-12-31","active":true}' "$BASE/admin/coupons")
log_result "Admin Create Coupon" "201" "$CODE" "$(cat /tmp/fbody)"
NEW_COUPON_ID=$(cat /tmp/fbody | python -c "import sys,json; d=json.load(sys.stdin); print(d['data']['id'])" 2>/dev/null)

# Admin update coupon
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X PATCH -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H 'Content-Type: application/json' -d '{"discountValue":25}' "$BASE/admin/coupons/$NEW_COUPON_ID")
log_result "Admin Update Coupon" "200" "$CODE" "$(cat /tmp/fbody)"

# Admin delete coupon
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X DELETE -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/admin/coupons/$NEW_COUPON_ID")
log_result "Admin Delete Coupon" "204" "$CODE" "$(cat /tmp/fbody)"

# Admin create product
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H 'Content-Type: application/json' -d '{"slug":"test-product","name":"Test Product","type":"Black Tea","description":"Test description","origin":"Test","prices":{"100g":299},"brewingInstructions":{"temperature":"90°C","steepTime":"3-4 min","amount":"1 tsp"}}' "$BASE/products")
log_result "Admin Create Product" "201" "$CODE" "$(cat /tmp/fbody)"

# Admin update product
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X PATCH -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H 'Content-Type: application/json' -d '{"name":"Updated Test Product","stock":50}' "$BASE/products/7")
log_result "Admin Update Product" "200" "$CODE" "$(cat /tmp/fbody)"

# Admin soft-delete product
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X DELETE -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/products/7")
log_result "Admin Delete Product" "204" "$CODE" "$(cat /tmp/fbody)"

# Testimonials admin
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/testimonials/all")
log_result "Admin Testimonials List" "200" "$CODE" "$(cat /tmp/fbody)"

CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H 'Content-Type: application/json' -d '{"author":"Test Person","text":"Great tea!","rating":5,"approved":true}' "$BASE/testimonials")
log_result "Admin Create Testimonial" "201" "$CODE" "$(cat /tmp/fbody)"

# Contact messages admin
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/contact")
log_result "Admin Contact Messages" "200" "$CODE" "$(cat /tmp/fbody)"

# Newsletter list admin
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/newsletter")
log_result "Admin Newsletter List" "200" "$CODE" "$(cat /tmp/fbody)"

# Order cancel
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X PATCH -H "Authorization: Bearer $CUST_TOKEN" \
    -H 'Content-Type: application/json' -d '{"reason":"Changed my mind"}' "$BASE/orders/$ORDER_ID/cancel")
log_result "Cancel Order (already confirmed)" "400" "$CODE" "$(cat /tmp/fbody)"

# Auth Forgot password
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
    -d '{"email":"test@example.com"}' "$BASE/auth/forgot-password")
log_result "Forgot Password" "200" "$CODE" "$(cat /tmp/fbody)"

# Data export
CODE=$(curl -s -o /tmp/fbody -w '%{http_code}' -H "Authorization: Bearer $CUST_TOKEN" "$BASE/auth/data-export")
log_result "Data Export" "200" "$CODE" "$(cat /tmp/fbody)"

echo ""
echo "=================================================="
echo "           FINAL RESULTS"
echo "=================================================="
echo -e "$RESULTS" | while IFS='|' read status name details extra; do
    [ -z "$status" ] && continue
    if [ "$status" = "PASS" ]; then
        echo "  ✅ $name [$details]"
    else
        echo "  ❌ $name [$details] $extra"
    fi
done
echo ""
echo "PASSED: $PASS"
echo "FAILED: $FAIL"
echo "TOTAL:  $((PASS + FAIL))"
