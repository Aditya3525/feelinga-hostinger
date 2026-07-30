'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import type { AppProviderProps, ThemeContextValue, ThemeMode } from '../types/app';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const THEME_TRANSITION_MS = 980;

export function ThemeProvider({ children }: AppProviderProps) {
    const [theme, setTheme] = useState<ThemeMode>('light');

    const applyTheme = (mode: ThemeMode) => {
        setTheme(mode);
        localStorage.setItem('feelinga_theme', mode);
        document.documentElement.setAttribute('data-theme', mode);
    };

    useEffect(() => {
        const saved = (localStorage.getItem('feelinga_theme') || 'light') as ThemeMode;
        setTheme(saved);
        document.documentElement.setAttribute('data-theme', saved);
    }, []);

    const clearTransitionClasses = () => {
        const root = document.documentElement;
        root.classList.remove('theme-transition', 'theme-transition--to-dark', 'theme-transition--to-light');
    };

    const toggleTheme = () => {
        const next: ThemeMode = theme === 'light' ? 'dark' : 'light';
        const root = document.documentElement;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (reduceMotion) {
            applyTheme(next);
            return;
        }

        const directionClass = next === 'dark' ? 'theme-transition--to-dark' : 'theme-transition--to-light';
        clearTransitionClasses();
        root.classList.add('theme-transition', directionClass);

        const cleanupTransition = () => {
            window.setTimeout(() => {
                clearTransitionClasses();
            }, THEME_TRANSITION_MS + 120);
        };

        const docWithTransition = document as Document & {
            startViewTransition?: (callback: () => void) => { finished: Promise<void> };
        };

        if (typeof docWithTransition.startViewTransition === 'function') {
            const transition = docWithTransition.startViewTransition(() => {
                applyTheme(next);
            });
            transition.finished.finally(() => {
                cleanupTransition();
            });
            return;
        }

        applyTheme(next);
        cleanupTransition();
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within ThemeProvider');
    return context;
}
