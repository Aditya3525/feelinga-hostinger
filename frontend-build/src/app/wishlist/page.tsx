'use client';
import Layout from '../../components/Layout';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../components/Toast';
import { apiRequest } from '../../utils/api';
import EmptyState from '../../components/EmptyState';
import AppIcon from '../../components/AppIcon';
import { resolveProductImageUrl } from '../../utils/image';

type WishlistProduct = {
    _id: string;
    slug: string;
    name: string;
    type?: string;
    shortDescription?: string;
    prices?: Record<string, number>;
    images?: string[];
    rating?: number;
    reviewCount?: number;
    inStock?: boolean;
    stock?: number;
};

function getErrorMessage(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback;
}

export default function Wishlist() {
    const { isAuthenticated, openAuthModal } = useAuth();
    const { addToCart } = useCart();
    const { showToast } = useToast();
    const [products, setProducts] = useState<WishlistProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [removingIds, setRemovingIds] = useState<string[]>([]);
    const [addingIds, setAddingIds] = useState<string[]>([]);

    useEffect(() => {
        if (!isAuthenticated) { setLoading(false); return; }
        loadWishlist();
    }, [isAuthenticated]);

    const loadWishlist = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await apiRequest('/auth/wishlist') as { data?: WishlistProduct[] };
            setProducts(data.data || []);
        } catch (err: unknown) {
            console.error('Failed to load wishlist:', err);
            setError(getErrorMessage(err, 'Could not load your wishlist. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    const removeFromWishlist = async (productId: string) => {
        if (removingIds.includes(productId)) return;
        setRemovingIds((prev) => [...prev, productId]);
        try {
            await apiRequest(`/auth/wishlist/${productId}`, { method: 'POST' });
            setProducts(prev => prev.filter(p => (p._id || p) !== productId));
            showToast('Removed from wishlist', 'success');
        } catch (err: unknown) {
            showToast(getErrorMessage(err, 'Failed to remove from wishlist'), 'error');
        } finally {
            setRemovingIds((prev) => prev.filter((id) => id !== productId));
        }
    };

    const handleAddToCart = async (p: WishlistProduct) => {
        if (addingIds.includes(p._id)) return;
        setAddingIds((prev) => [...prev, p._id]);
        try {
            await addToCart({
                id: p._id,
                slug: p.slug,
                name: p.name,
                price: p.prices?.['100g'] || 0,
                size: '100g',
                img: resolveProductImageUrl(p.images?.[0], '/images/darjeeling-tea.png'),
            });
            showToast(`${p.name} added to cart!`, 'success');
        } finally {
            setAddingIds((prev) => prev.filter((id) => id !== p._id));
        }
    };

    if (!isAuthenticated) {
        return (
            <Layout>
                <div className="page-hero">
                    <div className="container">
                        <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link> <span>/</span> <span>Wishlist</span></nav>
                        <h1>My Wishlist</h1>
                    </div>
                </div>
                <div className="container section">
                    <EmptyState icon="heart" iconSize="lg" title="Please sign in to view your wishlist" message="Save your favourite teas and find them here anytime." actionLabel="Sign In" onAction={openAuthModal} />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="page-hero">
                <div className="container">
                    <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link> <span>/</span> <span>Wishlist</span></nav>
                    <p className="overline">Saved Favourites</p>
                    <h1>My Wishlist</h1>
                    <p>Your hand-picked selection of teas you love.</p>
                </div>
            </div>
            <div className="container section">
                {loading ? (
                    <div className="wishlist-state">
                        <div className="wishlist-state__icon"><AppIcon name="leaf" size={32} aria-hidden /></div>
                        <p className="wishlist-state__text">Loading your wishlist...</p>
                    </div>
                ) : error ? (
                    <div className="wishlist-error" role="alert">
                        <div className="wishlist-error__icon"><AppIcon name="xCircle" size={30} aria-hidden /></div>
                        <p className="wishlist-error__text">{error}</p>
                        <button type="button" className="btn btn--primary btn--sm" onClick={loadWishlist}>Retry</button>
                    </div>
                ) : products.length === 0 ? (
                    <div className="wishlist-empty">
                        <div className="wishlist-empty__icon"><AppIcon name="heartOff" size={40} aria-hidden /></div>
                        <h2>Your wishlist is empty</h2>
                        <p className="wishlist-empty__text">Browse our collection and save the teas you love.</p>
                        <Link href="/shop" className="btn btn--primary wishlist-empty__cta">Shop Teas</Link>
                    </div>
                ) : (
                    <>
                        <p className="wishlist-count">{products.length} {products.length === 1 ? 'item' : 'items'} saved</p>
                        <div className="plp-products">
                            {products.map((p) => {
                                const price = p.prices?.['100g'] || 0;
                                const img = resolveProductImageUrl(p.images?.[0], '/images/darjeeling-tea.png');
                                const computedInStock = typeof p.inStock === 'boolean'
                                    ? p.inStock
                                    : Number(p.stock || 0) > 0;
                                const isRemoving = removingIds.includes(p._id);
                                const isAdding = addingIds.includes(p._id);
                                return (
                                    <div className="product-card" key={p._id}>
                                        {!computedInStock && <span className="product-card__badge product-card__badge--danger">Sold Out</span>}
                                        <Link href={`/product/${p.slug}`}>
                                            <div className="product-card__img">
                                                <Image src={img} alt={p.name} width={300} height={300} className="img-contain-full" />
                                            </div>
                                        </Link>
                                        <div className="product-card__body">
                                            <div className="product-card__type">{p.type}</div>
                                            <Link href={`/product/${p.slug}`} className="product-card__name">{p.name}</Link>
                                            <div className="product-card__note">{p.shortDescription || ''}</div>
                                            <div className="product-card__bottom">
                                                <div className="product-card__price">₹{price.toLocaleString()}</div>
                                                <div className="product-card__rating">{'★'.repeat(Math.round(p.rating || 5))} <span>({p.reviewCount || 0})</span></div>
                                            </div>
                                            <div className="wishlist-card__actions">
                                                <button
                                                    className="btn btn--primary btn--sm wishlist-card__add"
                                                    onClick={() => handleAddToCart(p)}
                                                    disabled={!computedInStock || isAdding}
                                                    aria-busy={isAdding}
                                                >
                                                    {computedInStock ? (isAdding ? 'Adding...' : 'Add to Cart') : 'Sold Out'}
                                                </button>
                                                <button
                                                    className="btn btn--ghost btn--sm wishlist-card__remove"
                                                    onClick={() => removeFromWishlist(p._id)}
                                                    disabled={isRemoving}
                                                    aria-busy={isRemoving}
                                                    title="Remove from wishlist"
                                                >
                                                    {isRemoving ? '...' : <AppIcon name="xCircle" size={14} aria-hidden />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
}
