'use client';
import { createContext, useContext, useState, useCallback } from 'react';
import type { AppProviderProps, ToastContextValue, ToastItem, ToastType } from '../types/app';

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: AppProviderProps) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info', img?: string) => {
        const id = Date.now();
        setToasts((prev: ToastItem[]) => [...prev, { id, message, type, img }]);
        setTimeout(() => setToasts((prev: ToastItem[]) => prev.filter(t => t.id !== id)), 3500);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="toast-container" aria-live="polite" aria-atomic="true">
                {toasts.map(t => (
                    <div key={t.id} className={`toast toast--${t.type}`}>
                        {t.img && <img src={t.img} alt="" width={32} height={32} className="toast__img" />}
                        <span>{t.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextValue {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
}
