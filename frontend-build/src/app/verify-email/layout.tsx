import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Email Verification Disabled — Feelinga',
    description: 'Email verification is not required for Feelinga accounts.',
    robots: { index: false, follow: false },
};

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
    return children;
}
