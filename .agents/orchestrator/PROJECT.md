# Project: Feelinga Tea E-Commerce Audit & Fix

## Architecture
- Next.js E-commerce frontend (static export / SPA on Apache Hostinger)
- Products, Cart Drawer, Checkout Page, Order Confirmation Page, .htaccess SPA rewrites

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Product Navigation & Detail Routes (R1) | Product cards links across Home, Shop, Moods, Gifting -> /product/[slug]/ & detail loading | None | DONE |
| 2 | Checkout & Payment Flow (R2) | Cart drawer, checkout page, button actions, state persistence, validation, /order-confirm/ | M1 | DONE |
| 3 | SPA Client Routing & Apache Fallback (R3) | Next.js static export trailingSlash, .htaccess rules for direct URLs & refreshes | M1, M2 | DONE |
| 4 | Final E2E Integration & Verification | E2E testing & forensic integrity audit across all requirements | M1, M2, M3 | DONE |

## Interface Contracts
- /product/[slug]/ dynamic product details route
- Cart state in localStorage / React Context
- Checkout form submit -> /order-confirm/ navigation with order summary payload
- Apache .htaccess rewrite rules preserving /api/ and falling back to index.html or html pages for client routing
