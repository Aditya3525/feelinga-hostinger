import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy — Feelinga',
    description: 'Read the Feelinga privacy policy — how we collect, use, and protect your personal information when you shop with us.',
    robots: { index: true, follow: true },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
    return children;
}
