# Milestone 2 (R2: Checkout & Payment Flow) Investigation & Analysis Report

**Target Repository**: `c:\Engineering\feelinga-hostinger`  
**Investigator**: Explorer 2  
**Date**: July 29, 2026  

---

## Executive Summary

An audit of the Feelinga Tea e-commerce app's Checkout & Payment Flow (Milestone 2 - R2) was conducted. The investigation covered the **Shopping Cart Drawer**, **Cart Context / Persistence layer**, **Checkout Page (`/checkout`)**, **Order API Endpoint (`/orders`)**, and **Order Confirmation Page (`/order-confirm/`)**.

**Key Finding**: The checkout flow is currently **completely non-functional** due to two blocking critical bugs and two secondary failure modes:
1. **Blocking Issue #1 (Regex ID mismatch)**: Placing an order fails 100% of the time with `"No orderable products found"` because `checkout/page.tsx` checks product IDs against a MongoDB 24-char hex regex (`/^[a-f0-9]{24}$/i`), whereas the hostinger backend uses SQLite integer IDs (`"1"`, `"2"`).
2. **Blocking Issue #2 (`feelinga_token` persistence bug)**: `CartContext.tsx` looks for `localStorage.getItem('feelinga_token')` which is **never set** by `AuthContext.tsx` (which uses httpOnly cookies). Consequently, the local cart is deleted from `localStorage` on every page refresh/navigation, and server cart sync is completely disabled.
3. **Blocking Issue #3 (Coupon NULL date evaluation)**: Validating a coupon with open dates succeeds at `/coupons/validate`, but placing the order fails in `orders/controller.php` due to SQL `NULL` comparisons (`valid_from <= CURRENT_TIMESTAMP`), rolling back the order transaction.

---

## Detailed Evidence & Analysis

### 1. Shopping Cart Drawer & Checkout Navigation Audit

#### Component Location
- `c:\Engineering\feelinga-hostinger\frontend-build\src\components\Layout.tsx` (Lines 391–458)
- `c:\Engineering\feelinga-hostinger\frontend-build\src\context\CartContext.tsx` (Lines 1–200)

#### Observations & Findings
- **Drawer Controls**: The drawer opening, closing, trap focus, keyboard escape key, backdrop tap, and item quantity increment/decrement (`updateQty`) buttons work as expected in UI.
- **Subtotal & Shipping Calculation**:
  - `subtotal` is calculated in `CartContext.tsx` line 185: `cart.reduce((sum, i) => sum + i.price * i.qty, 0)`.
  - `shipping` is calculated in line 186: `subtotal >= 999 ? 0 : 79`.
  - Progress towards free shipping is correctly rendered in `Layout.tsx` lines 410–422.
- **Checkout Trigger Button**:
  - `Layout.tsx` line 455: `<Link href="/checkout" className="btn btn--primary btn-block" onClick={() => setCartOpen(false)}>Checkout</Link>`
  - Successfully routes to `/checkout`.

---

### 2. Cart Item State Persistence & Hydration Bug Analysis

#### Primary Bug Location
- `c:\Engineering\feelinga-hostinger\frontend-build\src\context\CartContext.tsx` (Lines 16–48)
- `c:\Engineering\feelinga-hostinger\frontend-build\src\context\AuthContext.tsx` (Lines 49–56)

#### Code Snippets
In `AuthContext.tsx`:
```tsx
49: const persist = (userData: UserProfile, _accessToken: string, refreshToken: string) => {
50:     // Access token is set as httpOnly cookie by the server — do not store in localStorage.
51:     localStorage.setItem('feelinga_user', JSON.stringify(userData));
52:     localStorage.setItem('feelinga_refresh', refreshToken);
53:     setUser(userData);
54:     setIsAuthenticated(true);
55:     setIsAdmin(userData.role === 'admin');
56: };
```

In `CartContext.tsx`:
```tsx
16: const isLoggedIn = useCallback(
17:     () => isAuthenticated && typeof window !== 'undefined' && !!localStorage.getItem('feelinga_token'),
18:     [isAuthenticated],
19: );
...
24: useEffect(() => {
25:     try {
26:         const token = localStorage.getItem('feelinga_token');
27:         if (!token) {
28:             localStorage.removeItem('feelinga_cart');
29:             setCart([]);
30:             initializedRef.current = true;
31:             return;
32:         }
```

#### Evidence Chain & Impact
1. `AuthContext.tsx` stores access token as an httpOnly cookie (`access_token`) and only writes `feelinga_user` and `feelinga_refresh` into `localStorage`. `feelinga_token` is **never set** in `localStorage`.
2. `CartContext.tsx` relies on `localStorage.getItem('feelinga_token')`:
   - `isLoggedIn()` (line 17) evaluates `!localStorage.getItem('feelinga_token')` to `false` for ALL users (authenticated or guest).
   - Because `isLoggedIn()` is `false`, `fetchServerCart()` and `syncCartOnLogin()` return immediately without syncing or fetching items from `/api/v1/cart`.
   - On initial mount or page refresh (line 26), `!token` is `true`. `CartContext` executes `localStorage.removeItem('feelinga_cart')` and `setCart([])`.
3. **User Impact**:
   - Cart contents are **immediately wiped on page refresh or navigation**.
   - Server cart syncing for logged-in users is completely broken.

---

### 3. Order Placement & Checkout Button Validation Bug Analysis

#### Primary Bug Location
- `c:\Engineering\feelinga-hostinger\frontend-build\src\app\checkout\page.tsx` (Lines 311–321)

#### Code Snippets
```tsx
311: const handlePlaceOrder = async () => {
312:     if (!isAuthenticated) { openAuthModal(); return; }
313:     const orderableItems = checkoutItems.filter(item => item.id && /^[a-f0-9]{24}$/i.test(item.id));
314:     if (orderableItems.length === 0) {
315:         showToast('No orderable products found. Please check your cart and try again.', 'error');
316:         return;
317:     }
318:     if (orderableItems.length < checkoutItems.length) {
319:         showToast(`${checkoutItems.length - orderableItems.length} item(s) were skipped because they are not orderable.`, 'info');
320:     }
```

#### Evidence Chain & Impact
1. The backend product database (`public_html/api/v1/modules/products/controller.php` line 381) formats product IDs as stringified integers (e.g. `"1"`, `"2"`, `"3"`).
2. The regular expression `/^[a-f0-9]{24}$/i` checks for 24-character hexadecimal MongoDB ObjectIds.
3. For numeric IDs, `/^[a-f0-9]{24}$/i.test("1")` returns `false`.
4. Therefore, `orderableItems` evaluates to `[]` (empty array).
5. Line 314 checks `orderableItems.length === 0`, shows the toast `"No orderable products found. Please check your cart and try again."`, and exits.
6. **User Impact**:
   - "Place Order" button **never succeeds**. No user can complete a purchase.

---

### 4. Coupon Validation SQL Query Discrepancy Bug Analysis

#### Primary Bug Locations
- `c:\Engineering\feelinga-hostinger\public_html\api\v1\modules\coupons\controller.php` (Line 56)
- `c:\Engineering\feelinga-hostinger\public_html\api\v1\modules\orders\controller.php` (Line 66)

#### Code Snippets
In `coupons/controller.php` (`coupons_validate`):
```php
56: $stmt = $db->prepare('SELECT * FROM coupons WHERE code = ? AND active = 1 AND (valid_from IS NULL OR valid_from <= ?) AND (valid_to IS NULL OR valid_to >= ?)');
```

In `orders/controller.php` (`orders_create`):
```php
66: $stmt = $db->prepare('SELECT * FROM coupons WHERE code = ? AND active = 1 AND valid_from <= CURRENT_TIMESTAMP AND valid_to >= CURRENT_TIMESTAMP');
```

#### Evidence Chain & Impact
1. When a coupon has open start/end dates (`valid_from` or `valid_to` set to `NULL`), it passes validation at `/coupons/validate` (line 56).
2. The frontend applies the coupon and shows the updated discount amount.
3. When `orders_create()` runs during order submission, line 66 requires `valid_from <= CURRENT_TIMESTAMP AND valid_to >= CURRENT_TIMESTAMP`.
4. In SQLite, comparing `NULL <= CURRENT_TIMESTAMP` yields `NULL` (false).
5. Line 69 triggers: `$db->rollBack(); json_error('Invalid or expired coupon code', 400);`.
6. **User Impact**:
   - Any order using a coupon with `NULL` dates is rejected by the backend during checkout.

---

### 5. Summary of Identified Bugs & Prioritized Recommendations

| Bug # | Severity | Location | Root Cause | Proposed Fix |
|---|---|---|---|---|
| **1** | **CRITICAL** (Blocker) | `frontend-build/src/app/checkout/page.tsx`:313 | RegEx `/^[a-f0-9]{24}$/i.test(item.id)` rejects numeric IDs. | Remove MongoDB ObjectId regex test; check `Boolean(item.id)` instead. |
| **2** | **CRITICAL** (Blocker) | `frontend-build/src/context/CartContext.tsx`:17,26 | `CartContext` checks nonexistent `feelinga_token` instead of `isAuthenticated`. | Replace `feelinga_token` check with `isAuthenticated` and/or `feelinga_user` / auth state. |
| **3** | **CRITICAL** (Blocker) | `public_html/api/v1/modules/orders/controller.php`:66 | SQL query omits `valid_from IS NULL` handling for coupons. | Update query to `(valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP) AND (valid_to IS NULL OR valid_to >= CURRENT_TIMESTAMP)`. |
| **4** | **HIGH** | `frontend-build/src/app/admin/page.tsx`:546,565,692 | Admin exports/invoices check `feelinga_token` instead of cookies / `feelinga_refresh`. | Remove invalid `feelinga_token` localStorage read. |
| **5** | **MEDIUM** | `frontend-build/src/app/checkout/page.tsx`:118 | Buy Now mode checks `sessionStorage` key never set by product pages. | Implement `sessionStorage.setItem('feelinga_buy_now', ...)` on product pages when clicking "Buy Now". |
