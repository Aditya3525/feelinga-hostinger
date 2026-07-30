/** Shared frontend constants — single source of truth */

// API
export const API_BASE = '/api/v1';
export const API_ROUTES = {
    // Auth
    login: '/auth/login',
    register: '/auth/register',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
    updateProfile: '/auth/me',
    changePassword: '/auth/password',
    googleLogin: '/auth/google',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    addresses: '/auth/addresses',
    wishlist: '/auth/wishlist',
    dataExport: '/auth/data-export',
    deleteAccount: '/auth/account',

    // Products
    products: '/products',
    product: (slug: string) => `/products/${slug}`,

    // Cart
    cart: '/cart',
    cartItems: '/cart/items',
    cartSync: '/cart/sync',

    // Orders
    orders: '/orders',
    order: (id: string) => `/orders/${id}`,
    orderCancel: (id: string) => `/orders/${id}/cancel`,
    orderInvoice: (id: string) => `/orders/${id}/invoice`,

    // Reviews
    reviews: (productId: string) => `/reviews/${productId}`,

    // Other
    testimonials: '/testimonials',
    contact: '/contact',
    newsletter: '/newsletter',
    couponValidate: '/coupons/validate',
} as const;

// LocalStorage keys
export const STORAGE_KEYS = {
    token: 'feelinga_token',
    refresh: 'feelinga_refresh',
    user: 'feelinga_user',
    cart: 'feelinga_cart',
    theme: 'feelinga_theme',
    cookieConsent: 'feelinga_cookie_consent',
} as const;

// Site metadata
export const SITE = {
    name: 'Feelinga',
    tagline: 'happiness is here',
    domain: 'feelinga.in',
    currency: '₹',
    freeShippingThreshold: 999,
    shippingCost: 79,
    legalName: 'Vithubadayaji Industries Private Limited',
    shopEstNo: '2531100320058917',
    registeredAddress: 'At Sulewadi, Post Piliv, Tal. Malshiras, Solapur, Maharashtra \u2013 413310',
    incorporationDate: '23 January 2025',
} as const;
