# Feelinga.com — Hostinger Premium Deployment Guide

## What This Is

A complete PHP + MySQL rewrite of the Feelinga Tea e-commerce backend, designed to run entirely on **Hostinger Premium shared hosting**. The frontend is a **Next.js static export** (CSR — Client-Side Rendering).

## Architecture

```
Hostinger Premium (single server)
├── public_html/
│   ├── index.html, _next/ ← Next.js static export (CSR)
│   ├── images/            ← Static assets
│   ├── uploads/products/  ← User-uploaded product images
│   └── api/v1/            ← PHP REST API
│       ├── index.php      ← Router
│       ├── config/        ← DB, env, constants
│       ├── middleware/     ← Auth (JWT), CORS, rate-limit
│       ├── modules/       ← auth, products, orders, cart, reviews, admin, ...
│       ├── utils/         ← email (PHPMailer), PDF (TCPDF), cache, sanitize
│       └── vendor/        ← Composer dependencies
├── .env                   ← Environment config
├── schema.sql             ← MySQL schema (15 tables)
├── migrate.php            ← MongoDB → MySQL migration
└── frontend-config/       ← Config files for the Next.js frontend
```

## Deployment Steps

### 1. Create MySQL Database

1. Log into Hostinger hPanel
2. Go to **Databases → MySQL Databases**
3. Create a new database (e.g., `feelinga_tea`)
4. Create a user and note the credentials
5. Import `schema.sql` via phpMyAdmin

### 2. Upload Files

Upload `public_html/` contents to your Hostinger `public_html/` directory via File Manager or FTP.

### 3. Install Composer Dependencies

SSH into your Hostinger account (or use Terminal in hPanel):
```bash
cd ~/public_html/api/v1
composer install --no-dev --optimize-autoloader
```

If SSH is not available, you can install locally and upload the `vendor/` directory.

### 4. Configure Environment

Edit the `.env` file with your actual values:
```bash
DB_HOST=localhost
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASS=your_database_password
JWT_SECRET=generate-a-random-64-char-string
JWT_REFRESH_SECRET=generate-another-random-64-char-string
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
ADMIN_EMAIL=your-admin@email.com
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=noreply@feelinga.com
SMTP_PASS=your-smtp-password
CLIENT_URL=https://feelinga.com
SITE_URL=https://feelinga.com
```

**IMPORTANT:** Place the `.env` file ONE LEVEL ABOVE `public_html/` (e.g., `~/feelinga-hostinger/.env`) so it's not publicly accessible. The PHP code references it via `dirname(__DIR__, 3) . '/.env'`.

### 5. Migrate Data (if existing site)

1. Export MongoDB data (see `migrate.php` header for commands)
2. Place JSON files in `migration_data/` directory
3. Run: `php ~/feelinga-hostinger/migrate.php`
4. After migration, run the rating recalculation SQL

### 6. Build Frontend

From the original Next.js project:
```bash
cd C:\Engineering\Tea Project\next-frontend

# Copy frontend-config/next.config.mjs over your existing next.config.mjs
# Copy frontend-config/api.ts over src/utils/api.ts

npm run build
```

Upload the contents of `out/` to `public_html/`.

### 7. Configure .htaccess

The `.htaccess` files are included in `public_html/` and `public_html/api/v1/`. Verify they're uploaded (some FTP clients skip dotfiles).

### 8. Set File Permissions

```bash
chmod 755 ~/public_html/uploads/products/
chmod 644 ~/public_html/.htaccess
```

### 9. SSL + Domain

1. In hPanel → **SSL/TLS** → Install free SSL for `feelinga.com`
2. Point `feelinga.com` DNS A record to your Hostinger server IP (usually automatic)

### 10. Verify

- [ ] `https://feelinga.com/api/v1/health` → `{"status":"success","database":"connected"}`
- [ ] Homepage loads at `https://feelinga.com`
- [ ] Product pages work
- [ ] User registration + login works
- [ ] Admin panel works

## File Count

| Directory | Files |
|-----------|-------|
| Config | 3 |
| Middleware | 3 |
| Utils | 5 |
| Auth | 2 |
| Products | 2 |
| Cart | 2 |
| Orders | 2 |
| Reviews | 2 |
| Contact | 2 |
| Testimonials | 2 |
| Coupons | 2 |
| Admin | 2 |
| Upload | 2 |
| **Total PHP files** | **~30** |
| Schema SQL | 1 |
| Migration | 1 |

## Endpoint Reference

| Module | Endpoints | Auth |
|--------|-----------|------|
| Health | 1 | None |
| Auth | 19 | Most require auth |
| Products | 9 | Admin for CRUD |
| Orders | 7 | Auth required |
| Cart | 6 | Auth required |
| Reviews | 3 | Auth required |
| Contact | 3 | None/Admin |
| Newsletter | 3 | None/Admin |
| Testimonials | 4 | Public/Admin |
| Coupons | 2 | Auth/Admin |
| Admin | 15+ | Admin only |
| Upload | 2 | Admin only |
| **Total** | **~67** | |
