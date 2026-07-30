/**
 * next.config.mjs — Static Export Configuration
 * For Hostinger Premium shared hosting (PHP + MySQL backend)
 *
 * CHANGES from original:
 * 1. output: 'export' — generates static HTML files
 * 2. trailingSlash: true — Hostinger-friendly URLs (/shop/ not /shop)
 * 3. images.unoptimized: true — no Node.js image optimization available
 * 4. REMOVED: headers() — no Node.js server to set them (use .htaccess instead)
 * 5. REMOVED: rewrites() — API is on same origin, no proxy needed
 */

const nextConfig = {
    output: 'export',
    trailingSlash: true,
    images: {
        unoptimized: true,
    },
};

export default nextConfig;
