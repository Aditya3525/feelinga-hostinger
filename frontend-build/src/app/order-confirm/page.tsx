'use client';
import { Suspense, useMemo, useState } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AppIcon from '../../components/AppIcon';

function OrderConfirmInner() {
    const searchParams = useSearchParams();
    const orderNumber = searchParams.get('order') || null;
    const itemsParam = searchParams.get('items');
    const totalParam = searchParams.get('total');
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

    const items = useMemo(() => {
        if (!itemsParam) return null;
        const parsed = Number.parseInt(itemsParam, 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }, [itemsParam]);

    const total = useMemo(() => {
        if (!totalParam) return null;
        const parsed = Number.parseFloat(totalParam);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }, [totalParam]);

    const handleCopyOrderNumber = async () => {
        if (!orderNumber) return;
        try {
            await navigator.clipboard.writeText(orderNumber);
            setCopyStatus('copied');
        } catch {
            setCopyStatus('error');
        }
    };

    return (
        <Layout>
            <div className="container section order-confirm">
                {/* Success animation */}
                <div className="order-confirm__icon-wrap">
                    <AppIcon name="checkCircle" size={44} aria-hidden />
                </div>

                <h1 className="order-confirm__title">Order Placed!</h1>
                <p className="order-confirm__subtitle">
                    Thank you for choosing Feelinga. Your teas are on their way!
                </p>
                {!orderNumber && (
                    <p className="order-confirm__note" role="status" aria-live="polite">
                        We could not read an order number from this link. You can find your latest purchase in My Orders.
                    </p>
                )}

                {/* Order details card */}
                <div className="order-confirm__details-card">
                    {orderNumber && (
                        <div className="order-confirm__row order-confirm__row--divider">
                            <span className="order-confirm__label">Order Number</span>
                            <div className="order-confirm__order-id-wrap">
                                <strong className="order-confirm__mono-accent">{orderNumber}</strong>
                                <button type="button" className="order-confirm__copy-btn" onClick={handleCopyOrderNumber}>
                                    {copyStatus === 'copied' ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                        </div>
                    )}
                    {items && (
                        <div className="order-confirm__row order-confirm__row--sm-gap">
                            <span className="order-confirm__label">Items</span>
                            <span>{items} {items === 1 ? 'item' : 'items'}</span>
                        </div>
                    )}
                    {total && (
                        <div className="order-confirm__row order-confirm__row--sm-gap">
                            <span className="order-confirm__label">Total Paid</span>
                            <strong>₹{total.toLocaleString()}</strong>
                        </div>
                    )}
                    <div className="order-confirm__row">
                        <span className="order-confirm__label">Estimated Delivery</span>
                        <span>3–5 business days</span>
                    </div>
                </div>
                {copyStatus === 'error' && (
                    <p className="order-confirm__copy-error" role="alert">Could not copy order number. Please copy it manually.</p>
                )}

                {/* What happens next */}
                <div className="order-confirm__next">
                    <h3 className="order-confirm__next-title">What happens next?</h3>
                    <div className="order-confirm__steps">
                        {[
                            { icon: 'mail', step: 'Confirmation email', desc: 'You\'ll receive an email with your order details shortly.' },
                            { icon: 'package', step: 'Order processing', desc: 'We\'ll carefully pack your teas within 1 business day.' },
                            { icon: 'truck', step: 'Dispatch & tracking', desc: 'You\'ll get a tracking link once your order ships.' },
                            { icon: 'leaf', step: 'Enjoy your teas', desc: 'Fresh, garden-to-cup goodness arrives at your door!' },
                        ].map((item, i) => (
                            <div key={i} className="order-confirm__step">
                                <div className="order-confirm__step-icon"><AppIcon name={item.icon} size={18} aria-hidden /></div>
                                <div>
                                    <div className="order-confirm__step-title">{item.step}</div>
                                    <div className="order-confirm__step-desc">{item.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTAs */}
                <div className="order-confirm__actions">
                    <Link href="/profile?tab=orders" className="btn btn--ghost">View My Orders</Link>
                    <Link href="/shop" className="btn btn--primary">Continue Shopping</Link>
                </div>
            </div>
        </Layout>
    );
}

export default function OrderConfirmPage() {
    return (
        <Suspense fallback={<Layout><div className="container section order-confirm__loading">Loading...</div></Layout>}>
            <OrderConfirmInner />
        </Suspense>
    );
}
