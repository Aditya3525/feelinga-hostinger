'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const COOKIE_CONSENT_KEY = 'feelinga_cookie_consent';

export default function CookieConsent() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Show banner only if user hasn't already consented
        const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
        if (!consent) {
            // Small delay so the page paints first
            const timer = setTimeout(() => setVisible(true), 800);
            return () => clearTimeout(timer);
        }
    }, []);

    const accept = () => {
        localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
        setVisible(false);
    };

    const decline = () => {
        localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div
            role="dialog"
            aria-label="Cookie consent"
            className="cookie-consent"
        >
            <p className="cookie-consent__copy">
                We use cookies and local storage to keep you signed in and remember your cart.
                No third-party tracking. See our{' '}
                <Link href="/privacy" className="cookie-consent__link">Privacy Policy</Link>.
            </p>
            <div className="cookie-consent__actions">
                <button
                    onClick={decline}
                    className="cookie-consent__btn cookie-consent__btn--ghost"
                >
                    Decline
                </button>
                <button
                    onClick={accept}
                    className="cookie-consent__btn cookie-consent__btn--primary"
                >
                    Accept
                </button>
            </div>
        </div>
    );
}
