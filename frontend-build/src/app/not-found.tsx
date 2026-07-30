import Link from 'next/link';
import Layout from '../components/Layout';
import AppIcon from '../components/AppIcon';

export default function NotFound() {
    return (
        <Layout>
            <div className="not-found-page">
                <div className="not-found-page__icon"><AppIcon name="leaf" size={72} aria-hidden /></div>
                <h1 className="not-found-page__code">404</h1>
                <h2 className="not-found-page__title">Page Not Found</h2>
                <p className="not-found-page__description">
                    The page you&apos;re looking for has gone the way of yesterday&apos;s tea leaves. Let us help you find something fresh.
                </p>
                <div className="not-found-page__actions">
                    <Link href="/shop" className="btn btn--primary">Explore Teas</Link>
                    <Link href="/" className="btn btn--ghost">Go Home</Link>
                </div>
                <p className="not-found-page__helper-links">
                    Need help? <Link href="/faq">Browse FAQ</Link> or <Link href="/contact">contact us</Link>.
                </p>
            </div>
        </Layout>
    );
}
