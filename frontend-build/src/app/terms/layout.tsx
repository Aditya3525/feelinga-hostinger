import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service — Feelinga',
    description: 'Read the Feelinga terms of service covering orders, shipping, returns, and user responsibilities.',
    robots: { index: true, follow: true },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
