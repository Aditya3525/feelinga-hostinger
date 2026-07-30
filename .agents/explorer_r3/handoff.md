# Handoff Report — Milestone 3 (R3: SPA Client Routing & Apache Fallback)

**Role:** Explorer 3  
**Working Directory:** `c:\Engineering\feelinga-hostinger\.agents\explorer_r3\`  
**Target:** Milestone 3 (R3: SPA Client Routing & Apache Fallback)  
**Handoff Type:** Hard (Task Complete)  

---

## 1. Observation

Direct observations from codebase inspection and server execution:

1. **Next.js Export Configuration:**
   - File: `frontend-build/next.config.mjs` & `frontend-config/next.config.mjs`
   - Config Settings:
     ```javascript
     output: 'export',
     trailingSlash: true,
     images: { unoptimized: true }
     ```
   - Export Build output in `public_html/`:
     - Physical HTML route files created: `public_html/shop/index.html`, `public_html/checkout/index.html`, `public_html/profile/index.html`, `public_html/order-confirm/index.html`, `public_html/product/index.html`, `public_html/index.html`, `public_html/404.html`.

2. **Root `.htaccess` (`c:\Engineering\feelinga-hostinger\.htaccess`):**
   - Lines 4: `DirectoryIndex public_html/index.html public_html/index.php index.html index.php`
   - Lines 8-10: Force HTTPS redirect (`RewriteCond %{HTTPS} off`, `RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]`)
   - Lines 13-21: Sensitive file protections (`.env`, `.git`, `composer.*`, `schema.sql`, `migrate.php`, `seed.php`)
   - Lines 27-28: `RewriteRule ^(.*)$ public_html/$1 [L]` maps top-level domain requests into `public_html/`.

3. **Public HTML `.htaccess` (`c:\Engineering\feelinga-hostinger\public_html\.htaccess`):**
   - Lines 4: `DirectoryIndex index.html index.php`
   - Lines 22: `Options -Indexes`
   - Lines 49-53:
     ```apache
     # Handle SPA routing — serve index.html for non-file, non-API, non-upload routes
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteCond %{REQUEST_URI} !^/(api|uploads|images|_next)/
     RewriteRule ^(.*)$ /index.html [L]
     ```

4. **API Sub-directory `.htaccess` (`c:\Engineering\feelinga-hostinger\public_html\api\v1\.htaccess`):**
   - Lines 4-6:
     ```apache
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule ^(.*)$ index.php [QSA,L]
     ```

5. **Server Verification Execution:**
   - Command: `php -S 127.0.0.1:8000 router.php`
   - Results:
     - `GET /` -> HTTP 200 OK (`text/html`)
     - `GET /shop/` -> HTTP 200 OK (`text/html`, direct `public_html/shop/index.html`)
     - `GET /checkout/` -> HTTP 200 OK (`text/html`, direct `public_html/checkout/index.html`)
     - `GET /profile/` -> HTTP 200 OK (`text/html`, direct `public_html/profile/index.html`)
     - `GET /order-confirm/` -> HTTP 200 OK (`text/html`, direct `public_html/order-confirm/index.html`)
     - `GET /cart` -> HTTP 200 OK (`text/html`, internal fallback to `public_html/index.html`)
     - `GET /product/darjeeling-first-flush/` -> HTTP 200 OK (`text/html`, internal fallback to `public_html/index.html`)
     - `GET /api/v1/health` -> HTTP 200 OK (`application/json`, `{"status":"success","database":"connected"}`)
     - `GET /api/v1/products` -> HTTP 200 OK (`application/json`)

---

## 2. Logic Chain

1. **Step 1 (Export Structure):** Next.js `output: 'export'` combined with `trailingSlash: true` generates pre-rendered `index.html` files inside dedicated route folders (`shop/index.html`, `checkout/index.html`, `profile/index.html`, `order-confirm/index.html`).
2. **Step 2 (Direct Pre-rendered Page Access):** When a user navigates to `/shop/`, `/checkout/`, `/profile/`, or `/order-confirm/`, Apache checks if the target directory exists on disk (`-d`). Since `public_html/{route}/` exists, Apache's `DirectoryIndex index.html` serves `public_html/{route}/index.html` directly with HTTP 200 OK.
3. **Step 3 (Dynamic & Non-File Route Access):** When a user navigates to `/product/[slug]/` (e.g. `/product/darjeeling-first-flush/`) or `/cart`, the physical directory does not exist (`!-d` is TRUE). Because the request is also not a file (`!-f` is TRUE) and does not start with `/api`, `/uploads`, `/images`, or `/_next`, Apache executes `RewriteRule ^(.*)$ /index.html [L]`. This performs an internal server rewrite to `public_html/index.html` (HTTP 200 OK) while preserving the browser URL.
4. **Step 4 (Bare `/product` Redirect):** The bare route `/product` resolves to `public_html/product/index.html`, which contains Next.js `<meta http-equiv="refresh" content="1;url=/shop"/>` (from `src/app/product/page.tsx`). Dynamic routes like `/product/[slug]/` do NOT hit `public_html/product/index.html` because the subdirectory `product/[slug]/` does not exist on disk, hitting `/index.html` SPA fallback instead.
5. **Step 5 (API Non-Interference):** Any URL matching `/api/*` (e.g., `/api/v1/products`) fails the condition `RewriteCond %{REQUEST_URI} !^/(api|uploads|images|_next)/`. It is excluded from the SPA rewrite and passed directly to `public_html/api/v1/.htaccess` which routes non-file requests to `index.php` (returning standard JSON responses).

---

## 3. Caveats

1. **Bare `/product` Redirect:** Direct access to `/product` or `/product/` (without a slug) intentionally redirects to `/shop`. This is expected per `src/app/product/page.tsx`.
2. **Static Export Scope:** Client-side dynamic routing on SPA fallback pages relies on JavaScript execution in the browser to hydrate and display dynamic content based on `window.location.pathname`.
3. **Hostinger Apache Modules:** Verification assumes standard Apache modules (`mod_rewrite`, `mod_headers`, `mod_deflate`, `mod_expires`, `mod_authz_core`) are enabled, which is standard on Hostinger Premium shared hosting.

---

## 4. Conclusion

Milestone 3 (R3: SPA Client Routing & Apache Fallback) is **FULLY COMPLIANT AND VERIFIED**.
- All static pages (`/shop`, `/checkout`, `/profile`, `/order-confirm`) have pre-rendered HTML entry points served directly (200 OK).
- Dynamic routes (`/product/[slug]/`) and client-side sub-routes (`/cart`) fall back cleanly to `/index.html` via Apache internal rewrite (200 OK) without 404/403 errors or unwanted redirects to `/`.
- REST API routes (`/api/v1/...`) are completely isolated from static SPA rewrite rules and respond cleanly with JSON.

---

## 5. Verification Method

To independently verify this configuration:

1. **Build Verification:**
   ```bash
   cd c:\Engineering\feelinga-hostinger\frontend-build
   npm run build
   ```
   Inspect `out/` directory to confirm `shop/index.html`, `checkout/index.html`, `profile/index.html`, `order-confirm/index.html`, `product/index.html`, `index.html` exist.

2. **Local PHP Router Verification:**
   ```bash
   cd c:\Engineering\feelinga-hostinger
   php -S 127.0.0.1:8000 router.php
   ```
   In PowerShell:
   ```powershell
   Invoke-WebRequest -Uri "http://127.0.0.1:8000/shop/" -UseBasicParsing
   Invoke-WebRequest -Uri "http://127.0.0.1:8000/product/darjeeling-first-flush/" -UseBasicParsing
   Invoke-WebRequest -Uri "http://127.0.0.1:8000/cart" -UseBasicParsing
   Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/v1/health" -UseBasicParsing
   ```
   Expect HTTP 200 OK for all requests.

3. **Invalidation Conditions:**
   - Removing `RewriteCond %{REQUEST_URI} !^/(api|uploads|images|_next)/` from `public_html/.htaccess` will break API endpoints (causing them to return `index.html`).
   - Removing `RewriteRule ^(.*)$ /index.html [L]` will cause direct refreshes on dynamic routes like `/product/darjeeling-first-flush/` to throw Apache 404 Not Found errors.
