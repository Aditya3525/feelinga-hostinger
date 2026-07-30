'use client';
import Layout from '../../components/Layout';
import Link from 'next/link';
import Image from 'next/image';
import AppIcon from '../../components/AppIcon';

export default function Learn() {
    return (
        <Layout>
            <div className="page-hero">
                <div className="container">
                    <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link> <span>/</span> <span>Learn</span></nav>
                    <p className="overline">Tea Education</p>
                    <h1>Learn the Art of Tea</h1>
                    <p>From brewing basics to tea philosophy — your journey to tea mastery starts here.</p>
                    <div className="learn-jump-nav" role="navigation" aria-label="Jump to learn sections">
                        <a href="#learn-brewing" className="btn btn--ghost btn--sm">Brewing Guide</a>
                        <a href="#learn-types" className="btn btn--ghost btn--sm">Tea Types</a>
                        <a href="#learn-wellness" className="btn btn--ghost btn--sm">Wellness</a>
                    </div>
                </div>
            </div>

            {/* Brewing Guide */}
            <section id="learn-brewing" className="section">
                <div className="container">
                    <div className="section-header fade-in">
                        <p className="overline">Fundamentals</p>
                        <h2>Brewing Guide</h2>
                    </div>
                    <div className="guide-grid fade-in">
                        {[
                            { type: 'Green Tea', temp: '75–80°C', time: '2–3 min', amount: '2g / 200ml', tip: 'Use cooled water to avoid bitterness. Swirl gently.' },
                            { type: 'Black Tea', temp: '90–95°C', time: '3–5 min', amount: '2.5g / 200ml', tip: 'Full boiling water brings out the malty richness.' },
                            { type: 'White Tea', temp: '70–80°C', time: '4–5 min', amount: '2g / 200ml', tip: 'Low temperature preserves the delicate sweetness.' },
                            { type: 'Oolong', temp: '85–90°C', time: '3–4 min', amount: '3g / 200ml', tip: 'Multiple infusions reveal different flavor layers.' },
                            { type: 'Herbal', temp: '100°C', time: '5–7 min', amount: '2g / 200ml', tip: 'Longer steeping for stronger flavour. Cover while brewing.' },
                            { type: 'Masala Chai', temp: 'Boil', time: '5–8 min', amount: '3g / 200ml', tip: 'Simmer with milk and spices for authentic flavour.' },
                        ].map((t, i) => (
                            <div className="guide-card guide-card--static" key={i}>
                                <h4>{t.type}</h4>
                                <div className="learn-brew-grid">
                                    <div><strong className="learn-brew-grid__icon"><AppIcon name="activity" size={14} aria-hidden /></strong><br />{t.temp}</div>
                                    <div><strong className="learn-brew-grid__icon"><AppIcon name="timer" size={14} aria-hidden /></strong><br />{t.time}</div>
                                    <div><strong className="learn-brew-grid__icon"><AppIcon name="scale" size={14} aria-hidden /></strong><br />{t.amount}</div>
                                </div>
                                <p className="learn-brew-tip"><AppIcon name="sparkles" size={13} aria-hidden /> {t.tip}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Tea Types */}
            <section id="learn-types" className="section section--alt">
                <div className="container">
                    <div className="section-header fade-in">
                        <p className="overline">Know Your Tea</p>
                        <h2>Tea Types Explained</h2>
                    </div>
                    <div className="curated-grid fade-in">
                        {[
                            { name: 'Green Tea', desc: 'Unoxidized leaves that retain their natural color and fresh, grassy flavor. Rich in antioxidants (EGCG), green tea supports metabolism, focus, and skin health.', img: '/images/green-tea.png' },
                            { name: 'Black Tea', desc: 'Fully oxidized for a bold, robust flavor. India\'s most popular tea — from brisk Assam to the delicate Darjeeling. Pairs wonderfully with milk.', img: '/images/darjeeling-tea.png' },
                            { name: 'White Tea', desc: 'The least processed tea, made from young buds. Subtle, sweet, and incredibly smooth. Highest in antioxidants, lowest in caffeine.', img: '/images/white-tea.png' },
                        ].map((t, i) => (
                            <div className="curated-card" key={i}>
                                <div className="curated-card__img"><Image src={t.img} alt={t.name} width={400} height={300} className="img-cover-rounded-md" /></div>
                                <div className="curated-card__body">
                                    <h4>{t.name}</h4>
                                    <p>{t.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Wellness */}
            <section id="learn-wellness" className="section">
                <div className="container">
                    <div className="section-header fade-in">
                        <p className="overline">Wellness</p>
                        <h2>Tea & Your Health</h2>
                    </div>
                    <div className="mood-grid fade-in">
                        {[
                            { icon: 'brain', title: 'Mental Clarity', desc: 'L-theanine in green tea promotes calm focus without the jitters of coffee.' },
                            { icon: 'activity', title: 'Immunity', desc: 'Antioxidant-rich teas like white and green boost your immune system naturally.' },
                            { icon: 'gift', title: 'Skin Health', desc: 'Herbal infusions with chamomile and turmeric reduce inflammation and promote a natural glow.' },
                            { icon: 'heart', title: 'Heart Health', desc: 'Regular tea consumption is linked to lower cholesterol and improved cardiovascular health.' },
                            { icon: 'leaf', title: 'Digestion', desc: 'Peppermint, ginger, and fennel teas soothe the stomach and aid digestion after meals.' },
                        ].map((w, i) => (
                            <div className="mood-card mood-card--static" key={i}>
                                <div className="mood-card__icon"><AppIcon name={w.icon} size={24} aria-hidden /></div>
                                <h4>{w.title}</h4>
                                <p>{w.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="section section--alt">
                <div className="container text-center fade-in">
                    <h2>Ready to start your tea journey?</h2>
                    <p className="learn-cta-copy">Explore our collection and find the perfect blend for your lifestyle.</p>
                    <Link href="/shop" className="btn btn--primary">Shop All Teas</Link>
                </div>
            </section>
        </Layout>
    );
}



