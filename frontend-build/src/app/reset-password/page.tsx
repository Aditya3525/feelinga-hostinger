'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '../../components/Layout';
import AppIcon from '../../components/AppIcon';
import { apiRequest } from '../../utils/api';
import { getStrongPasswordError } from '../../utils/password';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const canSubmit = Boolean(token) && !getStrongPasswordError(password) && confirm.length > 0 && password === confirm && !loading;

    const getErrorMessage = (unknownError: unknown) => {
        if (unknownError instanceof Error && unknownError.message) return unknownError.message;
        return 'Could not reset your password. Please try again.';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!token) { setError('Reset link is missing or expired.'); return; }
        const strongPasswordError = getStrongPasswordError(password);
        if (strongPasswordError) { setError(strongPasswordError); return; }
        if (password !== confirm) { setError('Passwords do not match'); return; }
        setLoading(true);
        try {
            await apiRequest('/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({ token, password }),
            });
            setSuccess(true);
            setTimeout(() => router.push('/'), 3000);
        } catch (err: unknown) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <Layout>
                <div className="container section auth-reset__invalid">
                    <div className="auth-reset__status-icon"><AppIcon name="fileText" size={40} aria-hidden /></div>
                    <h2>Invalid Reset Link</h2>
                    <p className="auth-reset__status-copy">
                        This password reset link is invalid or has expired. Please request a new one.
                    </p>
                    <div className="auth-reset__actions">
                        <Link href="/" className="btn btn--ghost">Back Home</Link>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="container section auth-reset">
                {success ? (
                    <div className="auth-reset__success">
                        <div className="auth-reset__status-icon"><AppIcon name="checkCircle" size={40} aria-hidden /></div>
                        <h2>Password Reset!</h2>
                        <p className="auth-reset__status-copy">
                            Your password has been updated. Redirecting to homepage...
                        </p>
                        <div className="auth-reset__actions">
                            <Link href="/" className="btn btn--primary">Go to Home</Link>
                        </div>
                    </div>
                ) : (
                    <>
                        <h2 className="auth-reset__title">Set New Password</h2>
                        <p className="auth-reset__hint">Use 8+ chars with uppercase, lowercase, number, and special character.</p>
                        {error && (
                            <div className="auth-reset__error" role="alert">
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="auth-reset__form">
                            <div className="auth-reset__field">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    placeholder="At least 8 characters"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                            <div className="auth-reset__field">
                                <label>Confirm Password</label>
                                <input
                                    type="password"
                                    required
                                    placeholder="Repeat your password"
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="btn btn--primary auth-reset__submit" disabled={loading}>
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                            {!loading && confirm.length > 0 && password !== confirm && (
                                <p className="auth-reset__error" role="status" aria-live="polite">Passwords must match before submitting.</p>
                            )}
                        </form>
                    </>
                )}
            </div>
        </Layout>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="auth-reset__loading">Loading...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
