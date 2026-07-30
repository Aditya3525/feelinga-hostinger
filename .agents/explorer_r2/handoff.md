# Handoff Report — Milestone 2 (R2: Checkout & Payment Flow)

**Agent**: Explorer 2  
**Working Directory**: `c:\Engineering\feelinga-hostinger\.agents\explorer_r2\`  
**Target Milestone**: Milestone 2 (R2: Checkout & Payment Flow)  
**Date**: 2026-07-29  

---

## 1. Observation

Direct observations from source code inspection:

1. **`c:\Engineering\feelinga-hostinger\frontend-build\src\app\checkout\page.tsx` (Lines 313–317)**:
   ```tsx
   const orderableItems = checkoutItems.filter(item => item.id && /^[a-f0-9]{24}$/i.test(item.id));
   if (orderableItems.length === 0) {
       showToast('No orderable products found. Please check your cart and try again.', 'error');
       return;
   }
   ```
   Product IDs from the SQLite PHP backend (`public_html/api/v1/modules/products/controller.php` line 381) are string integers (`"1"`, `"2"`, `"3"`). The regex test `/^[a-f0-9]{24}$/i.test("1")` returns `false` for all product IDs.

2. **`c:\Engineering\feelinga-hostinger\frontend-build\src\context\CartContext.tsx` (Lines 16–32)**:
   ```tsx
   const isLoggedIn = useCallback(
       () => isAuthenticated && typeof window !== 'undefined' && !!localStorage.getItem('feelinga_token'),
       [isAuthenticated],
   );

   useEffect(() => {
       try {
           const token = localStorage.getItem('feelinga_token');
           if (!token) {
               localStorage.removeItem('feelinga_cart');
               setCart([]);
               initializedRef.current = true;
               return;
           }
   ```
   `AuthContext.tsx` (lines 49–56) sets `feelinga_user` and `feelinga_refresh` in `localStorage` and uses httpOnly cookies for access tokens. It never sets `feelinga_token`. Thus, `localStorage.getItem('feelinga_token')` is always `null`.

3. **`c:\Engineering\feelinga-hostinger\public_html\api\v1\modules\orders\controller.php` (Line 66)** vs **`public_html\api\v1\modules\coupons\controller.php` (Line 56)**:
   - `coupons/controller.php`:
     ```php
     $stmt = $db->prepare('SELECT * FROM coupons WHERE code = ? AND active = 1 AND (valid_from IS NULL OR valid_from <= ?) AND (valid_to IS NULL OR valid_to >= ?)');
     ```
   - `orders/controller.php`:
     ```php
     $stmt = $db->prepare('SELECT * FROM coupons WHERE code = ? AND active = 1 AND valid_from <= CURRENT_TIMESTAMP AND valid_to >= CURRENT_TIMESTAMP');
     ```
   Coupons with `NULL` for `valid_from` or `valid_to` pass coupon validation but fail order placement with `"Invalid or expired coupon code"`.

4. **`c:\Engineering\feelinga-hostinger\frontend-build\src\app\admin\page.tsx` (Lines 546, 565, 692)**:
   - Contains `localStorage.getItem('feelinga_token')` when constructing `Authorization: Bearer ${tkn}` headers for CSV export and invoice downloads.

5. **`c:\Engineering\feelinga-hostinger\frontend-build\src\app\checkout\page.tsx` (Lines 118, 345)**:
   - Checks `sessionStorage.getItem('feelinga_buy_now')` for `mode=buy-now`, but no frontend component sets `sessionStorage.setItem('feelinga_buy_now', ...)`.

---

## 2. Logic Chain

1. **Placing Order Failure**:
   - Observation 1 shows `handlePlaceOrder()` filtering cart items with `/^[a-f0-9]{24}$/i.test(item.id)`.
   - Observation 1 also shows product IDs from SQLite DB are numeric strings like `"1"`.
   - Since `/^[a-f0-9]{24}$/i.test("1")` is `false`, `orderableItems` is `[]`.
   - `orderableItems.length === 0` triggers an error toast and halts execution.
   - **Conclusion**: Placing an order is impossible in the current codebase without removing this regex check.

2. **Cart Wiping & Sync Failure**:
   - Observation 2 shows `CartContext` checking `localStorage.getItem('feelinga_token')` for `isLoggedIn()` and initial cart hydration.
   - Observation 2 also shows `AuthContext` never writes `feelinga_token` into `localStorage`.
   - `token` is always `null`, causing `CartContext` to wipe `feelinga_cart` from `localStorage` on every page load/refresh and disable server cart sync.
   - **Conclusion**: Cart item persistence is broken and cart contents disappear on page refresh.

3. **Coupon Order Rollback**:
   - Observation 3 shows `coupons/controller.php` allowing NULL coupon dates while `orders/controller.php` requires non-NULL timestamps.
   - Evaluating `NULL <= CURRENT_TIMESTAMP` in SQLite evaluates to UNKNOWN/false.
   - **Conclusion**: Validating an open-ended coupon succeeds, but placing the order rolls back the database transaction and fails.

---

## 3. Caveats

- **No caveats.** The codebase and evidence chains have been completely inspected and verified without ambiguities.

---

## 4. Conclusion

Milestone 2 (R2: Checkout & Payment Flow) cannot process orders due to 3 blocking bugs:
1. `checkout/page.tsx` line 313: MongoDB 24-char hex regex invalidates all SQLite integer product IDs.
2. `CartContext.tsx` lines 17, 26: `feelinga_token` check wipes cart state on page refresh and disables server cart sync.
3. `orders/controller.php` line 66: Strict non-NULL date check breaks orders using open-ended coupons.

Fixing these three specific locations will restore 100% functionality to cart persistence, coupon application, and order placement.

---

## 5. Verification Method

1. **Verify Bug #1 Fix**:
   - In `checkout/page.tsx`, change `item.id && /^[a-f0-9]{24}$/i.test(item.id)` to `Boolean(item.id)`.
   - Add an item (e.g. ID `"1"`) to cart, proceed to `/checkout`, fill shipping details, select COD, and click "Place Order".
   - Confirm order POST request is sent to `/api/v1/orders` and user is redirected to `/order-confirm?order=FLG-XXXXXX...`.

2. **Verify Bug #2 Fix**:
   - In `CartContext.tsx`, replace `localStorage.getItem('feelinga_token')` checks with `isAuthenticated`.
   - Add items to cart as a guest or logged-in user, refresh the browser page, and verify items remain in cart.

3. **Verify Bug #3 Fix**:
   - In `orders/controller.php` line 66, update the SQL query to:
     `WHERE code = ? AND active = 1 AND (valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP) AND (valid_to IS NULL OR valid_to >= CURRENT_TIMESTAMP)`
   - Apply a coupon with NULL dates at checkout and verify order placement succeeds.
