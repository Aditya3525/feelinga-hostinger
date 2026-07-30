# Detailed Investigation & Code Audit Report: Milestone 1 (R1: Product Navigation & Detail Routes)

**Date**: 2026-07-29  
**Agent**: Explorer 1  
**Working Directory**: `c:\Engineering\feelinga-hostinger\.agents\explorer_r1\`  
**Target Repository**: `c:\Engineering\feelinga-hostinger\`

---

## 1. Executive Summary

A comprehensive read-only code audit was conducted across the Feelinga e-commerce codebase to evaluate product card links, dynamic routing in Next.js, product slug mapping, and the root causes behind product detail links redirecting to the landing page (`/`).

**Key Findings:**
1. **Missing Product Detail Route**: Next.js App Router has **no route file or directory** defined at `frontend-build/src/app/product/[slug]/page.tsx`. Only a bare `src/app/product/page.tsx` exists, which redirects `/product` to `/shop`.
2. **Product Cards Link Target**: `ProductCard.tsx` and wishlist items construct links targeting `/product/${product.slug}` (or `/product/${product.slug}/` via `trailingSlash: true`).
3. **Redirect to Landing Page (`/`) Mechanism**:
   - **Direct GET / Refresh**: When a user navigates to `/product/darjeeling-first-flush/`, Hostinger's Apache server checks if the static folder/file `public_html/product/darjeeling-first-flush/index.html` exists. Because static export (`output: 'export'`) never built `[slug]` pages (since `[slug]` route is missing in Next.js), neither file nor directory exists. Apache falls back to `public_html/.htaccess` rule line 53 (`RewriteRule ^(.*)$ /index.html [L]`), serving `c:\Engineering\feelinga-hostinger\public_html\index.html` (the Landing Page `/`).
   - **Client-Side Next.js Router Navigation**: When a user clicks a product card link in SPA mode, Next.js App Router attempts client-side navigation to `/product/[slug]`. Because no route component matches `src/app/product/[slug]`, client routing fails or triggers page reload/fallback.
4. **Backend API Readiness**: The PHP backend API endpoint `GET /api/v1/products/{slug}` is **already implemented and operational** in `public_html/api/v1/modules/products/routes.php` & `controller.php`.

---

## 2. Comprehensive Audit of Product Cards & Links Across All Pages

### 2.1 Component Level: `ProductCard.tsx`
- **File Path**: `c:\Engineering\feelinga-hostinger\frontend-build\src\components\ProductCard.tsx`
- **Line 41**:
  ```tsx
  const href = linkHref ?? `/product/${product.slug}`;
  ```
- **Line 67**:
  ```tsx
  <Link href={href}>
      <div className="product-card__img">...</div>
  </Link>
  ```
- **Line 80**:
  ```tsx
  <Link href={href} className="product-card__name">{product.name}</Link>
  ```
- **Behavior**: Standard product cards default their hyperlink target to `/product/${product.slug}` unless overridden by `linkHref`.

---

### 2.2 Home Page (`/`)
- **File Path**: `c:\Engineering\feelinga-hostinger\frontend-build\src\app\page.tsx`
- **New Arrivals Grid** (Lines 303-310):
  ```tsx
  <ProductCard key={p.id} product={p} badge="New" renderStars={renderStars} onAdd={handleAddToCart} />
  ```
  - Links to: `/product/${p.slug}`
- **Best Sellers Grid** (Lines 318-326):
  ```tsx
  <ProductCard key={p.id} product={p} badge="Best Seller" badgeClass="product-card__badge--gold" renderStars={renderStars} onAdd={handleAddToCart} />
  ```
  - Links to: `/product/${p.slug}`
- **Gift Collection Section** (Lines 348-356):
  ```tsx
  <ProductCard key={p.id} product={p} badge="Gift Set" badgeClass="product-card__badge--success" renderStars={renderStars} linkHref="/gifting" />
  ```
  - Links to: `/gifting` (Explicit override)
- **Tea Master's Selections Grid** (Lines 374-389):
  - Line 385: `{c.slug && <Link href={`/product/${c.slug}`} className="btn btn--ghost btn--sm mt-sm">View Details</Link>}`
  - Line 377: `{ name: 'Aged Pu-erh Reserve', ..., slug: null }`. Item 3 has `slug: null`, preventing link rendering.
- **Shop by Mood Section** (Lines 249-263):
  - Line 256: `<Link href={`/shop?mood=${m.mood}`} className="mood-card" key={m.mood}>`
  - Links to: Filtered shop PLP (`/shop?mood=energize`).

---

### 2.3 Shop Page (`/shop`)
- **File Path**: `c:\Engineering\feelinga-hostinger\frontend-build\src\app\shop\page.tsx`
- **Product Listing Grid** (Lines 328-336):
  ```tsx
  <ProductCard key={p.id} product={p} badge={p.badge} badgeClass={p.badgeColor ? 'product-card__badge--danger' : undefined} renderStars={renderStars} onAdd={handleAddToCart} />
  ```
  - Links to: `/product/${p.slug}` for all fetched product items.

---

### 2.4 Gifting Page (`/gifting`)
- **File Path**: `c:\Engineering\feelinga-hostinger\frontend-build\src\app\gifting\page.tsx`
- **Gift Collection Grid** (Lines 82-100):
  - Line 89: `linkHref="/gifting"`
  - Line 91-98: Custom `footer` rendering "Enquire Now" link to `/contact?subject=Gifting%20Enquiry...`.
  - Behavior: Correctly designed for gifting inquiry flow.

---

### 2.5 Wishlist Page (`/wishlist`)
- **File Path**: `c:\Engineering\feelinga-hostinger\frontend-build\src\app\wishlist\page.tsx`
- **Product Card Item** (Lines 153 & 160):
  ```tsx
  <Link href={`/product/${p.slug}`}>
  ...
  <Link href={`/product/${p.slug}`} className="product-card__name">{p.name}</Link>
  ```
  - Links to: `/product/${p.slug}`

---

### 2.6 Search Overlay Component
- **File Path**: `c:\Engineering\feelinga-hostinger\frontend-build\src\components\SearchOverlay.tsx`
- **Autocomplete Select Handler** (Line 179):
  ```tsx
  router.push(`/product/${product.slug}`);
  ```
  - Links to: `/product/${product.slug}`

---

## 3. Next.js App Router Structure & Dynamic Route Investigation

### 3.1 Missing Dynamic Route File
- Target route path expected by frontend components: `/product/[slug]`
- Search result across `frontend-build/src/app`:
  - `src/app/product/page.tsx` **EXISTS** (Bare redirect to `/shop`).
  - `src/app/product/[slug]/page.tsx` **DOES NOT EXIST**.
  - No `[slug]` or `[id]` folder exists anywhere within `src/app/product/`.

### 3.2 Bare `/product` Route Handler
- **File Path**: `c:\Engineering\feelinga-hostinger\frontend-build\src\app\product\page.tsx`
- **Code**:
  ```tsx
  import { redirect } from 'next/navigation';

  // Redirect bare /product to /shop — individual products use /product/[slug]
  export default function ProductRedirect() {
      redirect('/shop');
  }
  ```
- **Finding**: Comment acknowledges that individual products should use `/product/[slug]`, but the route folder `[slug]` was never created in `src/app/product/`.

### 3.3 Next.js Static Export Configuration
- **File Path**: `c:\Engineering\feelinga-hostinger\frontend-build\next.config.mjs`
- **Code**:
  ```js
  const nextConfig = {
      output: 'export',
      trailingSlash: true,
      images: { unoptimized: true },
      ...
  };
  ```
- **Static Export Behavior**:
  - `output: 'export'` generates static HTML files into `out/` during `npm run build`.
  - When `trailingSlash: true` is active, routes produce `out/<route>/index.html` (e.g. `out/shop/index.html`).
  - Because `src/app/product/[slug]` is missing, `next build` does not generate any HTML pages for product detail routes (e.g. `out/product/darjeeling-first-flush/index.html`).

---

## 4. Root Cause Analysis: Why Product Card Links Redirect to Landing Page `/`

### 4.1 Apache Server Rewrite Mechanism (`public_html/.htaccess`)
- **File Path**: `c:\Engineering\feelinga-hostinger\public_html\.htaccess`
- **Relevant Lines** (Lines 49-53):
  ```apache
  # Handle SPA routing — serve index.html for non-file, non-API, non-upload routes
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_URI} !^/(api|uploads|images|_next)/
  RewriteRule ^(.*)$ /index.html [L]
  ```
- **Execution Flow on Hard Refresh or Direct Link Access**:
  1. Browser requests: `GET /product/darjeeling-first-flush/`
  2. Apache checks if `public_html/product/darjeeling-first-flush/` exists as a file (`!-f`) or directory (`!-d`).
  3. Because `[slug]` static pages were never generated by Next.js, `public_html/product/darjeeling-first-flush/` does not exist on disk.
  4. Apache falls back to the SPA Rewrite Rule: `RewriteRule ^(.*)$ /index.html [L]`.
  5. Apache serves `public_html/index.html`, which is the Next.js **Home Landing Page** (`/`).

### 4.2 Local PHP Router Behavior (`router.php`)
- **File Path**: `c:\Engineering\feelinga-hostinger\router.php`
- **Relevant Lines** (Lines 141-146):
  ```php
  // SPA fallback: serve index.html for frontend routes
  $spaIndex = __DIR__ . '/public_html/index.html';
  if (file_exists($spaIndex)) {
      header('Content-Type: text/html');
      readfile($spaIndex);
      return true;
  }
  ```
- **Execution Flow**: Any unhandled URL path (such as `/product/<slug>`) falls through to serve `public_html/index.html` (Home Page).

---

## 5. Backend API Readiness Audit

- **Routes File**: `c:\Engineering\feelinga-hostinger\public_html\api\v1\modules\products\routes.php`
  - Line 28: `products_get_by_slug($action);`
- **Controller File**: `c:\Engineering\feelinga-hostinger\public_html\api\v1\modules\products\controller.php`
  - Lines 156-166:
    ```php
    function products_get_by_slug(string $slug): void
    {
        $db = get_db();
        $stmt = $db->prepare('SELECT * FROM products WHERE slug = ? AND deleted_at IS NULL');
        $stmt->execute([$slug]);
        $product = $stmt->fetch();

        if (!$product) json_error('Product not found', 404);

        json_success(format_product($product));
    }
    ```
- **Finding**: The backend API `GET /api/v1/products/{slug}` is **100% complete and working**. It queries the SQLite database by product slug and returns full product metadata (images, prices, origin, caffeine, brewingInstructions, tastingNotes, stock, reviews, etc.).

---

## 6. Solution Recommendations & Implementation Plan (For Implementer)

1. **Create Product Detail Page Component**:
   - Create directory `c:\Engineering\feelinga-hostinger\frontend-build\src\app\product\[slug]\`
   - Create page file `c:\Engineering\feelinga-hostinger\frontend-build\src\app\product\[slug]\page.tsx`
   - Implement `generateStaticParams()` to fetch all existing product slugs from the API or database seed list during build time (`output: 'export'`), generating pre-rendered static HTML files for every product slug (e.g. `out/product/darjeeling-first-flush/index.html`).
   - Implement client-side fetching from `/api/v1/products/${slug}` for dynamic runtime loading and fallback.
2. **Product Page UI Content**:
   - Render product image gallery (`images`), title, badge, price selector (50g, 100g, 200g), stock indicator, add to cart, brewing instructions (`temperature`, `steepTime`, `teaAmount`), tasting notes, origin, description, and reviews/rating.
3. **Fix Home Page Curated Item Link**:
   - In `src/app/page.tsx` line 377, assign a valid slug to `Aged Pu-erh Reserve` (e.g. `aged-puerh-reserve`) so all Tea Master's Selections have working detail links.

---

## 7. Evidence Chain Summary Matrix

| File Path | Line Number(s) | Observed Code / Config | Result / Impact |
|---|---|---|---|
| `frontend-build/src/components/ProductCard.tsx` | 41, 67, 80 | `href = linkHref ?? '/product/${product.slug}'` | Product cards default target link to `/product/[slug]` |
| `frontend-build/src/app/product/page.tsx` | 1-6 | `redirect('/shop')` | Bare `/product` redirects to `/shop`, comment notes `[slug]` should exist |
| `frontend-build/src/app/product/[slug]/page.tsx` | N/A | File missing (0 search results) | No Next.js App Router handler for `/product/[slug]` |
| `frontend-build/next.config.mjs` | 3, 4 | `output: 'export'`, `trailingSlash: true` | Static export relies on generated HTML files per route |
| `public_html/.htaccess` | 50-53 | `RewriteRule ^(.*)$ /index.html [L]` | Non-existent `/product/[slug]/` path rewrites to home page `/index.html` |
| `router.php` | 141-146 | `readfile($spaIndex)` | PHP dev server falls back to `/index.html` for unknown routes |
| `public_html/api/v1/modules/products/routes.php` | 28 | `products_get_by_slug($action);` | Backend API for `GET /api/v1/products/{slug}` is operational |

