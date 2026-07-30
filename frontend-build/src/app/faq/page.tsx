"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import SectionHeader from '../../components/SectionHeader';

type FaqCategory = 'Ordering' | 'Shipping' | 'Products' | 'Returns';

type FaqItem = {
  id: string;
  category: FaqCategory;
  q: string;
  a: string;
};

const FAQ_CATEGORIES: FaqCategory[] = ['Ordering', 'Shipping', 'Products', 'Returns'];

const FAQ_DATA: FaqItem[] = [
  {
    id: 'ordering',
    category: 'Ordering',
    q: 'How do I place an order?',
    a: 'Select a tea, choose quantity, and click "Add to Cart". Then proceed to checkout.',
  },
  {
    id: 'shipping',
    category: 'Shipping',
    q: 'What shipping options are available?',
    a: 'Standard (3-5 days) and Express (1-2 days) are available for all domestic orders.',
  },
  {
    id: 'products',
    category: 'Products',
    q: 'Are the teas organic?',
    a: 'All our teas are sourced from certified sustainable farms; many are organic.',
  },
  {
    id: 'returns',
    category: 'Returns',
    q: 'What is your return policy?',
    a: 'We accept returns within 30 days of delivery for unopened products.',
  },
];

function FaqPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const filteredFaqs = useMemo(() => {
    if (!searchTerm) return FAQ_DATA;
    const term = searchTerm.toLowerCase();
    return FAQ_DATA.filter((faq) =>
      faq.q.toLowerCase().includes(term) || faq.a.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const hasResults = filteredFaqs.length > 0;

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <Layout>
      <section className="faq-hero" aria-label="FAQ Hero">
        <div className="container">
          <SectionHeader
            overline="Help Center"
            title="Frequently Asked Questions"
            description="Find answers to common questions about ordering, shipping, and more."
          />
          <div className="faq-search">
            <input
              type="text"
              placeholder="Search FAQs..."
              aria-label="Search FAQs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="faq-search__clear"
                onClick={() => setSearchTerm('')}
                aria-label="Clear FAQ search"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      <main id="main" className="faq-content" role="main">
        {!hasResults && (
          <section className="faq-empty" aria-live="polite">
            <p>No FAQs matched "{searchTerm}".</p>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setSearchTerm('')}
            >
              Clear search
            </button>
          </section>
        )}

        {FAQ_CATEGORIES.map((category) => {
          const categoryFaqs = filteredFaqs.filter((f) => f.category === category);
          if (categoryFaqs.length === 0) return null;

          return (
            <section key={category} aria-labelledby={`cat-${category}`} className="faq-category">
              <h2 id={`cat-${category}`} className="faq-category-title">
                {category}
              </h2>
              <ul className="faq-list" role="list">
                {categoryFaqs.map((faq) => (
                  <li key={faq.id} className={`faq-item ${openId === faq.id ? 'active' : ''}`}>
                    <button
                      id={`question-${faq.id}`}
                      type="button"
                      className="faq-question"
                      aria-controls={`answer-${faq.id}`}
                      aria-expanded={openId === faq.id}
                      onClick={() => toggle(faq.id)}
                    >
                      {faq.q}
                    </button>
                    <div
                      id={`answer-${faq.id}`}
                      className="faq-answer"
                      hidden={openId !== faq.id}
                      role="region"
                      aria-labelledby={`question-${faq.id}`}
                    >
                      <p>{faq.a}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <section className="faq-contact">
          <p>
            Still have questions?{' '}
            <Link href="/contact" className="btn btn--primary btn--sm">
              Contact Us
            </Link>
          </p>
        </section>
      </main>
    </Layout>
  );
}

export default FaqPage;
