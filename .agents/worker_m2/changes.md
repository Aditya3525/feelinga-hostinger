# Changes Introduced for Milestone 2 (R2: Checkout & Payment Flow)

## 1. Product ID Validation Fix (Bug #1)
- **File**: `frontend-build/src/app/checkout/page.tsx`
- **Change**: Replaced regex check `/^[a-f0-9]{24}$/i.test(item.id)` with `Boolean(item.id)` in line 313.
- **Rationale**: SQLite product IDs in the PHP backend are numeric strings (e.g., `"1"`, `"2"`), which failed the 24-character hexadecimal MongoDB regex, preventing all checkout item processing.

## 2. Cart Persistence & LocalStorage Fix (Bug #2)
- **File 1**: `frontend-build/src/context/CartContext.tsx`
  - Replaced `localStorage.getItem('feelinga_token')` in `isLoggedIn()` with `isAuthenticated || (typeof window !== 'undefined' && !!localStorage.getItem('feelinga_user'))`.
  - Removed the `token` check on mount in `useEffect`, allowing `localStorage.getItem('feelinga_cart')` to hydrate cart state across page refreshes for both guest and authenticated users.
- **File 2**: `frontend-build/src/app/admin/page.tsx`
  - Replaced `localStorage.getItem('feelinga_token')` checks in `exportCSV`, `downloadInvoice`, and `uploadImages` with `feelinga_user` check.
  - Added `credentials: 'include'` to `fetch()` calls to pass httpOnly auth cookies to PHP backend endpoints.

## 3. Coupon Verification SQL Query Fix (Bug #3)
- **File**: `public_html/api/v1/modules/orders/controller.php`
  - Updated SQL query on line 66:
    `WHERE code = ? AND active = 1 AND (valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP) AND (valid_to IS NULL OR valid_to >= CURRENT_TIMESTAMP)`
  - **Rationale**: Allowed open-ended coupons (where `valid_from` or `valid_to` is `NULL`) to pass verification when placing an order, matching `coupons/controller.php`.

## 4. Verification & Build Confirmation
- Executed `npm run build` in `frontend-build/` using PowerShell: Output confirmed 100% successful build with zero errors across all static routes (`/checkout`, `/admin`, `/order-confirm`, etc.).
