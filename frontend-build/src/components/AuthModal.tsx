'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import AppIcon from './AppIcon';
import { apiRequest } from '../utils/api';
import type { FormEvent } from 'react';
import { getEmailError } from '../utils/email';
import { checkEmailAddress } from '../utils/emailCheck';

type AuthTab = 'login' | 'signup';

type PasswordRule = {
    label: string;
    passed: boolean;
};

type PasswordStrength = {
    label: 'weak' | 'fair' | 'good' | 'strong';
    score: number;
};

type GoogleCredentialResponse = {
    credential: string;
};

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
                    renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
                };
            };
        };
    }
}

function getErrorMessage(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback;
}

function getPasswordRules(password: string): PasswordRule[] {
    return [
        { label: 'At least 8 characters', passed: password.length >= 8 },
        { label: 'One uppercase letter', passed: /[A-Z]/.test(password) },
        { label: 'One lowercase letter', passed: /[a-z]/.test(password) },
        { label: 'One number', passed: /\d/.test(password) },
        { label: 'One special character', passed: /[^A-Za-z0-9]/.test(password) },
    ];
}

function getPasswordStrength(password: string): PasswordStrength {
    const score = getPasswordRules(password).filter(rule => rule.passed).length;
    if (score <= 2) return { label: 'weak', score };
    if (score === 3) return { label: 'fair', score };
    if (score === 4) return { label: 'good', score };
    return { label: 'strong', score };
}

export default function AuthModal() {
    const { showAuthModal, closeAuthModal, login, register, googleLogin } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<AuthTab>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showForgot, setShowForgot] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotSent, setForgotSent] = useState(false);
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [showSignupPassword, setShowSignupPassword] = useState(false);
    const [showSignupConfirm, setShowSignupConfirm] = useState(false);
    const [signupPassword, setSignupPassword] = useState('');
    const [loginEmail, setLoginEmail] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupEmailChecking, setSignupEmailChecking] = useState(false);
    const [showLoginSignupHint, setShowLoginSignupHint] = useState(false);
    const dialogRef = useRef<HTMLDivElement>(null);

    const passwordRules = getPasswordRules(signupPassword);
    const passwordStrength = getPasswordStrength(signupPassword);
    const hasGoogleClientId = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim());

    const handleGoogleLogin = useCallback(async (response: GoogleCredentialResponse) => {
        setError('');
        setLoading(true);
        try {
            await googleLogin(response.credential);
            showToast('Welcome!', 'success');
            closeAuthModal();
        } catch (err) {
            setError(getErrorMessage(err, 'Google login failed'));
        } finally {
            setLoading(false);
        }
    }, [googleLogin, showToast, closeAuthModal]);

    useEffect(() => {
        if (!showAuthModal) return;
        const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
        if (!GOOGLE_CLIENT_ID) return;

        // Load the GSI script once
        if (!document.getElementById('google-gsi-script')) {
            const script = document.createElement('script');
            script.id = 'google-gsi-script';
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                const google = window.google;
                google?.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleLogin,
                });
                const btnContainer = document.getElementById('google-signin-btn');
                if (btnContainer && google) {
                    google.accounts.id.renderButton(btnContainer, {
                        theme: 'outline', size: 'large', width: '100%', text: 'continue_with',
                    });
                }
            };
            document.head.appendChild(script);
        } else if (window.google?.accounts) {
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleLogin,
            });
            const btnContainer = document.getElementById('google-signin-btn');
            if (btnContainer) {
                btnContainer.innerHTML = '';
                window.google.accounts.id.renderButton(btnContainer, {
                    theme: 'outline', size: 'large', width: '100%', text: 'continue_with',
                });
            }
        }
    }, [showAuthModal, handleGoogleLogin]);

    useEffect(() => {
        if (!showAuthModal) {
            setError('');
            setShowForgot(false);
            setForgotSent(false);
        }
    }, [showAuthModal]);

    // Focus trap + Escape key handler (runs when modal is shown)
    useEffect(() => {
        if (!showAuthModal || !dialogRef.current) return;
        const dialog = dialogRef.current;

        // Focus the dialog so keyboard events work
        dialog.focus();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { closeAuthModal(); return; }
            if (e.key !== 'Tab') return;
            const focusable = dialog.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showAuthModal, closeAuthModal, activeTab, showForgot]);

    if (!showAuthModal) return null;

    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setShowLoginSignupHint(false);
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const email = String(formData.get('email') || '').trim();
        const password = String(formData.get('password') || '');
        try {
            await login(email, password);
            showToast('Welcome back!', 'success');
            closeAuthModal();
        } catch (err) {
            const message = getErrorMessage(err, 'Login failed');
            const normalized = message.toLowerCase();
            setError(message);
            if (normalized.includes('invalid email or password') || normalized.includes('user not found')) {
                setSignupEmail(email);
                setShowLoginSignupHint(true);
            }
        } finally { setLoading(false); }
    };

    const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        const formData = new FormData(e.currentTarget);
        const name = String(formData.get('name') || '').trim();
        const email = String(formData.get('email') || '').trim();
        const password = String(formData.get('password') || '');
        const confirmPassword = String(formData.get('confirm') || '');
        const strongPassword = getPasswordRules(password).every(rule => rule.passed);
        const emailError = getEmailError(email);
        if (emailError) { setError(emailError); return; }
        if (password !== confirmPassword) { setError('Passwords do not match'); return; }
        if (!strongPassword) {
            setError('Password must include uppercase, lowercase, number, and special character.');
            return;
        }
        setLoading(true);
        try {
            const emailCheck = await checkEmailAddress(email);
            if (!emailCheck.valid) {
                setError(emailCheck.reason || 'Please enter a valid email address.');
                return;
            }
            await register(name, email, password);
            showToast('Account created! Welcome to Feelinga.', 'success');
            closeAuthModal();
        } catch (err) {
            const message = getErrorMessage(err, 'Registration failed');
            const normalized = message.toLowerCase();
            if (normalized.includes('already registered') || normalized.includes('already in use')) {
                switchTab('login');
                setLoginEmail(email);
                setError('This email already has an account. Please sign in.');
            } else {
                setError(message);
            }
        } finally { setLoading(false); }
    };

    const handleForgotPassword = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            await apiRequest('/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email: forgotEmail }),
            });
            setForgotSent(true);
        } catch {
            // Even if email not found, show success (security best practice)
            setForgotSent(true);
        } finally { setLoading(false); }
    };

    const switchTab = (tab: AuthTab) => {
        setActiveTab(tab);
        setError('');
        setShowLoginSignupHint(false);
        setShowForgot(false);
        setForgotSent(false);
        setShowLoginPassword(false);
        setShowSignupPassword(false);
        setShowSignupConfirm(false);
        setSignupPassword('');
        setSignupEmailChecking(false);
    };

    const handleSignupEmailBlur = async (email: string) => {
        const emailError = getEmailError(email);
        if (emailError) {
            setError(emailError);
            return;
        }

        setSignupEmailChecking(true);
        try {
            const result = await checkEmailAddress(email);
            if (!result.valid) {
                setError(result.reason || 'Please enter a valid email address.');
            }
        } catch {
            setError('Unable to verify this email address right now. Please try again.');
        } finally {
            setSignupEmailChecking(false);
        }
    };

    return (
        <div className="auth-modal active">
            <div className="auth-modal__overlay" onClick={closeAuthModal}></div>
            <div className="auth-modal__dialog" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={activeTab === 'login' ? 'Sign in' : 'Create account'}>
                <button className="auth-modal__close" onClick={closeAuthModal} aria-label="Close">
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>

                {showForgot ? (
                    <>
                        <div className="auth-modal__header">
                            <h2 className="auth-modal__title">Reset Password</h2>
                            <p className="auth-modal__subtitle">Enter your email to receive a reset link</p>
                        </div>
                        {forgotSent ? (
                            <div className="auth-modal__forgot-success">
                                <div className="auth-modal__forgot-icon"><AppIcon name="send" size={40} aria-hidden /></div>
                                <p className="auth-modal__forgot-title">Check your inbox!</p>
                                <p className="auth-modal__forgot-copy">
                                    If an account exists for <strong>{forgotEmail}</strong>, we&apos;ve sent a password reset link.
                                </p>
                                <button className="btn btn--ghost btn--sm auth-modal__forgot-back" onClick={() => { setShowForgot(false); setForgotSent(false); }}>
                                    ← Back to Login
                                </button>
                            </div>
                        ) : (
                            <form className="auth-modal__form" onSubmit={handleForgotPassword}>
                                <div className="auth-modal__field">
                                    <label htmlFor="forgotEmail">Email Address</label>
                                    <input
                                        type="email" id="forgotEmail" required
                                        placeholder="your@email.com"
                                        autoComplete="email"
                                        value={forgotEmail}
                                        onChange={e => setForgotEmail(e.target.value)}
                                    />
                                </div>
                                <button type="submit" className="btn btn--primary auth-modal__submit" disabled={loading}>
                                    {loading ? 'Sending...' : 'Send Reset Link'}
                                </button>
                                <div className="auth-modal__back-wrap">
                                    <button type="button" className="auth-modal__toggle" onClick={() => setShowForgot(false)}>← Back to Login</button>
                                </div>
                            </form>
                        )}
                    </>
                ) : (
                    <>
                        <div className="auth-modal__header">
                            <h2 className="auth-modal__title">
                                {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
                            </h2>
                            <p className="auth-modal__subtitle">
                                {activeTab === 'login' ? 'Sign in to your Feelinga account' : 'Join the tea community'}
                            </p>
                        </div>
                        <div className="auth-modal__tabs" role="tablist">
                            <button className={`auth-modal__tab ${activeTab === 'login' ? 'active' : ''}`} onClick={() => switchTab('login')}>Login</button>
                            <button className={`auth-modal__tab ${activeTab === 'signup' ? 'active' : ''}`} onClick={() => switchTab('signup')}>Sign Up</button>
                        </div>
                        {error && <div className="auth-modal__error auth-modal__error--visible">{error}</div>}

                        {activeTab === 'login' ? (
                            <form className="auth-modal__form" onSubmit={handleLogin}>
                                <div className="auth-modal__field">
                                    <label htmlFor="loginEmail">Email</label>
                                    <input
                                        type="email"
                                        id="loginEmail"
                                        name="email"
                                        required
                                        placeholder="your@email.com"
                                        autoComplete="email"
                                        value={loginEmail}
                                        onChange={e => {
                                            setLoginEmail(e.target.value);
                                            setShowLoginSignupHint(false);
                                        }}
                                    />
                                </div>
                                <div className="auth-modal__field">
                                    <label htmlFor="loginPassword">Password</label>
                                    <div className="auth-modal__password-wrap">
                                        <input
                                            type={showLoginPassword ? 'text' : 'password'}
                                            id="loginPassword"
                                            name="password"
                                            required
                                            placeholder="Min 8 characters"
                                            autoComplete="current-password"
                                        />
                                        <button
                                            type="button"
                                            className="auth-modal__password-toggle"
                                            aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                                            onClick={() => setShowLoginPassword(prev => !prev)}
                                        >
                                            {showLoginPassword ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                </div>
                                <div className="auth-modal__forgot-link-wrap">
                                    <button type="button" className="auth-modal__toggle auth-modal__toggle--sm" onClick={() => setShowForgot(true)}>
                                        Forgot password?
                                    </button>
                                </div>
                                {showLoginSignupHint && (
                                    <div className="auth-modal__assist">
                                        New to Feelinga?{' '}
                                        <button
                                            type="button"
                                            className="auth-modal__toggle"
                                            onClick={() => {
                                                switchTab('signup');
                                                setSignupEmail(loginEmail);
                                            }}
                                        >
                                            Create your account
                                        </button>
                                    </div>
                                )}
                                <button type="submit" className="btn btn--primary auth-modal__submit" disabled={loading}>
                                    {loading ? 'Signing in...' : 'SIGN IN'}
                                </button>
                            </form>
                        ) : (
                            <form className="auth-modal__form" onSubmit={handleRegister}>
                                <div className="auth-modal__field">
                                    <label htmlFor="signupName">Full Name</label>
                                    <input type="text" id="signupName" name="name" required placeholder="Your full name" autoComplete="name" />
                                </div>
                                <div className="auth-modal__field">
                                    <label htmlFor="signupEmail">Email</label>
                                    <input
                                        type="email"
                                        id="signupEmail"
                                        name="email"
                                        required
                                        placeholder="your@email.com"
                                        autoComplete="email"
                                        value={signupEmail}
                                        onChange={e => setSignupEmail(e.target.value)}
                                        onBlur={(e) => { void handleSignupEmailBlur(e.currentTarget.value); }}
                                    />
                                </div>
                                {signupEmailChecking && <div className="auth-modal__assist">Verifying email address...</div>}
                                <div className="auth-modal__field">
                                    <label htmlFor="signupPassword">Password</label>
                                    <div className="auth-modal__password-wrap">
                                        <input
                                            type={showSignupPassword ? 'text' : 'password'}
                                            id="signupPassword"
                                            name="password"
                                            required
                                            minLength={8}
                                            placeholder="Min 8 characters"
                                            autoComplete="new-password"
                                            value={signupPassword}
                                            onChange={e => setSignupPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            className="auth-modal__password-toggle"
                                            aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                                            onClick={() => setShowSignupPassword(prev => !prev)}
                                        >
                                            {showSignupPassword ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                </div>

                                <div className="auth-modal__password-guide" aria-live="polite">
                                    <div className="auth-modal__password-guide-head">
                                        <strong>Strong password guide</strong>
                                        <span className={`auth-modal__password-strength auth-modal__password-strength--${passwordStrength.label}`}>
                                            {passwordStrength.label.toUpperCase()}
                                        </span>
                                    </div>
                                    <ul className="auth-modal__password-rules">
                                        {passwordRules.map(rule => (
                                            <li key={rule.label} className={rule.passed ? 'passed' : ''}>
                                                <span aria-hidden="true">{rule.passed ? <AppIcon name="check" size={12} aria-hidden /> : <AppIcon name="circle" size={8} aria-hidden />}</span>
                                                <span>{rule.label}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="auth-modal__field">
                                    <label htmlFor="signupConfirm">Confirm Password</label>
                                    <div className="auth-modal__password-wrap">
                                        <input
                                            type={showSignupConfirm ? 'text' : 'password'}
                                            id="signupConfirm"
                                            name="confirm"
                                            required
                                            minLength={8}
                                            placeholder="Confirm password"
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            className="auth-modal__password-toggle"
                                            aria-label={showSignupConfirm ? 'Hide confirm password' : 'Show confirm password'}
                                            onClick={() => setShowSignupConfirm(prev => !prev)}
                                        >
                                            {showSignupConfirm ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                </div>
                                <button type="submit" className="btn btn--primary auth-modal__submit" disabled={loading}>
                                    {loading ? 'Creating...' : 'CREATE ACCOUNT'}
                                </button>
                            </form>
                        )}

                        {hasGoogleClientId && (
                            <>
                                <div className="auth-modal__divider"><span>OR</span></div>
                                <div id="google-signin-btn" className="auth-modal__google-wrap" />
                            </>
                        )}

                        <div className="auth-modal__footer">
                            {activeTab === 'login' ? (
                                <span>Don&apos;t have an account? <button className="auth-modal__toggle" onClick={() => switchTab('signup')}>Sign Up</button></span>
                            ) : (
                                <span>Already have an account? <button className="auth-modal__toggle" onClick={() => switchTab('login')}>Login</button></span>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
