import Providers from '../components/Providers';
import '../styles/styles.css';
import type { AppProviderProps } from '../types/app';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: 'Feelinga — happiness is here',
        template: '%s | Feelinga',
    },
    description: 'Discover premium loose leaf teas sourced from the finest Indian estates. Garden-fresh, single-origin, wellness-focused.',
    keywords: ['tea', 'premium tea', 'loose leaf tea', 'Indian tea', 'green tea', 'black tea', 'herbal tea', 'wellness tea'],
    authors: [{ name: 'Feelinga' }],
    openGraph: {
        type: 'website',
        locale: 'en_IN',
        siteName: 'Feelinga',
        title: 'Feelinga — happiness is here',
        description: 'Discover premium loose leaf teas sourced from the finest Indian estates.',
        images: [{ url: '/images/tea-lifestyle.png', width: 1200, height: 630, alt: 'Feelinga — premium teas from India' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Feelinga — happiness is here',
        description: 'Premium loose leaf teas from India\'s finest estates.',
        images: ['/images/tea-lifestyle.png'],
    },
    robots: {
        index: true,
        follow: true,
    },
    icons: {
        icon: '/images/logo.png',
        apple: '/images/logo.png',
    },
};

export const viewport = {
    themeColor: '#FAEDE4', // var(--color-bg) for seamless top-notch blending
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5, // allows a11y zoom but respects initial scale
};

export default function RootLayout({ children }: AppProviderProps) {
    return (
        <html lang="en">
            <body>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
