'use client';
import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '../../components/Layout';
import AppIcon from '../../components/AppIcon';

function VerifyEmailInner() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/');
    }, [router]);

    return (
        <Layout>
            <div className="status-screen">
                <div className="status-screen__inner">
                    <div className="status-screen__icon"><AppIcon name="checkCircle" size={40} aria-hidden /></div>
                    <h2>Email Verification Disabled</h2>
                    <p className="status-screen__message">You can create an account and sign in without a separate verification step.</p>
                    <div className="status-screen__actions">
                        <Link href="/" className="btn btn--primary status-screen__action">Go Home</Link>
                        <Link href="/shop" className="btn btn--ghost status-screen__action">Start Shopping</Link>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default function VerifyEmail() {
    return (
        <Suspense fallback={<Layout><div className="status-screen"><p>Loading...</p></div></Layout>}>
            <VerifyEmailInner />
        </Suspense>
    );
}
