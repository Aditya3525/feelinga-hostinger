'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import AppIcon from './AppIcon';
import SearchOverlay from './SearchOverlay';
import CookieConsent from './CookieConsent';
import type { AppProviderProps, CartItem } from '../types/app';
import { apiRequest } from '../utils/api';

type ActiveCampaign = {
    id: string;
    name: string;
    code: string;
    campaignType: string;
    campaignLabel: string | null;
    bannerText: string;
    discountDisplay: string;
    details: string | null;
    validTo: string;
};

export default function Layout({ children }: AppProviderProps) {
    const { isAuthenticated, isAdmin, openAuthModal, logout } = useAuth();
    const { cart, cartOpen, setCartOpen, removeFromCart, updateQty, itemCount, subtotal, shipping } = useCart();
    const { theme, toggleTheme } = useTheme();
    const pathname = usePathname();
    const [mobileNav, setMobileNav] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [activeCampaign, setActiveCampaign] = useState<ActiveCampaign | null>(null);
    const [mobileNavTop, setMobileNavTop] = useState(0);
    const headerRef = useRef<HTMLElement>(null);
    const cartDrawerRef = useRef<HTMLElement>(null);
    const mobileNavRef = useRef<HTMLElement>(null);
    const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
    const freeShippingThreshold = 999;
    const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
    const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
    const orderTotal = subtotal + shipping;
    const mobileNavOverlayStyle = mobileNavTop > 0 ? { top: `${mobileNavTop}px` } : undefined;
    const mobileNavStyle = mobileNavTop > 0 ? { top: `${mobileNavTop}px`, height: `calc(100dvh - ${mobileNavTop}px)` } : undefined;

    useEffect(() => { setMounted(true); }, []);

    const updateMobileNavTop = useCallback(() => {
        if (!headerRef.current) return;
        const headerBottom = Math.max(0, Math.round(headerRef.current.getBoundingClientRect().bottom));
        setMobileNavTop(headerBottom);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setShowBackToTop(window.scrollY > 400);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (!cartOpen || !cartDrawerRef.current) return;

        const drawer = cartDrawerRef.current;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const getFocusable = () => Array.from(
            drawer.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
        ).filter((el) => !el.hasAttribute('disabled'));

        const focusable = getFocusable();
        if (focusable.length > 0) {
            focusable[0].focus();
        } else {
            drawer.focus();
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setCartOpen(false);
                return;
            }

            if (e.key !== 'Tab') return;

            const currentFocusable = getFocusable();
            if (currentFocusable.length === 0) return;

            const first = currentFocusable[0];
            const last = currentFocusable[currentFocusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [cartOpen, setCartOpen]);

    useEffect(() => {
        if (!mobileNav || !mobileNavRef.current) return;

        updateMobileNavTop();
        const nav = mobileNavRef.current;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const getFocusable = () => Array.from(
            nav.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
        ).filter((el) => !el.hasAttribute('disabled'));

        const focusable = getFocusable();
        if (focusable.length > 0) {
            focusable[0].focus();
        } else {
            nav.focus();
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setMobileNav(false);
                return;
            }

            if (e.key !== 'Tab') return;

            const currentFocusable = getFocusable();
            if (currentFocusable.length === 0) return;

            const first = currentFocusable[0];
            const last = currentFocusable[currentFocusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', updateMobileNavTop);
        window.addEventListener('orientationchange', updateMobileNavTop);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', updateMobileNavTop);
            window.removeEventListener('orientationchange', updateMobileNavTop);
            mobileMenuButtonRef.current?.focus();
        };
    }, [mobileNav, updateMobileNavTop]);

    useEffect(() => {
        const handleGlobalSearchShortcut = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const isTypingContext = !!target && (
                target.tagName === 'INPUT'
                || target.tagName === 'TEXTAREA'
                || target.tagName === 'SELECT'
                || target.isContentEditable
            );

            if (isTypingContext) return;

            const key = e.key.toLowerCase();
            if ((e.ctrlKey || e.metaKey) && key === 'k') {
                e.preventDefault();
                setMobileNav(false);
                setCartOpen(false);
                setSearchOpen(true);
                return;
            }

            if (key === '/') {
                e.preventDefault();
                setMobileNav(false);
                setCartOpen(false);
                setSearchOpen(true);
            }
        };

        document.addEventListener('keydown', handleGlobalSearchShortcut);
        return () => document.removeEventListener('keydown', handleGlobalSearchShortcut);
    }, [setCartOpen]);

    const syncActiveCampaign = useCallback(async () => {
        try {
            const response = await apiRequest('/coupons/campaign/active', { cache: 'no-store' });
            const campaign = response?.data;
            const isRenderableCampaign = Boolean(
                campaign
                && typeof campaign.code === 'string'
                && campaign.code.trim().length > 0
                && typeof campaign.bannerText === 'string'
                && campaign.bannerText.trim().length > 0,
            );

            setActiveCampaign(isRenderableCampaign ? campaign : null);
        } catch {
            setActiveCampaign(null);
        }
    }, []);

    useEffect(() => {
        void syncActiveCampaign();
    }, [pathname, syncActiveCampaign]);

    const handleMobileLogout = async () => {
        await logout();
        setMobileNav(false);
    };

    useEffect(() => {
        const refreshCampaign = () => {
            void syncActiveCampaign();
        };

        window.addEventListener('focus', refreshCampaign);
        window.addEventListener('campaign:refresh', refreshCampaign);

        return () => {
            window.removeEventListener('focus', refreshCampaign);
            window.removeEventListener('campaign:refresh', refreshCampaign);
        };
    }, [syncActiveCampaign]);

    const navLinks = [
        { href: '/shop', label: 'Shop' },
        { href: '/#moods', label: 'Moods' },
        { href: '/gifting', label: 'Gifting' },
        { href: '/learn', label: 'Learn' },
        { href: '/about', label: 'About' },
        { href: '/contact', label: 'Contact' },
    ];
    const renderableCampaign = (
        activeCampaign
        && activeCampaign.code.trim().length > 0
        && activeCampaign.bannerText.trim().length > 0
    ) ? activeCampaign : null;

    return (
        <>
            {renderableCampaign && (
                <div className="header-promo" role="status" aria-live="polite">
                    <div className="header-promo__inner">
                        <div className="header-promo__tag">{renderableCampaign.campaignLabel || 'Live Offer'}</div>
                        <div className="header-promo__content">
                            <p className="header-promo__text">{renderableCampaign.bannerText}</p>
                            <div className="header-promo__details">
                                <span className="header-promo__code">Use code {renderableCampaign.code}</span>
                                <div className="header-promo__meta">
                                    <span>{renderableCampaign.discountDisplay}</span>
                                    {renderableCampaign.details && <span>{renderableCampaign.details}</span>}
                                    <span>Ends {new Date(renderableCampaign.validTo).toLocaleDateString('en-IN')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <header ref={headerRef} className="header" id="header">
                <div className="header__inner">
                    <Link href="/" className="header__logo" aria-label="Feelinga Home">
                        <Image src="/images/logo.png" alt="" width={42} height={42} className="header__logo-img" priority />
                        <span className="header__logo-text">Feelinga<span>.</span></span>
                    </Link>
                    <nav className="header__nav" aria-label="Main navigation">
                        {navLinks.map(l => (
                            <Link key={l.href} href={l.href} className={(l.href.includes('#') ? pathname === '/' : pathname === l.href) ? 'active' : ''}>{l.label}</Link>
                        ))}
                    </nav>
                    <div className="header__actions">
                        {mounted && isAdmin && (
                            <Link href="/admin" aria-label="Admin Dashboard" className="header__admin-link">
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                                <span className="admin-link-text">Admin</span>
                            </Link>
                        )}
                        <button
                            aria-label="Search"
                            aria-haspopup="dialog"
                            aria-expanded={searchOpen}
                            aria-controls="site-search-dialog"
                            className="header__search-trigger"
                            onClick={() => {
                                setMobileNav(false);
                                setSearchOpen(true);
                            }}
                        >
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                            <span className="header__search-hint" aria-hidden>Ctrl K</span>
                        </button>
                        <button aria-label="Toggle theme" onClick={toggleTheme}>
                            {theme === 'dark' ? (
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
                            ) : (
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                            )}
                        </button>
                        <Link href="/wishlist" aria-label="Wishlist" className="header__wishlist-link">
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                        </Link>
                        {mounted && isAuthenticated ? (
                            <Link href="/profile" aria-label="Account">
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            </Link>
                        ) : (
                            <button aria-label="Account" onClick={mounted ? openAuthModal : undefined}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            </button>
                        )}
                        <button
                            aria-label="Cart"
                            id="cartBtn"
                            onClick={() => {
                                setMobileNav(false);
                                setSearchOpen(false);
                                setCartOpen((isOpen: boolean) => !isOpen);
                            }}
                        >
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                            {mounted && itemCount > 0 && <span className="cart-count" id="cartCount">{itemCount}</span>}
                        </button>
                        <button
                            ref={mobileMenuButtonRef}
                            className={`hamburger ${mobileNav ? 'active' : ''}`}
                            id="hamburger"
                            aria-label="Menu"
                            aria-expanded={mobileNav}
                            aria-controls="mobileNav"
                            onClick={() => {
                                setSearchOpen(false);
                                setCartOpen(false);
                                if (!mobileNav) updateMobileNavTop();
                                setMobileNav(!mobileNav);
                            }}
                        >
                            <span></span><span></span><span></span>
                        </button>
                    </div>
                </div>
            </header>

            {/* MOBILE NAV BACKDROP — tap outside to close */}
            <div
                className={`mobile-nav-overlay ${mobileNav ? 'active' : ''}`}
                onClick={() => setMobileNav(false)}
                aria-hidden="true"
                style={mobileNavOverlayStyle}
            />

            {/* MOBILE NAV */}
            <nav
                ref={mobileNavRef}
                className={`mobile-nav ${mobileNav ? 'active' : ''}`}
                id="mobileNav"
                aria-label="Mobile navigation"
                aria-hidden={!mobileNav}
                tabIndex={-1}
                style={mobileNavStyle}
            >
                {navLinks.map(l => (
                    <Link key={l.href} href={l.href} onClick={() => setMobileNav(false)}>{l.label}</Link>
                ))}
                <Link href="/faq" onClick={() => setMobileNav(false)}>FAQ</Link>
                {mounted && isAdmin && (
                    <Link href="/admin" onClick={() => setMobileNav(false)} className="mobile-nav__admin-link"><AppIcon name="barChart" size={16} aria-hidden />Admin Dashboard</Link>
                )}
                {mounted && isAuthenticated && (
                    <button type="button" className="mobile-nav__logout" onClick={() => { void handleMobileLogout(); }}>
                        <span className="mobile-nav__logout-icon"><AppIcon name="logout" size={16} aria-hidden /></span>
                        <span>Logout</span>
                    </button>
                )}
            </nav>

            {/* CART DRAWER */}
            <div className={`cart-overlay ${cartOpen ? 'active' : ''}`} id="cartOverlay" onClick={() => setCartOpen(false)}></div>
            <aside
                className={`cart-drawer ${cartOpen ? 'active' : ''}`}
                id="cartDrawer"
                aria-label="Shopping cart"
                role="dialog"
                aria-modal="true"
                ref={cartDrawerRef}
                tabIndex={-1}
            >
                <div className="cart-drawer__header">
                    <h3>Your Cart</h3>
                    <span className="cart-drawer__count" aria-live="polite">{itemCount} item{itemCount === 1 ? '' : 's'}</span>
                    <button type="button" id="cartClose" aria-label="Close cart" onClick={() => setCartOpen(false)}>
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="cart-drawer__items" id="cartItems">
                    {cart.length > 0 && remainingForFreeShipping > 0 && (
                        <div className="cart-free-shipping" role="status" aria-live="polite">
                            <p className="cart-free-shipping__copy">Add ₹{remainingForFreeShipping.toLocaleString('en-IN')} more for free shipping.</p>
                            <div className="cart-free-shipping__track" aria-hidden="true">
                                <div className="cart-free-shipping__fill" style={{ width: `${freeShippingProgress}%` }} />
                            </div>
                        </div>
                    )}
                    {cart.length > 0 && remainingForFreeShipping === 0 && (
                        <div className="cart-free-shipping cart-free-shipping--done" role="status" aria-live="polite">
                            <p className="cart-free-shipping__copy">Free shipping unlocked.</p>
                        </div>
                    )}
                    {cart.length === 0 ? (
                        <div className="cart-empty">
                            <div className="icon"><AppIcon name="leaf" size={22} aria-hidden /></div>
                            <p>Your cart is empty</p>
                            <Link href="/shop" className="btn btn--ghost btn--sm" onClick={() => setCartOpen(false)}>Browse Teas</Link>
                        </div>
                    ) : (
                        cart.map((item: CartItem) => (
                            <div className="cart-item" key={item.key}>
                                <div className="cart-item__img">{item.img ? <Image src={item.img} alt={item.name} width={60} height={60} className="cart-item__img-el" /> : <AppIcon name="leaf" size={18} aria-hidden />}</div>
                                <div className="cart-item__details">
                                    <div className="cart-item__name">{item.name}</div>
                                    <div className="cart-item__price">₹{item.price.toLocaleString('en-IN')} × {item.qty} · {item.size || '100g'}</div>
                                    <div className="cart-item__line-total">₹{(item.price * item.qty).toLocaleString('en-IN')}</div>
                                    <div className="cart-item__qty">
                                        <button type="button" aria-label={`Decrease quantity of ${item.name}`} disabled={item.qty <= 1} onClick={() => updateQty(item.key, item.qty - 1)}>−</button>
                                        <span>{item.qty}</span>
                                        <button type="button" aria-label={`Increase quantity of ${item.name}`} onClick={() => updateQty(item.key, item.qty + 1)}>+</button>
                                    </div>
                                    <button type="button" className="cart-item__remove" onClick={() => removeFromCart(item.key)} aria-label={`Remove ${item.name} from cart`}>Remove</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="cart-drawer__footer">
                    <div className="cart-drawer__meta"><span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
                    <div className="cart-drawer__meta"><span>Shipping</span><span>{shipping === 0 ? 'Free' : `₹${shipping.toLocaleString('en-IN')}`}</span></div>
                    <div className="cart-drawer__total"><span>Total</span><span id="cartTotal">₹{orderTotal.toLocaleString('en-IN')}</span></div>
                    {cart.length === 0 ? (
                        <Link href="/shop" className="btn btn--ghost btn-block" onClick={() => setCartOpen(false)}>Start Shopping</Link>
                    ) : (
                        <Link href="/checkout" className="btn btn--primary btn-block" onClick={() => setCartOpen(false)}>Checkout</Link>
                    )}
                </div>
            </aside>

            {/* SEARCH */}
            <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

            {/* MAIN CONTENT */}
            <main id="main" className="main">{children}</main>

            {/* FOOTER */}
            <footer className="footer">
                <div className="container">
                    <div className="footer__grid">
                        <div className="footer__brand">
                            <Link href="/" className="header__logo footer__logo-link">
                                <Image src="/images/logo.png" alt="" width={38} height={38} className="header__logo-img footer__logo-img" />
                                <span className="header__logo-text">Feelinga<span>.</span></span>
                            </Link>
                            <p>happiness is here. Sourced with care from India&apos;s finest estates, delivered fresh to your doorstep.</p>
                            <div className="footer__social"><a href="https://instagram.com/feelinga.tea" target="_blank" rel="noopener noreferrer" aria-label="Instagram">IG</a><a href="https://facebook.com/feelinga.tea" target="_blank" rel="noopener noreferrer" aria-label="Facebook">FB</a><a href="https://x.com/feelinga_tea" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">X</a><a href="https://pinterest.com/feelingatea" target="_blank" rel="noopener noreferrer" aria-label="Pinterest">PI</a></div>
                        </div>
                        <div>
                            <h4 className="footer__heading">Shop</h4>
                            <div className="footer__links"><Link href="/shop">All Teas</Link><Link href="/shop?type=Green+Tea">Green Tea</Link><Link href="/shop?type=Black+Tea">Black Tea</Link><Link href="/shop?type=Herbal">Herbal &amp; Wellness</Link><Link href="/gifting">Gift Sets</Link></div>
                        </div>
                        <div>
                            <h4 className="footer__heading">Company</h4>
                            <div className="footer__links"><Link href="/about">About Us</Link><Link href="/learn">Blog &amp; Guides</Link><Link href="/contact">Contact</Link><Link href="/faq">FAQ</Link><Link href="/about#careers">Careers</Link></div>
                        </div>
                        <div>
                            <h4 className="footer__heading">Help</h4>
                            <div className="footer__links"><Link href="/faq#shipping">Shipping &amp; Returns</Link><Link href="/profile?tab=orders">Track Order</Link><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms of Service</Link></div>
                        </div>
                    </div>
                    <div className="footer__bottom">
                        <span>© 2026 Feelinga. All rights reserved.</span>
                        <span className="footer__made-with">Made with <AppIcon name="leaf" size={14} aria-hidden /> in India</span>
                        <span className="footer__credit">Designed & Developed by Aditya Shirsat and Omkar Shinde</span>
                    </div>
                    <div className="footer__legal">
                        <span>Feelinga is a brand of <strong>Vithubadayaji Industries Pvt. Ltd.</strong></span>
                        <span>Regd. Office: At Sulewadi, Post Piliv, Tal. Malshiras, Solapur, Maharashtra – 413310</span>
                        <span>Shop Est. No. 2531100320058917 · Incorporated: 23 Jan 2025 · MSME Registered</span>
                    </div>
                </div>
            </footer>

            {/* WHATSAPP FLOATING BUTTON */}
            <a href="https://wa.me/919673592818" className="whatsapp-float" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                <span className="whatsapp-float__tooltip">Chat with us!</span>
            </a>

            {/* BACK TO TOP */}
            <button className={`back-to-top ${showBackToTop ? 'visible' : ''}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 15l-6-6-6 6" /></svg>
            </button>

            {/* COOKIE CONSENT */}
            <CookieConsent />
        </>
    );
}
