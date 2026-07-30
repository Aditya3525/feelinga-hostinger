'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

type ProductCardProps = {
    product: any;
    badge?: string | null;
    badgeClass?: string;
    renderStars: (count: number) => string;
    onAdd?: (product: any) => void;
    showAddButton?: boolean;
    /** Override the product-page href (defaults to /product/:slug) */
    linkHref?: string;
    /** Custom footer content rendered instead of the Add-to-Cart button */
    footer?: React.ReactNode;
};

type CardBadge = {
    label: string;
    className?: string;
};

function formatCaffeine(caffeine?: string) {
    if (!caffeine) return null;
    const normalized = caffeine.toLowerCase();
    if (normalized === 'none') return 'Caffeine Free';
    return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)} Caffeine`;
}

export default function ProductCard({
    product,
    badge,
    badgeClass,
    renderStars,
    onAdd,
    showAddButton = true,
    linkHref,
    footer,
}: ProductCardProps) {
    const href = linkHref ?? `/product/${product.slug}`;
    const cardBadges: CardBadge[] = Array.isArray(product.badges) && product.badges.length > 0
        ? product.badges
        : (badge ? [{ label: badge, className: badgeClass }] : []);
    const primaryPrice = Number(product.price ?? 0);
    const sizePrices: Array<{ size: string; value: number }> = Array.isArray(product.sizePrices)
        ? product.sizePrices
        : [];
    const secondarySizes = sizePrices.filter((entry) => entry.size !== '100g').slice(0, 2);
    const originLabel = product.originLabel || product.origin;
    const tastingNotes = Array.isArray(product.tastingNotes) ? product.tastingNotes.slice(0, 2) : [];
    const stock = Number(product.stock || 0);
    const showStockCount = product.inStock && stock > 0;
    const caffeineLabel = formatCaffeine(product.caffeine);

    return (
        <div className="product-card">
            {cardBadges.length > 0 && (
                <div className="product-card__badges">
                    {cardBadges.map((entry) => (
                        <span key={`${product.id}-${entry.label}`} className={`product-card__badge ${entry.className || ''}`}>
                            {entry.label}
                        </span>
                    ))}
                </div>
            )}
            <Link href={href}>
                <div className="product-card__img">
                    <Image
                        src={product.img}
                        alt={`${product.name} tea`}
                        width={300}
                        height={300}
                        className="img-contain-full"
                    />
                </div>
            </Link>
            <div className="product-card__body">
                <div className="product-card__type">{product.typeName || product.type}</div>
                <Link href={href} className="product-card__name">{product.name}</Link>
                <div className="product-card__note">{product.note}</div>
                <div className="product-card__meta">
                    {originLabel && <span>{originLabel}</span>}
                    {caffeineLabel && <span>{caffeineLabel}</span>}
                </div>
                {tastingNotes.length > 0 && (
                    <div className="product-card__notes">
                        {tastingNotes.map((note: string) => (
                            <span key={`${product.id}-${note}`} className="product-card__chip">
                                {note}
                            </span>
                        ))}
                    </div>
                )}
                <div className="product-card__bottom">
                    <div>
                        <div className="product-card__price">₹{primaryPrice.toLocaleString()}</div>
                        {secondarySizes.length > 0 && (
                            <div className="product-card__size-prices">
                                {secondarySizes.map((entry) => `${entry.size}: ₹${entry.value.toLocaleString()}`).join(' · ')}
                            </div>
                        )}
                    </div>
                    {product.stars != null && (
                        <div className="product-card__rating">{renderStars(product.stars)} <span>({product.reviews})</span></div>
                    )}
                </div>
                <div className="product-card__stock">
                    {product.inStock ? (showStockCount ? `${stock} in stock` : 'In stock') : 'Out of stock'}
                </div>
                {footer ?? (showAddButton && (
                    <button
                        className="btn btn--primary btn--sm btn-block mt-12"
                        onClick={() => onAdd?.(product)}
                        disabled={!product.inStock}
                    >
                        {product.inStock ? 'Add to Cart' : 'Sold Out'}
                    </button>
                ))}
            </div>
        </div>
    );
}
