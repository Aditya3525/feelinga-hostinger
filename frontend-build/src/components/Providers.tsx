'use client';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../components/Toast';
import AuthModal from '../components/AuthModal';
import useFadeIn from '../hooks/useFadeIn';
import { useEffect, useState } from 'react';
import type { AppProviderProps } from '../types/app';

export default function Providers({ children }: AppProviderProps) {
    useFadeIn();
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        // Small delay for smooth entrance
        const t = setTimeout(() => setLoaded(true), 50);
        return () => clearTimeout(t);
    }, []);

    return (
        <ThemeProvider>
            <AuthProvider>
                <CartProvider>
                    <ToastProvider>
                        <AuthModal />
                        <div className={`page-wrapper ${loaded ? 'page-loaded' : ''}`}>
                            {children}
                        </div>
                    </ToastProvider>
                </CartProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}
