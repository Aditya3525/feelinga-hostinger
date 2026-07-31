'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Layout from '../../../components/Layout';
import AppIcon from '../../../components/AppIcon';
import { useCart } from '../../../context/CartContext';
import { renderStars } from '../../../utils/renderStars';
import { apiRequest } from '../../../utils/api';
import { resolveProductImageUrl } from '../../../utils/image';

export interface ProductData {
    id: string;
    _id?: string;
    slug: string;
    name: string;
    type: string;
    description: string;
    shortDescription?: string;
    prices: {
        '50g'?: number | null;
        '100g': number;
        '200g'?: number | null;
        [key: string]: number | null | undefined;
    };
    sizes?: { weight: string; price: number }[];
    price: number;

    origin: string;
    caffeine: string;
    tastingNotes: string[];
    brewingInstructions: {
        temperature?: string | null;
        steepTime?: string | null;
        amount?: string | null;
        steps?: string[];
    };
    images: string[];
    rating: number;
    reviewCount: number;
    inStock: boolean;
    stock: number;
    isBestSeller?: boolean;
    isNewArrival?: boolean;
    tags?: string[];
}

// Fallback product details for static export & offline rendering
const FALLBACK_PRODUCTS: Record<string, ProductData> = {
    'darjeeling-first-flush': {
        id: '1',
        slug: 'darjeeling-first-flush',
        name: 'Darjeeling First Flush',
        type: 'Black Tea',
        shortDescription: 'Premium spring harvest with delicate muscatel character',
        description: 'The champagne of teas. Harvested in early spring from the high-altitude, misty tea gardens of Darjeeling. This light and floral black tea offers an exquisite muscatel character with hints of apricot, peach, and citrus.',
        prices: { '50g': 299, '100g': 499, '200g': 899 },
        price: 499,

        origin: 'Darjeeling, West Bengal, India',
        caffeine: 'Medium',
        tastingNotes: ['Muscatel', 'Floral', 'Apricot', 'Citrus'],
        brewingInstructions: {
            temperature: '85°C - 90°C',
            steepTime: '3 - 4 mins',
            amount: '2.5g (1 tsp) per 200ml water',
            steps: [
                'Heat fresh spring water to 85°C-90°C.',
                'Add 1 teaspoon (2.5g) of leaves per cup into your teapot.',
                'Pour hot water and steep gently for 3-4 minutes.',
                'Strain into your cup and enjoy pure without milk to savor the muscatel character.',
            ],
        },
        images: ['/images/products/darjeeling-ff.jpg', '/images/darjeeling-tea.png'],
        rating: 4.7,
        reviewCount: 24,
        inStock: true,
        stock: 50,
        isBestSeller: true,
        tags: ['Spring Harvest', 'Single Estate', 'Organic'],
    },
    'assam-golden-tippy': {
        id: '2',
        slug: 'assam-golden-tippy',
        name: 'Assam Golden Tippy',
        type: 'Black Tea',
        shortDescription: 'Rich malty breakfast tea with golden tips',
        description: 'Harvested from the lush Brahmaputra River valley in Assam. Rich, malty, and full-bodied with abundant golden tips. A classic Indian breakfast tea that pairs wonderfully with milk and spices.',
        prices: { '50g': 199, '100g': 349, '200g': 649 },
        price: 349,

        origin: 'Assam, India',
        caffeine: 'High',
        tastingNotes: ['Malty', 'Robust', 'Honey', 'Caramel'],
        brewingInstructions: {
            temperature: '95°C - 100°C',
            steepTime: '4 - 5 mins',
            amount: '3g per 200ml water',
            steps: [
                'Bring fresh water to a rolling boil (95°C-100°C).',
                'Add 3g of tea leaves per cup.',
                'Steep for 4-5 minutes for full body.',
                'Add milk and natural sweetener as desired.',
            ],
        },
        images: ['/images/product-1.jpg'],
        rating: 4.5,
        reviewCount: 18,
        inStock: true,
        stock: 75,
        isBestSeller: true,
        tags: ['Full Body', 'Breakfast Tea', 'Golden Tips'],
    },
    'nilgiri-frost-tea': {
        id: '3',
        slug: 'nilgiri-frost-tea',
        name: 'Nilgiri Frost Tea',
        type: 'Black Tea',
        shortDescription: 'Smooth South Indian tea with floral notes',
        description: 'Grown in the misty Blue Mountains of Nilgiri, South India. Plucked during winter frost, delivering a smooth, fragrant cup with natural sweet eucalyptus and wildflower notes.',
        prices: { '50g': 229, '100g': 399, '200g': 749 },
        price: 399,

        origin: 'Nilgiri, Tamil Nadu, India',
        caffeine: 'Medium',
        tastingNotes: ['Wildflower', 'Eucalyptus', 'Citrus', 'Sweet Grass'],
        brewingInstructions: {
            temperature: '90°C',
            steepTime: '3 mins',
            amount: '2.5g per 200ml water',
            steps: [
                'Heat water to 90°C.',
                'Add 2.5g tea leaves into infuser.',
                'Steep for 3 minutes.',
                'Serve warm or pour over ice for iced tea.',
            ],
        },
        images: ['/images/product-2.jpg'],
        rating: 4.3,
        reviewCount: 12,
        inStock: true,
        stock: 60,
        isNewArrival: true,
        tags: ['Frost Harvest', 'High Altitude', 'Aromatic'],
    },
    'masala-chai-classic': {
        id: '4',
        slug: 'masala-chai-classic',
        name: 'Masala Chai Classic',
        type: 'Masala Chai',
        shortDescription: 'Traditional spiced tea with aromatic Indian masalas',
        description: 'Our signature masala chai blend combining robust Assam CTC black tea with crushed green cardamom, Ceylon cinnamon, sun-dried ginger, cloves, and black pepper. The comforting embrace of traditional Indian tea.',
        prices: { '50g': 179, '100g': 299, '200g': 549 },
        price: 299,

        origin: 'Blended in India',
        caffeine: 'Medium',
        tastingNotes: ['Cardamom', 'Cinnamon', 'Spiced Ginger', 'Clove'],
        brewingInstructions: {
            temperature: '100°C (Boiling)',
            steepTime: '5 mins simmer',
            amount: '3g per cup',
            steps: [
                'Simmer equal parts water and milk in a saucepan.',
                'Add 3g tea blend and optional sugar.',
                'Bring to a boil for 3-5 minutes until rich and aromatic.',
                'Strain into cups and serve hot.',
            ],
        },
        images: ['/images/product-3.jpg'],
        rating: 4.8,
        reviewCount: 42,
        inStock: true,
        stock: 100,
        isBestSeller: true,
        tags: ['Signature Blend', 'Whole Spices', 'Artisan Chai'],
    },
    'jasmine-green-tea': {
        id: '5',
        slug: 'jasmine-green-tea',
        name: 'Jasmine Green Tea',
        type: 'Green Tea',
        shortDescription: 'Lightly scented with fragrant jasmine blossoms',
        description: 'Delicate green tea leaves scent-infused multiple times with freshly harvested night-blooming jasmine blossoms. Floral, smooth, refreshing, and rich in natural antioxidants.',
        prices: { '50g': 259, '100g': 449, '200g': 849 },
        price: 449,

        origin: 'Kangra Valley, Himachal Pradesh, India',
        caffeine: 'Low',
        tastingNotes: ['Jasmine Floral', 'Sweet Grass', 'Gentle Green'],
        brewingInstructions: {
            temperature: '80°C',
            steepTime: '2 - 3 mins',
            amount: '2g per 200ml water',
            steps: [
                'Heat water to 80°C (do not boil).',
                'Add 2g tea leaves.',
                'Steep gently for 2-3 minutes.',
                'Enjoy unflavored without milk.',
            ],
        },
        images: ['/images/product-4.jpg'],
        rating: 4.6,
        reviewCount: 15,
        inStock: true,
        stock: 40,
        isNewArrival: true,
        tags: ['Floral', 'Low Caffeine', 'Antioxidant Rich'],
    },
    'tulsi-ginger-herbal': {
        id: '6',
        slug: 'tulsi-ginger-herbal',
        name: 'Tulsi Ginger Herbal',
        type: 'Herbal Infusion',
        shortDescription: 'Caffeine-free wellness blend with tulsi and ginger',
        description: 'An Ayurvedic wellness herbal infusion combining three sacred varieties of Tulsi (Holy Basil) with spicy sun-dried ginger and lemon peel. Naturally caffeine-free and soothing for immunity.',
        prices: { '50g': 149, '100g': 249, '200g': 449 },
        price: 249,

        origin: 'Blended in India',
        caffeine: 'None',
        tastingNotes: ['Peppery Tulsi', 'Zesty Ginger', 'Lemongrass'],
        brewingInstructions: {
            temperature: '100°C',
            steepTime: '5 - 7 mins',
            amount: '2.5g per 200ml water',
            steps: [
                'Pour boiling water over 2.5g herbal blend.',
                'Cover and steep for 5-7 minutes.',
                'Add honey or lemon to taste if desired.',
            ],
        },
        images: ['/images/product-5.jpg'],
        rating: 4.4,
        reviewCount: 9,
        inStock: true,
        stock: 80,
        tags: ['Caffeine Free', 'Ayurvedic', 'Immunity Boost'],
    },
    'silver-needle-white': {
        id: '7',
        slug: 'silver-needle-white',
        name: 'Silver Needle White',
        type: 'White Tea',
        shortDescription: 'Rare hand-plucked white tea buds',
        description: 'Made exclusively from tender, undamaged spring tea buds. Unfermented and dried naturally under gentle sunlight. Exceptionally smooth with delicate notes of honeysuckle and sweet melon.',
        prices: { '50g': 999, '100g': 1899, '200g': 3499 },
        price: 1899,

        origin: 'Darjeeling, West Bengal, India',
        caffeine: 'Low',
        tastingNotes: ['Honeysuckle', 'Melon', 'Fresh Hay', 'Nectar'],
        brewingInstructions: {
            temperature: '75°C - 80°C',
            steepTime: '4 - 5 mins',
            amount: '3g per 200ml water',
            steps: [
                'Heat water to 75°C-80°C.',
                'Add 3g white tea buds.',
                'Steep for 4-5 minutes.',
                'Can be re-infused up to 3 times.',
            ],
        },
        images: ['/images/products/silver-needle.jpg'],
        rating: 4.9,
        reviewCount: 14,
        inStock: true,
        stock: 25,
        tags: ['Rare Harvest', 'Single Estate', 'Ultra Premium'],
    },
    'aged-puerh-reserve': {
        id: '8',
        slug: 'aged-puerh-reserve',
        name: 'Aged Pu-erh Reserve',
        type: 'Pu-erh Tea',
        shortDescription: 'Deep earthy aged tea cake with velvety finish',
        description: 'Naturally fermented aged tea cake. Exhibits deep woody, earthy aromas with subtle notes of dark cocoa and dried plum, finishing with a velvety texture.',
        prices: { '50g': 1299, '100g': 2499, '200g': 4599 },
        price: 2499,

        origin: 'Yunnan Reserve / Blended Master Estate',
        caffeine: 'Medium',
        tastingNotes: ['Woody Earth', 'Dark Cocoa', 'Dried Plum', 'Velvet'],
        brewingInstructions: {
            temperature: '95°C - 100°C',
            steepTime: '3 - 5 mins',
            amount: '4g per 200ml water',
            steps: [
                'Rinse tea leaves with boiling water for 5 seconds and discard rinse water.',
                'Add fresh boiling water and steep for 3-5 minutes.',
                'Rerinsing enhances deep earthy character.',
            ],
        },
        images: ['/images/products/oolong-beauty.jpg'],
        rating: 4.9,
        reviewCount: 8,
        inStock: true,
        stock: 15,
        tags: ['Aged Vintage', 'Rare Connoisseur', 'Fermented'],
    },
};

export default function ProductDetailClient({ slug }: { slug: string }) {
    const { addToCart } = useCart();

    const fallback = FALLBACK_PRODUCTS[slug] || {
        id: slug,
        slug,
        name: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        type: 'Artisan Tea',
        description: 'Premium hand-selected tea from our collection.',
        shortDescription: 'Artisan Indian tea blend',
        prices: { '100g': 499 },
        price: 499,

        origin: 'India',
        caffeine: 'Medium',
        tastingNotes: ['Smooth', 'Aromatic'],
        brewingInstructions: {
            temperature: '90°C',
            steepTime: '3-4 mins',
            amount: '2.5g per cup',
            steps: ['Heat fresh water to 90°C.', 'Add 2.5g leaves per cup.', 'Steep for 3-4 minutes and enjoy.'],
        },
        images: ['/images/products/darjeeling-ff.jpg'],
        rating: 4.8,
        reviewCount: 10,
        inStock: true,
        stock: 50,
    };

    const [product, setProduct] = useState<ProductData>(fallback);
    const [loading, setLoading] = useState(true);
    const [selectedSize, setSelectedSize] = useState<string>('100g');
    const [quantity, setQuantity] = useState<number>(1);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
    const [activeTab, setActiveTab] = useState<'description' | 'brewing' | 'notes'>('description');
    const [addedToast, setAddedToast] = useState(false);

    // Client hydration from API
    useEffect(() => {
        let isMounted = true;
        async function fetchProduct() {
            try {
                setLoading(true);
                const res = await apiRequest(`/products/${slug}`);
                if (res?.data && isMounted) {
                    const data = res.data;
                    setProduct({
                        id: data._id || data.id || slug,
                        _id: data._id || data.id,
                        slug: data.slug || slug,
                        name: data.name || fallback.name,
                        type: data.type || fallback.type,
                        description: data.description || fallback.description,
                        shortDescription: data.shortDescription || fallback.shortDescription,
                        prices: {
                            '50g': data.prices?.['50g'] ?? fallback.prices['50g'],
                            '100g': data.prices?.['100g'] ?? data.price ?? fallback.prices['100g'],
                            '200g': data.prices?.['200g'] ?? fallback.prices['200g'],
                        },
                        sizes: Array.isArray(data.sizes) ? data.sizes : undefined,
                        price: data.prices?.['100g'] ?? data.price ?? fallback.price,

                        origin: data.origin || fallback.origin,
                        caffeine: data.caffeine || fallback.caffeine,
                        tastingNotes: Array.isArray(data.tastingNotes) && data.tastingNotes.length ? data.tastingNotes : fallback.tastingNotes,
                        brewingInstructions: {
                            temperature: data.brewingInstructions?.temperature || fallback.brewingInstructions.temperature,
                            steepTime: data.brewingInstructions?.steepTime || fallback.brewingInstructions.steepTime,
                            amount: data.brewingInstructions?.amount || fallback.brewingInstructions.amount,
                            steps: Array.isArray(data.brewingInstructions?.steps) && data.brewingInstructions.steps.length
                                ? data.brewingInstructions.steps
                                : fallback.brewingInstructions.steps,
                        },
                        images: Array.isArray(data.images) && data.images.length ? data.images : fallback.images,
                        rating: Number(data.rating || fallback.rating),
                        reviewCount: Number(data.reviewCount || fallback.reviewCount),
                        inStock: typeof data.inStock === 'boolean' ? data.inStock : fallback.inStock,
                        stock: Number(data.stock ?? fallback.stock),
                        isBestSeller: Boolean(data.isBestSeller ?? fallback.isBestSeller),
                        isNewArrival: Boolean(data.isNewArrival ?? fallback.isNewArrival),
                        tags: Array.isArray(data.tags) ? data.tags : fallback.tags,
                    });
                }
            } catch (err) {
                console.warn('[PDP] Dynamic product hydration note:', err instanceof Error ? err.message : err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        fetchProduct();
        return () => { isMounted = false; };
    }, [slug]);

    // Available size options with valid non-null prices
    const sizeOptions = (product.sizes && product.sizes.length > 0)
        ? product.sizes.map((s: any) => ({ size: s.weight, label: s.weight, price: s.price }))
        : [
            { size: '50g', label: '50g Sampler', price: product.prices?.['50g'] },
            { size: '100g', label: '100g Standard', price: product.prices?.['100g'] },
            { size: '200g', label: '200g Value Pack', price: product.prices?.['200g'] },
        ].filter(opt => opt.price != null && Number(opt.price) > 0) as Array<{ size: string; label: string; price: number }>;

    // Update selectedSize if current is not in options
    useEffect(() => {
        if (sizeOptions.length > 0 && !sizeOptions.find(o => o.size === selectedSize)) {
            setSelectedSize(sizeOptions[0].size);
        }
    }, [sizeOptions, selectedSize]);

    const currentPrice = (sizeOptions.find(o => o.size === selectedSize)?.price ?? product.price) as number;

    const rawImageList = product.images.length > 0 ? product.images : fallback.images;
    const imageList = rawImageList.map(img => resolveProductImageUrl(img, '/images/products/darjeeling-ff.jpg'));
    const mainImage = imageList[selectedImageIndex] || imageList[0];

    const handleAddToCart = async () => {
        if (!product.inStock || product.stock <= 0) return;

        await addToCart({
            id: product.id || product._id || product.slug,
            slug: product.slug,
            name: product.name,
            price: currentPrice,
            size: selectedSize,
            img: mainImage,
            qty: quantity,
        });

        setAddedToast(true);
        setTimeout(() => setAddedToast(false), 3000);
    };

    return (
        <Layout>
            <div className="pdp-wrapper">
                <div className="container">
                    {/* Breadcrumbs */}
                    <nav className="pdp-breadcrumbs" aria-label="Breadcrumb">
                        <Link href="/">Home</Link>
                        <span className="pdp-breadcrumbs__sep">/</span>
                        <Link href="/shop">Shop</Link>
                        <span className="pdp-breadcrumbs__sep">/</span>
                        <span className="pdp-breadcrumbs__current">{product.name}</span>
                    </nav>

                    {/* Main Product Layout */}
                    <div className="pdp-grid">
                        {/* Gallery Column */}
                        <div className="pdp-gallery">
                            <div className="pdp-gallery__main">
                                {product.isBestSeller && <span className="pdp-badge pdp-badge--gold">Best Seller</span>}
                                {product.isNewArrival && <span className="pdp-badge pdp-badge--success">New Arrival</span>}
                                {!product.inStock && <span className="pdp-badge pdp-badge--danger">Sold Out</span>}
                                <Image
                                    src={mainImage}
                                    alt={product.name}
                                    width={600}
                                    height={600}
                                    className="pdp-gallery__img"
                                    priority
                                />
                            </div>

                            {imageList.length > 1 && (
                                <div className="pdp-gallery__thumbs">
                                    {imageList.map((img, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            className={`pdp-gallery__thumb ${selectedImageIndex === idx ? 'pdp-gallery__thumb--active' : ''}`}
                                            onClick={() => setSelectedImageIndex(idx)}
                                        >
                                            <Image src={img} alt={`${product.name} thumb ${idx + 1}`} width={80} height={80} />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Product Info Column */}
                        <div className="pdp-info">
                            <span className="pdp-info__type">{product.type}</span>
                            <h1 className="pdp-info__title">{product.name}</h1>

                            {/* Rating & Origin */}
                            <div className="pdp-info__meta">
                                <div className="pdp-rating">
                                    <span className="pdp-rating__stars">{renderStars(product.rating)}</span>
                                    <span className="pdp-rating__score">{product.rating.toFixed(1)}</span>
                                    <span className="pdp-rating__count">({product.reviewCount} reviews)</span>
                                </div>
                                {product.origin && (
                                    <div className="pdp-origin">
                                        <AppIcon name="mapPin" size={16} aria-hidden />
                                        <span>{product.origin}</span>
                                    </div>
                                )}
                            </div>

                            {/* Price Display */}
                            <div className="pdp-price">
                                <span className="pdp-price__amount">₹{currentPrice.toLocaleString()}</span>
                                <span className="pdp-price__unit">/ {selectedSize}</span>
                            </div>

                            {/* Short Description */}
                            {product.shortDescription && (
                                <p className="pdp-info__short-desc">{product.shortDescription}</p>
                            )}

                            {/* Size / Weight Selector */}
                            {sizeOptions.length > 0 && (
                                <div className="pdp-option-group">
                                    <label className="pdp-option-group__label">
                                        Select Size / Weight:
                                    </label>
                                    <div className="pdp-size-selector">
                                        {sizeOptions.map(opt => (
                                            <button
                                                key={opt.size}
                                                type="button"
                                                className={`pdp-size-btn ${selectedSize === opt.size ? 'pdp-size-btn--active' : ''}`}
                                                onClick={() => setSelectedSize(opt.size)}
                                            >
                                                <span className="pdp-size-btn__name">{opt.size}</span>
                                                <span className="pdp-size-btn__price">₹{opt.price.toLocaleString()}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Quantity & Add to Cart */}
                            <div className="pdp-actions">
                                <div className="pdp-qty-counter">
                                    <button
                                        type="button"
                                        className="pdp-qty-btn"
                                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                        disabled={quantity <= 1 || !product.inStock}
                                        aria-label="Decrease quantity"
                                    >
                                        -
                                    </button>
                                    <span className="pdp-qty-val">{quantity}</span>
                                    <button
                                        type="button"
                                        className="pdp-qty-btn"
                                        onClick={() => setQuantity(q => Math.min(product.stock || 99, q + 1))}
                                        disabled={!product.inStock || quantity >= product.stock}
                                        aria-label="Increase quantity"
                                    >
                                        +
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    className="btn btn--primary pdp-add-btn"
                                    onClick={handleAddToCart}
                                    disabled={!product.inStock}
                                >
                                    <AppIcon name="shoppingBag" size={20} aria-hidden />
                                    <span>{product.inStock ? 'Add to Cart' : 'Out of Stock'}</span>
                                </button>
                            </div>

                            {/* Stock Indicator */}
                            <div className="pdp-stock-status">
                                {product.inStock ? (
                                    <span className="pdp-stock-status__in">
                                        <span className="pdp-stock-dot pdp-stock-dot--in" />
                                        In Stock {product.stock > 0 && product.stock <= 20 ? `(Only ${product.stock} left)` : ''}
                                    </span>
                                ) : (
                                    <span className="pdp-stock-status__out">
                                        <span className="pdp-stock-dot pdp-stock-dot--out" />
                                        Currently Out of Stock
                                    </span>
                                )}
                            </div>

                            {/* Highlights Grid */}
                            <div className="pdp-highlights">
                                {product.caffeine && (
                                    <div className="pdp-highlight-card">
                                        <AppIcon name="zap" size={20} className="pdp-highlight-card__icon" aria-hidden />
                                        <div>
                                            <div className="pdp-highlight-card__title">Caffeine</div>
                                            <div className="pdp-highlight-card__val">{product.caffeine}</div>
                                        </div>
                                    </div>
                                )}

                                <div className="pdp-highlight-card">
                                    <AppIcon name="truck" size={20} className="pdp-highlight-card__icon" aria-hidden />
                                    <div>
                                        <div className="pdp-highlight-card__title">Free Shipping</div>
                                        <div className="pdp-highlight-card__val">On orders over ₹999</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs / Bottom Details */}
                    <div className="pdp-details-tabs">
                        <div className="pdp-tab-headers" role="tablist">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeTab === 'description'}
                                className={`pdp-tab-btn ${activeTab === 'description' ? 'pdp-tab-btn--active' : ''}`}
                                onClick={() => setActiveTab('description')}
                            >
                                Description
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeTab === 'brewing'}
                                className={`pdp-tab-btn ${activeTab === 'brewing' ? 'pdp-tab-btn--active' : ''}`}
                                onClick={() => setActiveTab('brewing')}
                            >
                                Brewing Instructions
                            </button>
                            {product.tastingNotes && product.tastingNotes.length > 0 && (
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === 'notes'}
                                    className={`pdp-tab-btn ${activeTab === 'notes' ? 'pdp-tab-btn--active' : ''}`}
                                    onClick={() => setActiveTab('notes')}
                                >
                                    Tasting Notes & Profile
                                </button>
                            )}
                        </div>

                        <div className="pdp-tab-content">
                            {activeTab === 'description' && (
                                <div className="pdp-tab-panel">
                                    <h3 className="pdp-tab-panel__title">About {product.name}</h3>
                                    <p className="pdp-tab-panel__text">{product.description}</p>

                                    {product.tags && product.tags.length > 0 && (
                                        <div className="pdp-tags">
                                            <span className="pdp-tags__label">Tags:</span>
                                            {product.tags.map(tag => (
                                                <span key={tag} className="pdp-chip">{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'brewing' && (
                                <div className="pdp-tab-panel">
                                    <h3 className="pdp-tab-panel__title">How to Brew the Perfect Cup</h3>

                                    <div className="pdp-brewing-specs">
                                        {product.brewingInstructions.temperature && (
                                            <div className="pdp-brewing-spec">
                                                <AppIcon name="thermometer" size={24} aria-hidden />
                                                <span className="pdp-brewing-spec__label">Temperature</span>
                                                <span className="pdp-brewing-spec__val">{product.brewingInstructions.temperature}</span>
                                            </div>
                                        )}
                                        {product.brewingInstructions.steepTime && (
                                            <div className="pdp-brewing-spec">
                                                <AppIcon name="clock" size={24} aria-hidden />
                                                <span className="pdp-brewing-spec__label">Steep Time</span>
                                                <span className="pdp-brewing-spec__val">{product.brewingInstructions.steepTime}</span>
                                            </div>
                                        )}
                                        {product.brewingInstructions.amount && (
                                            <div className="pdp-brewing-spec">
                                                <AppIcon name="coffee" size={24} aria-hidden />
                                                <span className="pdp-brewing-spec__label">Quantity</span>
                                                <span className="pdp-brewing-spec__val">{product.brewingInstructions.amount}</span>
                                            </div>
                                        )}
                                    </div>

                                    {product.brewingInstructions.steps && product.brewingInstructions.steps.length > 0 && (
                                        <ol className="pdp-brewing-steps">
                                            {product.brewingInstructions.steps.map((step, idx) => (
                                                <li key={idx} className="pdp-brewing-step">
                                                    <span className="pdp-brewing-step__num">{idx + 1}</span>
                                                    <span className="pdp-brewing-step__text">{step}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                </div>
                            )}

                            {activeTab === 'notes' && (
                                <div className="pdp-tab-panel">
                                    <h3 className="pdp-tab-panel__title">Flavor & Character Profile</h3>
                                    <div className="pdp-notes-grid">
                                        {product.tastingNotes.map(note => (
                                            <div key={note} className="pdp-note-card">
                                                <AppIcon name="award" size={20} aria-hidden />
                                                <span>{note}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Scoped CSS Styles for PDP Component */}
            <style jsx>{`
                .pdp-wrapper {
                    padding: var(--space-xl) 0 var(--space-4xl);
                    background-color: var(--color-bg);
                    min-height: 80vh;
                }
                .pdp-breadcrumbs {
                    display: flex;
                    align-items: center;
                    gap: var(--space-xs);
                    font-size: var(--text-sm);
                    color: var(--color-text-muted);
                    margin-bottom: var(--space-lg);
                }
                .pdp-breadcrumbs a {
                    color: var(--color-text-light);
                    text-decoration: none;
                    transition: color 0.2s ease;
                }
                .pdp-breadcrumbs a:hover {
                    color: var(--color-accent);
                }
                .pdp-breadcrumbs__sep {
                    color: var(--color-border);
                }
                .pdp-breadcrumbs__current {
                    color: var(--color-text);
                    font-weight: 500;
                }
                .pdp-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-3xl);
                    align-items: start;
                    margin-bottom: var(--space-3xl);
                }
                @media (max-width: 900px) {
                    .pdp-grid {
                        grid-template-columns: 1fr;
                        gap: var(--space-xl);
                    }
                }
                .pdp-gallery {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-md);
                }
                .pdp-gallery__main {
                    position: relative;
                    background-color: var(--color-surface);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-xl);
                    padding: var(--space-lg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    box-shadow: var(--shadow-sm);
                }
                .pdp-gallery__img {
                    width: 100%;
                    height: auto;
                    max-height: 480px;
                    object-fit: contain;
                }
                .pdp-badge {
                    position: absolute;
                    top: var(--space-md);
                    left: var(--space-md);
                    padding: 4px 12px;
                    border-radius: var(--radius-md);
                    font-size: var(--text-xs);
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: white;
                    z-index: 2;
                }
                .pdp-badge--gold { background-color: var(--color-gold); color: #1a1816; }
                .pdp-badge--success { background-color: var(--color-success); }
                .pdp-badge--danger { background-color: var(--color-error); }
                .pdp-gallery__thumbs {
                    display: flex;
                    gap: var(--space-sm);
                }
                .pdp-gallery__thumb {
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    padding: 4px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .pdp-gallery__thumb--active {
                    border-color: var(--color-accent);
                    box-shadow: 0 0 0 2px var(--color-accent-light);
                }
                .pdp-info {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-md);
                }
                .pdp-info__type {
                    font-size: var(--text-xs);
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: var(--color-accent);
                }
                .pdp-info__title {
                    font-family: var(--font-serif);
                    font-size: 2.25rem;
                    color: var(--color-text);
                    margin: 0;
                    line-height: 1.2;
                }
                .pdp-info__meta {
                    display: flex;
                    align-items: center;
                    gap: var(--space-lg);
                    font-size: var(--text-sm);
                    color: var(--color-text-muted);
                }
                .pdp-rating {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .pdp-rating__stars {
                    color: var(--color-gold);
                }
                .pdp-rating__score {
                    font-weight: 600;
                    color: var(--color-text);
                }
                .pdp-origin {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .pdp-price {
                    display: flex;
                    align-items: baseline;
                    gap: var(--space-xs);
                    padding-bottom: var(--space-sm);
                    border-bottom: 1px dashed var(--color-border);
                }
                .pdp-price__amount {
                    font-size: 2rem;
                    font-weight: 700;
                    color: var(--color-text);
                }
                .pdp-price__unit {
                    font-size: var(--text-sm);
                    color: var(--color-text-muted);
                }
                .pdp-info__short-desc {
                    font-size: var(--text-base);
                    color: var(--color-text-light);
                    line-height: 1.6;
                    margin: 0;
                }
                .pdp-option-group {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-xs);
                }
                .pdp-option-group__label {
                    font-size: var(--text-xs);
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--color-text-muted);
                }
                .pdp-size-selector {
                    display: flex;
                    gap: var(--space-sm);
                    flex-wrap: wrap;
                }
                .pdp-size-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 8px 16px;
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    background: var(--color-surface);
                    color: var(--color-text);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    min-width: 100px;
                }
                .pdp-size-btn:hover {
                    border-color: var(--color-accent);
                }
                .pdp-size-btn--active {
                    border-color: var(--color-accent);
                    background-color: var(--color-accent-light);
                }
                .pdp-size-btn__name {
                    font-weight: 600;
                    font-size: var(--text-sm);
                }
                .pdp-size-btn__price {
                    font-size: var(--text-xs);
                    color: var(--color-text-muted);
                }
                .pdp-actions {
                    display: flex;
                    gap: var(--space-md);
                    margin-top: var(--space-sm);
                }
                .pdp-qty-counter {
                    display: flex;
                    align-items: center;
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    background: var(--color-surface);
                }
                .pdp-qty-btn {
                    padding: 8px 14px;
                    border: none;
                    background: transparent;
                    font-size: var(--text-lg);
                    font-weight: 600;
                    color: var(--color-text);
                    cursor: pointer;
                }
                .pdp-qty-btn:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }
                .pdp-qty-val {
                    padding: 0 12px;
                    font-size: var(--text-base);
                    font-weight: 600;
                    min-width: 32px;
                    text-align: center;
                }
                .pdp-add-btn {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: var(--space-sm);
                    font-size: var(--text-base);
                }
                .pdp-stock-status {
                    font-size: var(--text-sm);
                }
                .pdp-stock-status__in {
                    color: var(--color-success);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .pdp-stock-status__out {
                    color: var(--color-error);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .pdp-stock-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                }
                .pdp-stock-dot--in { background-color: var(--color-success); }
                .pdp-stock-dot--out { background-color: var(--color-error); }
                .pdp-highlights {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                    gap: var(--space-sm);
                    margin-top: var(--space-md);
                }
                .pdp-highlight-card {
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                    padding: 10px 14px;
                    background-color: var(--color-surface);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                }
                .pdp-highlight-card__title {
                    font-size: var(--text-xs);
                    color: var(--color-text-muted);
                }
                .pdp-highlight-card__val {
                    font-size: var(--text-xs);
                    font-weight: 600;
                    color: var(--color-text);
                    text-transform: capitalize;
                }
                .pdp-details-tabs {
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-xl);
                    overflow: hidden;
                    box-shadow: var(--shadow-sm);
                }
                .pdp-tab-headers {
                    display: flex;
                    border-bottom: 1px solid var(--color-border);
                    background-color: var(--color-bg-alt);
                }
                .pdp-tab-btn {
                    padding: var(--space-md) var(--space-lg);
                    border: none;
                    background: transparent;
                    font-size: var(--text-sm);
                    font-weight: 600;
                    color: var(--color-text-muted);
                    cursor: pointer;
                    border-bottom: 3px solid transparent;
                    transition: all 0.2s ease;
                }
                .pdp-tab-btn:hover {
                    color: var(--color-text);
                }
                .pdp-tab-btn--active {
                    color: var(--color-accent);
                    border-bottom-color: var(--color-accent);
                    background-color: var(--color-surface);
                }
                .pdp-tab-content {
                    padding: var(--space-xl);
                }
                .pdp-tab-panel__title {
                    font-family: var(--font-serif);
                    font-size: 1.5rem;
                    color: var(--color-text);
                    margin-bottom: var(--space-md);
                }
                .pdp-tab-panel__text {
                    font-size: var(--text-base);
                    color: var(--color-text-light);
                    line-height: 1.7;
                    margin-bottom: var(--space-lg);
                }
                .pdp-tags {
                    display: flex;
                    align-items: center;
                    gap: var(--space-xs);
                    flex-wrap: wrap;
                }
                .pdp-tags__label {
                    font-size: var(--text-xs);
                    font-weight: 600;
                    color: var(--color-text-muted);
                }
                .pdp-chip {
                    padding: 4px 10px;
                    border-radius: var(--radius-sm);
                    background-color: var(--color-bg-alt);
                    border: 1px solid var(--color-border);
                    font-size: var(--text-xs);
                    color: var(--color-text-light);
                }
                .pdp-brewing-specs {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                    gap: var(--space-md);
                    margin-bottom: var(--space-xl);
                }
                .pdp-brewing-spec {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: var(--space-md);
                    background: var(--color-bg-alt);
                    border-radius: var(--radius-lg);
                    text-align: center;
                    gap: 4px;
                }
                .pdp-brewing-spec__label {
                    font-size: var(--text-xs);
                    color: var(--color-text-muted);
                }
                .pdp-brewing-spec__val {
                    font-size: var(--text-sm);
                    font-weight: 600;
                    color: var(--color-text);
                }
                .pdp-brewing-steps {
                    padding: 0;
                    list-style: none;
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-md);
                }
                .pdp-brewing-step {
                    display: flex;
                    align-items: flex-start;
                    gap: var(--space-md);
                }
                .pdp-brewing-step__num {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background-color: var(--color-accent);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: var(--text-xs);
                    font-weight: 700;
                    flex-shrink: 0;
                }
                .pdp-brewing-step__text {
                    font-size: var(--text-base);
                    color: var(--color-text-light);
                    padding-top: 2px;
                }
                .pdp-notes-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                    gap: var(--space-md);
                }
                .pdp-note-card {
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                    padding: var(--space-md);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    background-color: var(--color-bg-alt);
                    font-weight: 500;
                    color: var(--color-text);
                }
            `}</style>
        </Layout>
    );
}
