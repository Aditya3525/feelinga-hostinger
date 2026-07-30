'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Layout from '../../components/Layout';
import ProductCard from '../../components/ProductCard';
import EmptyState from '../../components/EmptyState';
import AppIcon from '../../components/AppIcon';
import { useCart } from '../../context/CartContext';
import { renderStars } from '../../utils/renderStars';
import { apiRequest } from '../../utils/api';
import { resolveProductImageUrl } from '../../utils/image';
import type { ChangeEvent } from 'react';

type ShopSort = 'popular' | 'newest' | 'price-asc' | 'price-desc';
type FilterGroupKey = 'type' | 'mood' | 'origin' | 'price';

type ShopFilters = Record<FilterGroupKey, string[]>;

type ShopProduct = {
    id: string;
    slug: string;
    name: string;
    type: string;
    typeName?: string;
    moods: string[];
    origin: string;
    originLabel: string;
    price: number;
    sizePrices: Array<{ size: string; value: number }>;
    img: string;
    note: string;
    reviews: number;
    stars: number;
    stock: number;
    caffeine?: string;
    tastingNotes: string[];
    isBestSeller: boolean;
    isNewArrival: boolean;
    badges: Array<{ label: string; className?: string }>;
    badge?: string | null;
    badgeColor?: string;
    inStock: boolean;
};

type FilterOption = { value: string; label: string };
type FilterGroup = { key: FilterGroupKey; title: string; options: FilterOption[] };

function ShopInner() {
    const { addToCart } = useCart();
    const searchParams = useSearchParams();
    const [products, setProducts] = useState<ShopProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<ShopFilters>({ type: [], mood: [], origin: [], price: [] });
    const [sort, setSort] = useState<ShopSort>('popular');
    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);
    const LIMIT = 12;

    // Sync mood and search query from URL params
    useEffect(() => {
        const moodParam = searchParams.get('mood');
        if (moodParam) setFilters(prev => ({ ...prev, mood: [moodParam] }));
        else setFilters(prev => ({ ...prev, mood: [] }));
        const qParam = searchParams.get('q');
        setSearchQuery(qParam || '');
        // Support direct type param from footer links (e.g. ?type=Green+Tea)
        const typeParam = searchParams.get('type');
        if (typeParam) {
            const reverseTypeMap: Record<string, string> = { 'Green Tea': 'green', 'Black Tea': 'black', 'White Tea': 'white', 'Oolong': 'oolong', 'Herbal': 'herbal', 'Herbal Infusion': 'herbal', 'Masala Chai': 'chai' };
            const key = reverseTypeMap[typeParam];
            if (key) setFilters(prev => ({ ...prev, type: [key] }));
            else setFilters(prev => ({ ...prev, type: [] }));
        } else {
            setFilters(prev => ({ ...prev, type: [] }));
        }
    }, [searchParams]);

    useEffect(() => {
        if (!mobileFilterOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setMobileFilterOpen(false);
        };
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleEscape);
        };
    }, [mobileFilterOpen]);

    // Fetch products from API
    // Fetch products from API with current filters + page
    useEffect(() => {
        const controller = new AbortController();
        async function fetchProducts() {
            try {
                setLoading(true);
                setError(null);
                const params = new URLSearchParams();
                params.set('limit', String(LIMIT));
                params.set('page', String(page));

                // Sort
                const sortMap: Record<ShopSort, string> = { popular: '-reviewCount', newest: '-createdAt', 'price-asc': 'price', 'price-desc': '-price' };
                params.set('sort', sortMap[sort] || '-reviewCount');

                // Filters
                if (filters.type.length === 1) {
                    const typeMap: Record<string, string> = { green: 'Green Tea', black: 'Black Tea', white: 'White Tea', oolong: 'Oolong', herbal: 'Herbal', chai: 'Masala Chai' };
                    if (typeMap[filters.type[0]]) params.set('type', typeMap[filters.type[0]]);
                }
                filters.mood.forEach(m => params.append('mood', m));
                if (searchQuery) params.set('q', searchQuery);
                if (filters.price.length === 1) {
                    if (filters.price[0] === 'under500') params.set('maxPrice', '500');
                    else if (filters.price[0] === '500-999') { params.set('minPrice', '500'); params.set('maxPrice', '999'); }
                    else if (filters.price[0] === '1000-plus') params.set('minPrice', '1000');
                }
                // Origin filter
                if (filters.origin.length === 1) {
                    params.set('origin', filters.origin[0]);
                }

                const data = await apiRequest(`/products?${params.toString()}`, { signal: controller.signal }) as any;
                if (data.data) {
                    setProducts(data.data.map((p: any): ShopProduct => ({
                        // Prepare badges by priority for the product card
                        // to reflect key admin attributes in the shop view.
                        // Order: sold out > best seller > new arrival.
                        ...(() => {
                            const inStock = Boolean(p.inStock);
                            const badges: Array<{ label: string; className?: string }> = [];
                            if (!inStock) badges.push({ label: 'Sold Out', className: 'product-card__badge--danger' });
                            if (p.isBestSeller) badges.push({ label: 'Best Seller', className: 'product-card__badge--gold' });
                            if (p.isNewArrival) badges.push({ label: 'New Arrival', className: 'product-card__badge--success' });
                            return { inStock, badges };
                        })(),
                        id: p._id,
                        slug: p.slug,
                        name: p.name,
                        type: p.type?.toLowerCase().replace(/\s+/g, '').replace('tea', '').replace('masala', 'chai').replace('herbalinfusion', 'herbal') || '',
                        typeName: p.type,
                        moods: p.moods || [],
                        origin: p.origin?.split(',')[0]?.trim().toLowerCase() || '',
                        originLabel: p.origin?.split(',')[0]?.trim() || '',
                        price: p.prices?.['100g'] || 0,
                        sizePrices: [
                            ['50g', p.prices?.['50g']],
                            ['100g', p.prices?.['100g']],
                            ['200g', p.prices?.['200g']],
                        ]
                            .filter(([, value]) => Number.isFinite(Number(value)) && Number(value) > 0)
                            .map(([size, value]) => ({ size, value: Number(value) })),
                        img: resolveProductImageUrl(p.images?.[0], '/images/products/darjeeling-ff.jpg'),
                        note: p.shortDescription || (p.description ? p.description.substring(0, 70) + '...' : ''),
                        reviews: p.reviewCount || 0,
                        stars: Math.round(p.rating || 0),
                        stock: Number(p.stock || 0),
                        caffeine: p.caffeine || '',
                        tastingNotes: Array.isArray(p.tastingNotes) ? p.tastingNotes : [],
                        isBestSeller: Boolean(p.isBestSeller),
                        isNewArrival: Boolean(p.isNewArrival),
                        badge: !p.inStock ? 'Sold Out' : null,
                        badgeColor: !p.inStock ? 'var(--color-error)' : undefined,
                        inStock: Boolean(p.inStock),
                    })));
                    setTotalPages(data.pagination?.totalPages || 1);
                    setTotal(data.pagination?.total || data.results || 0);
                }
            } catch (err: unknown) {
                if (err instanceof DOMException && err.name === 'AbortError') return;
                console.error('Failed to load products:', err);
                setError(err instanceof Error ? err.message : 'Failed to load products.');
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
        return () => controller.abort();
    }, [filters, sort, page, searchQuery]);

    const toggleFilter = (group: FilterGroupKey, value: string) => {
        setPage(1); // reset to page 1 on filter change
        setFilters((prev: ShopFilters) => ({
            ...prev,
            [group]: prev[group].includes(value)
                ? prev[group].filter((v: string) => v !== value)
                : [...prev[group], value],
        }));
    };

    const handleSortChange = (val: ShopSort) => { setSort(val); setPage(1); };
    const activeFilterCount = Object.values(filters).reduce((count, values) => count + values.length, 0);
    const pageWindow = 2;
    const startPage = Math.max(1, page - pageWindow);
    const endPage = Math.min(totalPages, page + pageWindow);
    const visiblePages = Array.from({ length: endPage - startPage + 1 }, (_, idx) => startPage + idx);


    const filterGroups: FilterGroup[] = [
        { key: 'type', title: 'Tea Type', options: [{ value: 'green', label: 'Green Tea' }, { value: 'black', label: 'Black Tea' }, { value: 'white', label: 'White Tea' }, { value: 'oolong', label: 'Oolong' }, { value: 'herbal', label: 'Herbal & Tisane' }, { value: 'chai', label: 'Masala Chai' }] },
        { key: 'mood', title: 'Mood / Benefit', options: [{ value: 'energize', label: 'Energize' }, { value: 'relax', label: 'Relax' }, { value: 'focus', label: 'Focus' }, { value: 'detox', label: 'Detox' }, { value: 'glow', label: 'Glow' }] },
        { key: 'origin', title: 'Origin', options: [{ value: 'darjeeling', label: 'Darjeeling' }, { value: 'assam', label: 'Assam' }, { value: 'nilgiri', label: 'Nilgiri' }, { value: 'kangra', label: 'Kangra' }] },
        { key: 'price', title: 'Price Range', options: [{ value: 'under500', label: 'Under ₹500' }, { value: '500-999', label: '₹500 – ₹999' }, { value: '1000-plus', label: '₹1,000+' }] },
    ];

    const handleAddToCart = (p: ShopProduct) => {
        addToCart({
            id: p.id,
            slug: p.slug,
            name: p.name,
            price: p.price,
            size: '100g',
            img: p.img,
        });
    };

    return (
        <Layout>
            <div className="page-hero">
                <div className="container">
                    <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link> <span>/</span> <span>Shop</span></nav>
                    <p className="overline">Our Collection</p>
                    <h1>Shop All Teas</h1>
                    <p>Explore our handcrafted teas sourced from India&apos;s finest estates.</p>
                </div>
            </div>
            <div className="container">
                <div className="plp-layout section">
                    {mobileFilterOpen && <div className="plp-mobile-overlay active" aria-hidden="true" onClick={() => setMobileFilterOpen(false)} />}
                    <aside id="shop-filters" className={`plp-sidebar ${mobileFilterOpen ? 'active' : ''}`}>
                        <div className="plp-sidebar__header">
                            <span className="plp-sidebar__title">Filters</span>
                            <button
                                type="button"
                                className="plp-sidebar__close"
                                aria-label="Close filters"
                                onClick={() => setMobileFilterOpen(false)}
                            >
                                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>
                        {filterGroups.map(group => (
                            <div className="filter-group" key={group.key}>
                                <div className="filter-group__title">{group.title}</div>
                                <div className="filter-group__options">
                                    {group.options.map(opt => (
                                        <label className="filter-option" key={opt.value}>
                                            <input type="checkbox" value={opt.value} checked={filters[group.key].includes(opt.value)} onChange={() => toggleFilter(group.key, opt.value)} /> {opt.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </aside>
                    <div>
                        <div className="plp-topbar">
                            <button type="button" className="btn btn--sm btn--secondary mobile-filter-toggle" aria-expanded={mobileFilterOpen} aria-controls="shop-filters" onClick={() => setMobileFilterOpen(!mobileFilterOpen)}><AppIcon name="menu" size={14} aria-hidden /> Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</button>
                            <span className="plp-topbar__count" aria-live="polite">Showing {products.length} of {total} teas</span>
                            <div className="plp-topbar__sort">
                                <select aria-label="Sort products" value={sort} onChange={(e: ChangeEvent<HTMLSelectElement>) => handleSortChange(e.target.value as ShopSort)}>
                                    <option value="popular">Sort: Popular</option>
                                    <option value="newest">Newest</option>
                                    <option value="price-asc">Price: Low to High</option>
                                    <option value="price-desc">Price: High to Low</option>
                                </select>
                            </div>
                        </div>

                        {/* Active filter chips — visible on mobile when filters are applied */}
                        {Object.values(filters).some((arr: string[]) => arr.length > 0) && (
                            <div className="plp-active-filters">
                                {filterGroups.flatMap(group =>
                                    (filters[group.key] as string[]).map(val => {
                                        const opt = group.options.find(o => o.value === val);
                                        return opt ? (
                                            <span key={`${group.key}-${val}`} className="plp-active-filter">
                                                {opt.label}
                                                <button
                                                    type="button"
                                                    className="plp-active-filter__remove plp-active-filter__remove-btn"
                                                    aria-label={`Remove ${opt.label} filter`}
                                                    onClick={() => toggleFilter(group.key, val)}
                                                ><AppIcon name="xCircle" size={12} aria-hidden /></button>
                                            </span>
                                        ) : null;
                                    })
                                )}
                                <button
                                    type="button"
                                    className="plp-active-filter plp-active-filter--clear"
                                    aria-label="Clear all filters"
                                    onClick={() => { setFilters({ type: [], mood: [], origin: [], price: [] }); setPage(1); }}
                                >
                                    Clear all <AppIcon name="xCircle" size={12} aria-hidden />
                                </button>
                            </div>
                        )}

                        {loading ? (
                            <div className="state-center py-3xl">
                                <div className="state-emoji"><AppIcon name="leaf" size={32} aria-hidden /></div>
                                <p className="mt-md state-text">Loading teas...</p>
                            </div>
                        ) : error ? (
                            <EmptyState
                                title="Unable to load teas"
                                message={error}
                                actionLabel="Try Again"
                                actionHref="/shop"
                                className="py-3xl"
                            />
                        ) : (
                            <div className="plp-products">
                                {products.length === 0 ? (
                                    <EmptyState
                                        message="No teas match your filters. Try adjusting your criteria."
                                        className="py-3xl grid-span-full"
                                    />
                                ) : (
                                    products.map((p: ShopProduct) => (
                                        <ProductCard
                                            key={p.id}
                                            product={p}
                                            badge={p.badge}
                                            badgeClass={p.badgeColor ? 'product-card__badge--danger' : undefined}
                                            renderStars={renderStars}
                                            onAdd={handleAddToCart}
                                        />
                                    ))
                                )}
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="pagination-bar">
                                <button
                                    className="btn btn--ghost btn--sm"
                                    onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    disabled={page === 1}
                                >← Prev</button>
                                {startPage > 1 && <span className="pagination-gap" aria-hidden="true">...</span>}
                                {visiblePages.map(n => (
                                    <button
                                        key={n}
                                        className={`btn btn--sm ${n === page ? 'btn--primary' : 'btn--ghost'} min-w-38`}
                                        aria-current={n === page ? 'page' : undefined}
                                        onClick={() => { setPage(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    >{n}</button>
                                ))}
                                {endPage < totalPages && <span className="pagination-gap" aria-hidden="true">...</span>}
                                <button
                                    className="btn btn--ghost btn--sm"
                                    onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    disabled={page === totalPages}
                                >Next →</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default function Shop() {
    return (
        <Suspense fallback={<Layout><div className="container section state-center py-3xl">Loading...</div></Layout>}>
            <ShopInner />
        </Suspense>
    );
}
