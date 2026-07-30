'use client';
import Layout from '../../components/Layout';
import Link from 'next/link';
import Image from 'next/image';
import AppIcon from '../../components/AppIcon';
import SectionHeader from '../../components/SectionHeader';

export default function About() {
    return (
        <Layout>
            {/* Hero */}
            <section className="about-hero" aria-label="About hero">
                <div className="container">
                    <p className="overline">Our Story</p>
                    <h1>Born from a Love of Ritual</h1>
                    <p className="subtitle about-hero__subtitle">We believe that a cup of tea is more than a beverage - it&apos;s a moment of mindfulness, a pause, and a quiet celebration of the senses.</p>
                    <nav className="about-hero__quick-nav" aria-label="About page sections">
                        <a href="#founder-story">Founder</a>
                        <a href="#owner-details">Owner Details</a>
                        <a href="#values">Values</a>
                        <a href="#journey">Journey</a>
                        <a href="#careers">Careers</a>
                    </nav>
                </div>
            </section>

            {/* Founder Story */}
            <section id="founder-story" className="section" aria-label="Founder story">
                <div className="container">
                    <div className="about-section fade-in">
                        <div>
                            <p className="overline">The Beginning</p>
                            <h2>A Founder&apos;s Journey</h2>
                            <p>Feelinga was born when our founder and managing director, Kailas Ishwar Mane, decided to share his passion for premium Indian teas with the world. A B.Sc. Agriculture graduate from VNMKV, Parbhani, Kailas brings a deep understanding of cultivation, soil science, and sustainable farming to every cup of tea we offer.</p>
                            <p>Raised in Pandharpur, Maharashtra - the spiritual heartland of the Deccan - Kailas developed a deep appreciation for authentic flavors and the simple joy that a perfect cup of tea can bring. In January 2025 he turned this passion into a venture, incorporating <strong>Vithubadayaji Industries Private Limited</strong> and launching the Feelinga brand to bring India&apos;s finest teas to every doorstep.</p>
                            <p>Standing alongside Kailas is his co-director <strong>Jagabai Ishwar Mane</strong>, whose unwavering support and shared belief in the brand has been a cornerstone of Feelinga&apos;s journey from day one.</p>
                            <p>&quot;I wanted people to experience tea the way it&apos;s meant to be - not just a drink, but a daily dose of happiness.&quot; - <em>Kailas Ishwar Mane, Founder and Managing Director</em></p>
                        </div>
                        <div className="about-visual about-visual--centered">
                            <Image src="/images/logo.png" alt="Feelinga logo" width={320} height={320} className="about-founder-image" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Owner Details */}
            <section id="owner-details" className="section section--alt" aria-label="Owner and company details">
                <div className="container">
                    <div className="about-section fade-in">
                        <div>
                            <p className="overline">Business Identity</p>
                            <h2>Owner and Company Details</h2>
                            <p><strong>Brand Name:</strong> Feelinga (Feelinga Tea)</p>
                            <p><strong>Legal Entity:</strong> Vithubadayaji Industries Private Limited</p>
                            <p><strong>Founder and Managing Director:</strong> Kailas Ishwar Mane</p>
                            <p><strong>Co-Director:</strong> Jagabai Ishwar Mane</p>
                            <p><strong>Base Location:</strong> Pandharpur, Maharashtra, India</p>
                            <p><strong>Support Email:</strong> <a href="mailto:hello@feelinga.com">hello@feelinga.com</a></p>
                            <p><strong>Support Phone:</strong> <a href="tel:+919673592818">+91 96735 92818</a></p>
                            <p>Our official ownership and business records are maintained internally as part of our compliance documentation.</p>
                        </div>
                        <div className="about-visual about-visual--icon" aria-hidden="true"><AppIcon name="award" size={56} aria-hidden /></div>
                    </div>
                </div>
            </section>

            {/* Sourcing */}
            <section className="section" aria-label="Sourcing story">
                <div className="container">
                    <div className="about-section about-section--reverse fade-in">
                        <div>
                            <p className="overline">Our Estates</p>
                            <h2>Sourced with Intention</h2>
                            <p>We partner directly with 15+ small-estate growers across Darjeeling, Assam, the Nilgiris, and Kangra Valley. No middlemen, no blending houses - just a direct relationship between the garden and your cup.</p>
                            <p>Every lot is personally tasted and selected by our team. We visit our partner estates twice a year, working closely with the pluckers and tea makers to ensure quality, fair wages, and sustainable farming practices.</p>
                        </div>
                        <div className="about-visual about-visual--icon" aria-hidden="true"><AppIcon name="mountain" size={56} aria-hidden /></div>
                    </div>
                </div>
            </section>

            {/* Values */}
            <section id="values" className="section section--alt" aria-label="Values">
                <div className="container">
                    <SectionHeader overline="What We Stand For" title="Our Values" className="fade-in" />
                    <div className="values-grid fade-in">
                        {[
                            { icon: 'leaf', title: 'Sustainability', desc: 'Biodegradable packaging, carbon-offset shipping, and support for regenerative farming practices across our partner estates.' },
                            { icon: 'handshake', title: 'Fair Trade', desc: 'We pay 20-30% above market rate to our growers, funding education, healthcare, and community development programs.' },
                            { icon: 'heart', title: 'Wellness First', desc: 'No artificial flavors, no plastic tea bags, no fillers. Just pure, whole-leaf teas and natural botanicals that nourish your body.' },
                        ].map((v, i) => (
                            <div className="value-card" key={i}>
                                <div className="value-card__icon"><AppIcon name={v.icon} size={28} aria-hidden /></div>
                                <h4>{v.title}</h4>
                                <p>{v.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Timeline */}
            <section id="journey" className="section" aria-label="Company timeline">
                <div className="container">
                    <SectionHeader overline="Milestones" title="Our Journey" className="fade-in" />
                    <ol className="timeline fade-in" role="list">
                        {[
                            { year: '2025', text: 'Vithubadayaji Industries Pvt. Ltd. incorporated in January 2025. Feelinga brand launched from Pandharpur, Maharashtra with a curated collection of premium Indian teas.' },
                            { year: '2025', text: 'Obtained Shop Establishment Certificate and Udyam (MSME) registration. First 12 single-origin teas listed online.' },
                            { year: '2025', text: 'Expanded to 30+ varieties. Launched wellness blends, herbal infusions, and the gifting collection.' },
                            { year: '2026', text: 'Reached 5,000+ customers. Partnered with 15+ tea estates across Darjeeling, Assam, Nilgiris and Kangra Valley.' },
                            { year: '2026', text: 'Switched to fully biodegradable packaging. Began exporting to UAE and Singapore.' },
                            { year: '2026', text: '50+ varieties, 10,000+ happy sippers, and growing with gratitude every day.' },
                        ].map((t, i) => (
                            <li className="timeline-item" key={i}>
                                <div className="timeline-item__year">{t.year}</div>
                                <p>{t.text}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* Careers */}
            <section id="careers" className="section section--alt">
                <div className="container text-center fade-in">
                    <h2>Join Our Team</h2>
                    <p className="about-cta-copy about-cta-copy--narrow">We&apos;re always looking for passionate tea lovers to join the Feelinga family. Reach out to learn about current opportunities.</p>
                    <Link href="/contact" className="btn btn--secondary">Get in Touch</Link>
                </div>
            </section>

            {/* CTA */}
            <section className="section">
                <div className="container text-center fade-in">
                    <h2>Ready to Begin Your Tea Journey?</h2>
                    <p className="about-cta-copy">Explore our collection and discover your perfect cup.</p>
                    <Link href="/shop" className="btn btn--primary">Shop All Teas</Link>
                </div>
            </section>
        </Layout>
    );
}
