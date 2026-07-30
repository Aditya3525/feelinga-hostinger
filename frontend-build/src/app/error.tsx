'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error('Application error:', error);
    }, [error]);

    return (
        <div className="app-error" role="alert" aria-live="assertive">
            <h1 className="app-error__title">Something went wrong</h1>
            <p className="app-error__description">
                We&apos;re sorry — an unexpected error occurred. Please try again or return to the homepage.
            </p>
            {error.digest && (
                <p className="app-error__meta">
                    Error reference: <strong>{error.digest}</strong>
                </p>
            )}
            <div className="app-error__actions">
                <button className="btn btn--primary" type="button" onClick={reset}>Try Again</button>
                <a href="/" className="btn btn--ghost">Go Home</a>
            </div>
            <p className="app-error__help">If this keeps happening, reach us through the Contact page.</p>
        </div>
    );
}
