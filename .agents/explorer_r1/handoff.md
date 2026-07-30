# Handoff Report: Explorer 1 (Milestone 1 - Product Navigation & Detail Routes)

**Working Directory**: `c:\Engineering\feelinga-hostinger\.agents\explorer_r1\`  
**Target File**: `c:\Engineering\feelinga-hostinger\.agents\explorer_r1\handoff.md`  
**Date**: 2026-07-29

---

## 1. Observation

1. **`frontend-build/src/components/ProductCard.tsx`**
   - **Line 41**: `const href = linkHref ?? \`/product/\${product.slug}\`;`
   - **Lines 67 & 80**: `<Link href={href}>` (wraps image and title).
2. **`frontend-build/src/app/page.tsx`**
   - **Lines 303-310 & 318-326**: `ProductCard` rendered for `newArrivals` and `bestSellers` without `linkHref`, defaulting to `/product/${p.slug}`.
   - **Line 385**: `{c.slug && <Link href={\`/product/\${c.slug}\`} className="btn btn--ghost btn--sm mt-sm">View Details</Link>}`.
3. **`frontend-build/src/app/shop/page.tsx`**
   - **Lines 328-336**: `ProductCard` rendered for fetched catalog products, defaulting to `/product/${p.slug}`.
4. **`frontend-build/src/app/wishlist/page.tsx`**
   - **Lines 153 & 160**: `<Link href={\`/product/\${p.slug}\`}>`.
5. **`frontend-build/src/app/product/page.tsx`**
   - **Lines 1-6**:
     ```tsx
     import { redirect } from 'next/navigation';

     // Redirect bare /product to /shop — individual products use /product/[slug]
     export default function ProductRedirect() {
         redirect('/shop');
     }
     ```
6. **Next.js App Router Structure Search**
   - Executed `find_by_name` for `*slug*` in `frontend-build/src/app`.
   - Result: `Found 0 results`. No `src/app/product/[slug]` folder or `page.tsx` exists.
7. **`frontend-build/next.config.mjs`**
   - **Lines 2-4**:
     ```javascript
     const nextConfig = {
         output: 'export',
         trailingSlash: true,
     ```
8. **`public_html/.htaccess`**
   - **Lines 50-53**:
     ```apache
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteCond %{REQUEST_URI} !^/(api|uploads|images|_next)/
     RewriteRule ^(.*)$ /index.html [L]
     ```
9. **`public_html/api/v1/modules/products/routes.php` & `controller.php`**
   - **`routes.php` Line 28**: `products_get_by_slug($action);`
   - **`controller.php` Lines 156-166**: `products_get_by_slug(string $slug)` executes SQL `SELECT * FROM products WHERE slug = ? AND deleted_at IS NULL` and returns product JSON.

---

## 2. Logic Chain

1. **Observation 1, 2, 3, 4** demonstrate that frontend product cards, wishlist items, search autocomplete, and curated collection items generate hyperlinks pointing to `/product/[slug]` or `/product/[slug]/`.
2. **Observation 5 & 6** establish that while bare `/product` has a redirect page (`src/app/product/page.tsx`), the dynamic route `src/app/product/[slug]` is completely absent from `src/app/`.
3. **Observation 7** shows Next.js is configured for static site export (`output: 'export'`). Because `src/app/product/[slug]` is absent, `npm run build` generates no HTML files inside `out/product/<slug>/`.
4. **Observation 8** shows that Apache on Hostinger evaluates requests to `/product/<slug>/`. Because no static directory or file exists at `public_html/product/<slug>/`, Apache falls back to line 53 of `.htaccess` (`RewriteRule ^(.*)$ /index.html [L]`).
5. **Observation 9** confirms that `public_html/index.html` is the homepage landing page (`/`), causing all direct or reloaded visits to product card URLs to display the homepage landing page (`/`).
6. **Observation 9** also shows the PHP backend API is ready to serve product detail requests via `GET /api/v1/products/{slug}` once the frontend page is created.

---

## 3. Caveats

- **Static Export vs Dynamic Routing**: In Next.js static export mode (`output: 'export'`), static HTML pages must be generated at build time using `generateStaticParams()` in `src/app/product/[slug]/page.tsx`, or fallback routing configured on the web server. Pre-rendering via `generateStaticParams()` is recommended for optimal SEO and Hostinger compatibility.
- **`slug: null` on Home Page Curated Item**: Line 377 of `src/app/page.tsx` sets `slug: null` for "Aged Pu-erh Reserve", which currently bypasses link rendering.

---

## 4. Conclusion

- **Root Cause Identified**: The redirecting behavior to the landing page `/` occurs because **`src/app/product/[slug]/page.tsx` does not exist in the Next.js App Router codebase**, causing Next.js static export to omit `/product/[slug]/` HTML pages. Hostinger Apache's SPA rewrite rule catches missing `/product/[slug]/` requests and rewrites them to `public_html/index.html` (the landing page `/`).
- **Actionable Scope**: To resolve Milestone 1 (R1), the Implementer agent must:
  1. Create `src/app/product/[slug]/page.tsx` with `generateStaticParams()` and client-side data fetching from `/api/v1/products/[slug]`.
  2. Implement full product details UI (images, pricing, sizing, stock, brewing instructions, tasting notes, reviews, add to cart).
  3. Ensure all product card links navigate to `/product/[slug]/`.

---

## 5. Verification Method

To independently verify these findings:

1. **Check missing route**:
   `find_by_name` in `c:\Engineering\feelinga-hostinger\frontend-build\src\app` for `*slug*` returns 0 files.
2. **Inspect bare product page**:
   `view_file` on `c:\Engineering\feelinga-hostinger\frontend-build\src\app\product\page.tsx` shows lines 1-6 redirecting to `/shop`.
3. **Inspect Apache rewrite rule**:
   `view_file` on `c:\Engineering\feelinga-hostinger\.htaccess` & `public_html\.htaccess` lines 50-53 shows fallback rewrite to `/index.html`.
4. **Test API endpoint**:
   `GET /api/v1/products/darjeeling-first-flush` returns HTTP 200 with product detail JSON payload from database.
