import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Reset Password — Feelinga',
    description: 'Reset your Feelinga account password.',
    robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
    return children;
}
