'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AppIcon from './AppIcon';
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { ProductSearchResult } from '../types/app';

type SearchOverlayProps = {
    isOpen: boolean;
    onClose: () => void;
};

const RECENT_SEARCHES_KEY = 'feelinga_recent_searches';
const MAX_RECENT_SEARCHES = 4;

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ProductSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const lastFocusedElementRef = useRef<HTMLElement | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (!isOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        setQuery('');
        setResults([]);
        setIsLoading(false);
        setActiveIndex(-1);

        try {
            const stored = window.localStorage.getItem(RECENT_SEARCHES_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    setRecentSearches(parsed.filter((value): value is string => typeof value === 'string').slice(0, MAX_RECENT_SEARCHES));
                }
            }
        } catch {
            setRecentSearches([]);
        }

        lastFocusedElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        inputRef.current?.focus();

        return () => {
            document.body.style.overflow = previousOverflow;
            abortRef.current?.abort();
            lastFocusedElementRef.current?.focus();
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const normalizedQuery = query.trim();
        setActiveIndex(-1);

        if (!normalizedQuery) {
            setResults([]);
            setIsLoading(false);
            abortRef.current?.abort();
            return;
        }

        const controller = new AbortController();
        abortRef.current?.abort();
        abortRef.current = controller;
        setIsLoading(true);

        const timeout = window.setTimeout(async () => {
            try {
                const res = await fetch(`/api/v1/products/autocomplete?q=${encodeURIComponent(normalizedQuery)}`, {
                    signal: controller.signal,
                });
                const data = await res.json().catch(() => ({}));
                if (!controller.signal.aborted) {
                    setResults(Array.isArray(data.data) ? data.data : []);
                }
            } catch {
                if (!controller.signal.aborted) {
                    setResults([]);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }, 180);

        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [isOpen, query]);

    useEffect(() => {
        if (!isOpen) return;

        const handler = (e: KeyboardEvent) => {
            const dialog = dialogRef.current;
            if (!dialog) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
                return;
            }

            if (e.key !== 'Tab') return;

            const focusable = Array.from(
                dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
            ).filter((el) => !el.hasAttribute('disabled'));

            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
    };

    const tags = ['Green Tea', 'Darjeeling', 'Herbal', 'Chai', 'Wellness', 'Gift Sets'];

    const addRecentSearch = (term: string) => {
        const normalized = term.trim();
        if (!normalized) return;

        setRecentSearches((prev) => {
            const next = [
                normalized,
                ...prev.filter((entry) => entry.toLowerCase() !== normalized.toLowerCase()),
            ].slice(0, MAX_RECENT_SEARCHES);

            try {
                window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
            } catch {
                // Ignore write failures in private browsing/storage-restricted environments.
            }

            return next;
        });
    };

    const commitQuerySearch = (term: string) => {
        const normalized = term.trim();
        if (!normalized) return;
        addRecentSearch(normalized);
        router.push(`/shop?q=${encodeURIComponent(normalized)}`);
        onClose();
    };

    const handleResultSelect = (product: ProductSearchResult) => {
        addRecentSearch(query.trim() || product.name);
        router.push(`/product/${product.slug}`);
        onClose();
    };

    const handleInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            if (results.length === 0) return;
            e.preventDefault();
            setActiveIndex((prev) => (prev >= results.length - 1 ? 0 : prev + 1));
            return;
        }

        if (e.key === 'ArrowUp') {
            if (results.length === 0) return;
            e.preventDefault();
            setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
            return;
        }

        if (e.key === 'Enter') {
            const activeResult = activeIndex >= 0 ? results[activeIndex] : null;
            if (activeResult) {
                e.preventDefault();
                handleResultSelect(activeResult);
                return;
            }

            if (query.trim()) {
                e.preventDefault();
                commitQuerySearch(query);
            }
        }
    };

    const handleTagClick = (tag: string) => {
        addRecentSearch(tag);
        if (tag === 'Gift Sets') {
            router.push('/gifting');
        } else {
            router.push(`/shop?q=${encodeURIComponent(tag)}`);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div id="site-search-dialog" className="search-overlay active" role="dialog" aria-modal="true" aria-labelledby="search-overlay-title" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="search-overlay__inner" ref={dialogRef}>
                <div className="search-overlay__header">
                    <div className="search-overlay__title-wrap">
                        <h3 id="search-overlay-title">Search Our Collection</h3>
                        <p>Discover teas by flavour, mood, or moment.</p>
                    </div>
                    <button type="button" className="search-overlay__close" onClick={onClose} aria-label="Close search">
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="search-overlay__body">
                    <div className="search-overlay__input-wrap">
                        <svg className="search-overlay__icon" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        <input
                            ref={inputRef}
                            type="text"
                            className="search-overlay__input"
                            placeholder="Search teas, flavours, moods..."
                            value={query}
                            onChange={handleSearch}
                            onKeyDown={handleInputKeyDown}
                            aria-label="Search products"
                            aria-autocomplete="list"
                            aria-controls="search-results"
                        />
                        <span className="search-overlay__shortcut" aria-hidden>Enter</span>
                    </div>

                    {query.trim().length === 0 && (
                        <>
                            <div className="search-overlay__quick">
                                <span className="search-overlay__label">Popular picks</span>
                                <div className="search-overlay__tags">
                                    {tags.map((tag) => (
                                        <button type="button" key={tag} className="search-tag" onClick={() => handleTagClick(tag)}>{tag}</button>
                                    ))}
                                </div>
                            </div>
                            {recentSearches.length > 0 && (
                                <div className="search-overlay__quick search-overlay__recent">
                                    <span className="search-overlay__label">Recent</span>
                                    <div className="search-overlay__tags">
                                        {recentSearches.map((term) => (
                                            <button type="button" key={term} className="search-tag search-tag--recent" onClick={() => commitQuerySearch(term)}>{term}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {query.trim().length > 0 && (
                        <div className="search-overlay__status" aria-live="polite">
                            {isLoading ? 'Searching...' : `${results.length} result${results.length === 1 ? '' : 's'} found`}
                        </div>
                    )}

                    {results.length > 0 && (
                        <div className="search-overlay__results" id="search-results" role="listbox" aria-label="Search results">
                            {results.map((product, index) => (
                                <button
                                    type="button"
                                    key={product._id}
                                    className={`search-result ${index === activeIndex ? 'is-active' : ''}`}
                                    onClick={() => handleResultSelect(product)}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    role="option"
                                    aria-selected={index === activeIndex}
                                >
                                    <div className="search-result__img">{product.images?.[0] ? <Image src={product.images[0]} alt={product.name} width={48} height={48} className="search-result__img-el" /> : <AppIcon name="leaf" size={18} aria-hidden />}</div>
                                    <div className="search-result__info">
                                        <div className="search-result__name">{product.name}</div>
                                        <div className="search-result__type">{product.type || 'Signature blend'}</div>
                                    </div>
                                    <div className="search-result__price">₹{product.prices?.['100g'] || product.price}</div>
                                </button>
                            ))}
                        </div>
                    )}

                    {query.trim().length > 0 && !isLoading && results.length === 0 && (
                        <div className="search-overlay__empty">
                            <p>No exact match found. Try a broader keyword like green, chai, or wellness.</p>
                            <button type="button" className="search-overlay__fallback" onClick={() => commitQuerySearch(query)}>
                                View all results for &quot;{query.trim()}&quot;
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
