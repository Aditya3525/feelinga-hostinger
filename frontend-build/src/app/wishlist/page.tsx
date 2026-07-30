'use client';
import Link from 'next/link';
import Layout from '../../components/Layout';

export default function WishlistComingSoon() {
    return (
        <Layout>
            <div className="page-hero">
                <div className="container">
                    <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link> <span>/</span> <span>Wishlist</span></nav>
                    <h1>Wishlist</h1>
                    <p>Save your favourite teas for later.</p>
                </div>
            </div>
            <div className="container section" style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🍵</div>
                <h2 style={{ marginBottom: 12 }}>Coming Soon</h2>
                <p style={{ color: 'var(--color-text-muted)', maxWidth: 420, margin: '0 auto 32px' }}>
                    The wishlist feature is on its way. In the meantime, browse our full collection of premium teas.
                </p>
                <Link href="/shop" className="btn btn--primary">Shop All Teas</Link>
            </div>
        </Layout>
    );
}
