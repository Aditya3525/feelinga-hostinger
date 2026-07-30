'use client';
import Layout from '../../components/Layout';
import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import AppIcon from '../../components/AppIcon';
import ProductCard from '../../components/ProductCard';
import SectionHeader from '../../components/SectionHeader';
import { useToast } from '../../components/Toast';

type GiftOccasion = 'all' | 'birthdays' | 'weddings' | 'corporate' | 'festivals' | 'thank-you';

type GiftSet = {
    id: string;
    name: string;
    type: string;
    note: string;
    price: number;
    img: string;
    stars: number;
    reviews: number;
    occasions: GiftOccasion[];
};

const giftSets: GiftSet[] = [
    { id: 'spring-festival', name: 'Spring Festival Tea Box', type: 'Gift Collection', note: '5 curated teas in a premium gift box', price: 1499, img: '/images/gift-box.png', stars: 5, reviews: 45, occasions: ['festivals', 'birthdays', 'thank-you'] },
    { id: 'wellness-ritual', name: 'Wellness Ritual Box', type: 'Gift Collection', note: '3 wellness blends with bamboo infuser', price: 999, img: '/images/gift-box.png', stars: 5, reviews: 67, occasions: ['birthdays', 'thank-you'] },
    { id: 'connoisseur', name: "Connoisseur's Collection", type: 'Luxury Hamper', note: '8 rare teas with teaware in wooden chest', price: 3999, img: '/images/gift-box.png', stars: 5, reviews: 28, occasions: ['corporate', 'weddings', 'festivals'] },
    { id: 'tea-honey', name: 'Tea & Honey Pairing Set', type: 'Gift Collection', note: '2 teas paired with artisanal honey', price: 799, img: '/images/herbal-tea.png', stars: 4, reviews: 34, occasions: ['thank-you', 'birthdays', 'weddings'] },
];

import { renderStars } from '../../utils/renderStars';

export default function Gifting() {
    const { showToast } = useToast();
    const [occasion, setOccasion] = useState<GiftOccasion>('all');

    const filteredGiftSets = useMemo(() => {
        if (occasion === 'all') return giftSets;
        return giftSets.filter((set) => set.occasions.includes(occasion));
    }, [occasion]);

    const occasionFilters: Array<{ key: GiftOccasion; label: string }> = [
        { key: 'all', label: 'All' },
        { key: 'birthdays', label: 'Birthdays' },
        { key: 'weddings', label: 'Weddings' },
        { key: 'corporate', label: 'Corporate' },
        { key: 'festivals', label: 'Festivals' },
        { key: 'thank-you', label: 'Thank You' },
    ];

    return (
        <Layout>
            <div className="page-hero">
                <div className="container">
                    <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link> <span>/</span> <span>Gifting</span></nav>
                    <p className="overline">The Perfect Present</p>
                    <h1>Tea Gifting</h1>
                    <p>Beautifully curated tea gift sets for every occasion — wrapped with love, steeped with care.</p>
                </div>
            </div>

            {/* Gift Sets */}
            <section className="section">
                <div className="container">
                    <SectionHeader overline="Gift Collections" title="Curated Gift Sets" className="fade-in" />
                    <div className="gifting-filter-bar" role="toolbar" aria-label="Filter gift sets by occasion">
                        {occasionFilters.map((filter) => (
                            <button
                                key={filter.key}
                                type="button"
                                className={`gifting-filter-chip ${occasion === filter.key ? 'active' : ''}`}
                                onClick={() => setOccasion(filter.key)}
                                aria-pressed={occasion === filter.key}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                    <p className="gifting-filter-meta" aria-live="polite">Showing {filteredGiftSets.length} gift set{filteredGiftSets.length === 1 ? '' : 's'}</p>
                    <div className="product-grid fade-in">
                        {filteredGiftSets.map((g) => (
                            <ProductCard
                                key={g.id}
                                product={g}
                                badge="Gift Set"
                                badgeClass="product-card__badge--success"
                                renderStars={renderStars}
                                linkHref="/gifting"
                                footer={
                                    <Link
                                        href={`/contact?subject=${encodeURIComponent('Gifting Enquiry')}&giftSet=${encodeURIComponent(g.name)}`}
                                        className="btn btn--primary btn--sm btn-block mt-12"
                                        onClick={() => showToast('Contact us to order this gift set!', 'info')}
                                    >
                                        Enquire Now
                                    </Link>
                                }
                            />
                        ))}
                    </div>
                    {filteredGiftSets.length === 0 && <p className="gifting-filter-empty">No gift sets found for this occasion yet.</p>}
                </div>
            </section>

            {/* Corporate Gifting */}
            <section className="section section--alt">
                <div className="container">
                    <div className="story-grid fade-in">
                        <div className="story__content">
                            <p className="overline">For Businesses</p>
                            <h2>Corporate Gifting</h2>
                            <p>Impress clients, celebrate milestones, and reward your team with our bespoke corporate gifting program. Custom branding, personalized messages, and premium packaging available for orders of 25+ boxes.</p>
                            <ul className="gifting-benefits">
                                <li><AppIcon name="checkCircle" size={14} aria-hidden />Custom branding & packaging</li>
                                <li><AppIcon name="checkCircle" size={14} aria-hidden />Personalized greeting cards</li>
                                <li><AppIcon name="checkCircle" size={14} aria-hidden />Bulk pricing (25+ boxes)</li>
                                <li><AppIcon name="checkCircle" size={14} aria-hidden />Pan-India delivery</li>
                                <li><AppIcon name="checkCircle" size={14} aria-hidden />Dedicated account manager</li>
                            </ul>
                            <div className="gifting-benefits__cta">
                                <Link href="/contact?subject=Corporate%20Gifting%20Quote" className="btn btn--primary">Get a Quote</Link>
                            </div>
                        </div>
                        <div className="story__visual">
                            <Image src="/images/gift-box.png" alt="Corporate tea gift boxes" width={500} height={400} className="gifting-benefits__image" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Occasions */}
            <section className="section">
                <div className="container">
                    <div className="section-header fade-in">
                        <p className="overline">Perfect For</p>
                        <h2>Every Occasion</h2>
                    </div>
                    <div className="mood-grid fade-in">
                        {[
                            { icon: 'gift', title: 'Birthdays', desc: 'A thoughtful, healthy gift they\'ll actually love.' },
                            { icon: 'gift', title: 'Weddings', desc: 'Elegant favors and hampers for the special day.' },
                            { icon: 'briefcase', title: 'Corporate', desc: 'Premium gifts that leave a lasting impression.' },
                            { icon: 'gift', title: 'Festivals', desc: 'Diwali, Christmas, Eid — tea for every celebration.' },
                            { icon: 'gift', title: 'Thank You', desc: 'Show gratitude with the gift of good tea.' },
                        ].map((o, i) => (
                            <div className="mood-card mood-card--static" key={i}>
                                <div className="mood-card__icon"><AppIcon name={o.icon} size={24} aria-hidden /></div>
                                <h4>{o.title}</h4>
                                <p>{o.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </Layout>
    );
}



