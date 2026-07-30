'use client';
import Layout from '../../components/Layout';
import Link from 'next/link';

const TERMS_SECTIONS = [
    { id: 'acceptance', label: 'Acceptance of Terms' },
    { id: 'products-orders', label: 'Products & Orders' },
    { id: 'shipping-delivery', label: 'Shipping & Delivery' },
    { id: 'cancellations-returns', label: 'Cancellations & Returns' },
    { id: 'user-accounts', label: 'User Accounts' },
    { id: 'intellectual-property', label: 'Intellectual Property' },
    { id: 'liability', label: 'Limitation of Liability' },
    { id: 'contact', label: 'Contact' },
] as const;

export default function Terms() {
    return (
        <Layout>
            <div className="page-hero">
                <div className="container">
                    <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link> <span>/</span> <span>Terms of Service</span></nav>
                    <h1>Terms of Service</h1>
                </div>
            </div>
            <div className="container section legal-page">
                <p className="legal-page__meta">Last updated: January 2026</p>

                <nav className="legal-page__toc" aria-label="Terms of service sections">
                    <p className="legal-page__toc-title">On this page</p>
                    <ul className="legal-page__toc-list">
                        {TERMS_SECTIONS.map((section) => (
                            <li key={section.id}><a href={`#${section.id}`}>{section.label}</a></li>
                        ))}
                    </ul>
                </nav>

                <div className="legal-page__entity-card">
                    <strong>Legal entity:</strong> Vithubadayaji Industries Private Limited (trading as <strong>Feelinga</strong>)<br />
                    <strong>Registered office:</strong> At Sulewadi, Post Piliv, Tal. Malshiras, Solapur, Maharashtra &ndash; 413310, India<br />
                    <strong>Shop Est. No.:</strong> 2531100320058917 &nbsp;&middot;&nbsp; Incorporated: 23 January 2025 under the Companies Act, 2013<br />
                    <strong>Governing law:</strong> These terms are governed by the laws of India. Disputes shall be subject to the exclusive jurisdiction of courts in Solapur, Maharashtra.
                </div>

                <h2 id="acceptance" className="legal-page__heading">1. Acceptance of Terms</h2>
                <p className="legal-page__paragraph">
                    By accessing or using the Feelinga website and services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
                </p>

                <h2 id="products-orders" className="legal-page__heading">2. Products & Orders</h2>
                <p className="legal-page__paragraph">
                    All products are subject to availability. We reserve the right to limit quantities, refuse orders, or cancel orders at our discretion. Prices are listed in Indian Rupees (INR) and include applicable taxes unless stated otherwise. Product images are representative and actual products may vary slightly.
                </p>

                <h2 id="shipping-delivery" className="legal-page__heading">3. Shipping & Delivery</h2>
                <p className="legal-page__paragraph">
                    We ship across India. Orders above ₹999 qualify for free shipping. Standard delivery takes 3–5 business days. Delivery timelines are estimates and may vary based on location and availability. We are not responsible for delays caused by shipping carriers or force majeure events.
                </p>

                <h2 id="cancellations-returns" className="legal-page__heading">4. Cancellations & Returns</h2>
                <p className="legal-page__paragraph">
                    Orders can be cancelled before they are shipped. Once shipped, cancellations are not possible. We accept returns of unopened products within 7 days of delivery. Perishable items and opened packages cannot be returned. Refunds will be processed within 7-10 business days of receiving the return.
                </p>

                <h2 id="user-accounts" className="legal-page__heading">5. User Accounts</h2>
                <p className="legal-page__paragraph">
                    You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate and current information. We reserve the right to suspend or terminate accounts that violate these terms or engage in fraudulent activity.
                </p>

                <h2 id="intellectual-property" className="legal-page__heading">6. Intellectual Property</h2>
                <p className="legal-page__paragraph">
                    All content on this website — including text, images, logos, and graphics — is the property of Feelinga and protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without our written permission.
                </p>

                <h2 id="liability" className="legal-page__heading">7. Limitation of Liability</h2>
                <p className="legal-page__paragraph">
                    Feelinga shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of our services. Our total liability shall not exceed the amount paid for the specific product or service in question.
                </p>

                <h2 id="contact" className="legal-page__heading">8. Contact</h2>
                <p className="legal-page__paragraph legal-page__paragraph--last">
                    For questions about these terms, please contact <strong>Vithubadayaji Industries Private Limited</strong> (Feelinga) at <a href="mailto:hello@feelinga.com">hello@feelinga.com</a>, by phone at <a href="tel:+919673592818">+91 96735 92818</a>, or through our <Link href="/contact">contact page</Link>.
                </p>
            </div>
        </Layout>
    );
}
