'use client';

type ProductGridSkeletonProps = {
    variant?: 'grid' | 'pdp';
};

export default function ProductGridSkeleton({ variant = 'grid' }: ProductGridSkeletonProps) {
    if (variant === 'pdp') {
        return (
            <div className="container section pdp-skeleton">
                <div className="pdp-skeleton__media" />
                <div className="pdp-skeleton__lines">
                    <div className="pdp-skeleton__line pdp-skeleton__line--xs pdp-skeleton-w-30" />
                    <div className="pdp-skeleton__line pdp-skeleton__line--lg pdp-skeleton-w-80" />
                    <div className="pdp-skeleton__line pdp-skeleton__line--xs pdp-skeleton-w-40" />
                    <div className="pdp-skeleton__line pdp-skeleton__line--xl mt-md" />
                    <div className="pdp-skeleton__line pdp-skeleton__line--md mt-md" />
                </div>
            </div>
        );
    }

    return (
        <div className="product-grid">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="product-card skeleton-card">
                    <div className="skeleton-shimmer" />
                    <div className="skeleton-body">
                        <div className="skeleton-line skeleton-line--sm skeleton-w-40 skeleton-delay-1" />
                        <div className="skeleton-line skeleton-line--md skeleton-w-80 skeleton-delay-2" />
                        <div className="skeleton-line skeleton-line--sm skeleton-w-60 skeleton-delay-3" />
                    </div>
                </div>
            ))}
        </div>
    );
}
