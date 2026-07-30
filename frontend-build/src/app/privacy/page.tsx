'use client';
import Layout from '../../components/Layout';
import Link from 'next/link';

const PRIVACY_SECTIONS = [
    { id: 'info-we-collect', label: 'Information We Collect' },
    { id: 'how-we-use', label: 'How We Use Your Information' },
    { id: 'data-security', label: 'Data Security' },
    { id: 'cookies', label: 'Cookies' },
    { id: 'your-rights', label: 'Your Rights' },
    { id: 'contact-us', label: 'Contact Us' },
] as const;

export default function Privacy() {
    return (
        <Layout>
            <div className="page-hero">
                <div className="container">
                    <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link> <span>/</span> <span>Privacy Policy</span></nav>
                    <h1>Privacy Policy</h1>
                </div>
            </div>
            <div className="container section legal-page">
                <p className="legal-page__meta">Last updated: January 2026</p>

                <nav className="legal-page__toc" aria-label="Privacy policy sections">
                    <p className="legal-page__toc-title">On this page</p>
                    <ul className="legal-page__toc-list">
                        {PRIVACY_SECTIONS.map((section) => (
                            <li key={section.id}><a href={`#${section.id}`}>{section.label}</a></li>
                        ))}
                    </ul>
                </nav>

                <div className="legal-page__entity-card">
                    <strong>Legal entity:</strong> Vithubadayaji Industries Private Limited (trading as <strong>Feelinga</strong>)<br />
                    <strong>Registered office:</strong> At Sulewadi, Post Piliv, Tal. Malshiras, Solapur, Maharashtra &ndash; 413310, India<br />
                    <strong>Contact:</strong> <a href="mailto:hello@feelinga.com">hello@feelinga.com</a> &nbsp;&middot;&nbsp; +91&nbsp;96735&nbsp;92818
                </div>

                <h2 id="info-we-collect" className="legal-page__heading">1. Information We Collect</h2>
                <p className="legal-page__paragraph">
                    When you use Feelinga, we collect information you provide directly — such as your name, email address, phone number, shipping address, and payment details when placing an order. We also collect usage data including pages visited, browser type, and device information to improve our services.
                </p>

                <h2 id="how-we-use" className="legal-page__heading">2. How We Use Your Information</h2>
                <p className="legal-page__paragraph">
                    We use your information to process and fulfill orders, communicate about your orders and account, send promotional emails (with your consent), improve our website and services, and comply with legal obligations. We never sell your personal data to third parties.
                </p>

                <h2 id="data-security" className="legal-page__heading">3. Data Security</h2>
                <p className="legal-page__paragraph">
                    We implement industry-standard security measures including encrypted data transmission (SSL/TLS), secure password hashing, and access controls. While no method of electronic storage is 100% secure, we strive to protect your personal information.
                </p>

                <h2 id="cookies" className="legal-page__heading">4. Cookies</h2>
                <p className="legal-page__paragraph">
                    We use essential cookies for authentication and cart functionality. We may also use analytics cookies to understand how visitors interact with our website. You can configure your browser to refuse cookies, though some features may not function properly.
                </p>

                <h2 id="your-rights" className="legal-page__heading">5. Your Rights</h2>
                <p className="legal-page__paragraph">
                    You have the right to access, update, or delete your personal information at any time through your account settings. You may also unsubscribe from marketing emails using the link provided in each email. For data deletion requests, please contact us at <a href="mailto:hello@feelinga.com">hello@feelinga.com</a>.
                </p>

                <h2 id="contact-us" className="legal-page__heading">6. Contact Us</h2>
                <p className="legal-page__paragraph legal-page__paragraph--last">
                    If you have questions about this privacy policy or our data practices, please contact <strong>Vithubadayaji Industries Private Limited</strong> (Feelinga) at <a href="mailto:hello@feelinga.com">hello@feelinga.com</a>, by phone at <a href="tel:+919673592818">+91 96735 92818</a>, or through our <Link href="/contact">contact page</Link>. Our registered office is at At Sulewadi, Post Piliv, Tal. Malshiras, Solapur, Maharashtra &ndash; 413310, India.
                </p>
            </div>
        </Layout>
    );
}
