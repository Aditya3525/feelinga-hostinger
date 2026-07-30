'use client';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { useState } from 'react';
import AppIcon from '../../components/AppIcon';
import { apiRequest } from '../../utils/api';
import type { FormEvent } from 'react';

type FormStatus = {
    text: string;
    type: '' | 'success' | 'error';
};

type ContactFormState = {
    name: string;
    email: string;
    subject: string;
    message: string;
};

const INITIAL_FORM: ContactFormState = {
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: '',
};

function getErrorMessage(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback;
}

export default function Contact() {
    const [form, setForm] = useState<ContactFormState>(INITIAL_FORM);
    const [formStatus, setFormStatus] = useState<FormStatus>({ text: '', type: '' });
    const [submitting, setSubmitting] = useState(false);
    const messageCharsLeft = 1200 - form.message.length;
    const canSubmit = form.name.trim().length > 0 && form.email.trim().length > 0 && form.message.trim().length >= 10;

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!canSubmit || submitting) return;
        setSubmitting(true);
        setFormStatus({ text: '', type: '' });
        try {
            const body = {
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                subject: form.subject,
                message: form.message.trim(),
            };
            const data = await apiRequest('/contact', {
                method: 'POST',
                body: JSON.stringify(body),
            });
            setFormStatus({ text: data.message || "Thank you! We'll get back to you within 24 hours.", type: 'success' });
            setForm(INITIAL_FORM);
        } catch (err) {
            setFormStatus({ text: getErrorMessage(err, 'Something went wrong. Please try again.'), type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <Layout>
            <div className="page-hero">
                <div className="container">
                    <p className="overline">Get in Touch</p>
                    <h1>Contact Us</h1>
                    <p>We&apos;d love to hear from you — whether it&apos;s about an order, wholesale inquiry, or just to say hello.</p>
                </div>
            </div>

            <section className="section">
                <div className="container">
                    <div className="contact-grid fade-in">
                        <form className="contact-form" onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="contactName">Full Name *</label>
                                <input
                                    type="text"
                                    id="contactName"
                                    name="contactName"
                                    required
                                    autoComplete="name"
                                    placeholder="Your name"
                                    value={form.name}
                                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="contactEmail">Email Address *</label>
                                <input
                                    type="email"
                                    id="contactEmail"
                                    name="contactEmail"
                                    required
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    value={form.email}
                                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="contactSubject">Subject</label>
                                <select id="contactSubject" name="contactSubject" value={form.subject} onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}>
                                    <option>General Inquiry</option>
                                    <option>Order Support</option>
                                    <option>Wholesale / B2B</option>
                                    <option>Corporate Gifting</option>
                                    <option>Press &amp; Media</option>
                                    <option>Feedback</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="contactMsg">Message *</label>
                                <textarea
                                    id="contactMsg"
                                    name="contactMsg"
                                    required
                                    placeholder="How can we help?"
                                    minLength={10}
                                    maxLength={1200}
                                    aria-describedby="contactMsgHint"
                                    value={form.message}
                                    onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                                ></textarea>
                                <div id="contactMsgHint" className="contact-form__hint">{messageCharsLeft} characters left</div>
                            </div>
                            {formStatus.text && (
                                <div role="status" aria-live="polite" className={`contact-form__status ${formStatus.type === 'success' ? 'contact-form__status--success' : 'contact-form__status--error'}`}>
                                    {formStatus.text}
                                </div>
                            )}
                            <button type="submit" className="btn btn--primary" disabled={submitting || !canSubmit} aria-busy={submitting}>{submitting ? 'Sending...' : 'Send Message'}</button>
                        </form>

                        <div className="contact-info">
                            <div className="contact-info__item">
                                <div className="contact-info__icon"><AppIcon name="user" size={18} aria-hidden /></div>
                                <div className="contact-info__text">
                                    <h4>Kailas Ishwar Mane</h4>
                                    <p>Founder &amp; Managing Director, Feelinga</p>
                                </div>
                            </div>
                            <div className="contact-info__item">
                                <div className="contact-info__icon"><AppIcon name="mail" size={18} aria-hidden /></div>
                                <div className="contact-info__text">
                                    <h4>Email</h4>
                                    <p><a href="mailto:kailasmane777@gmail.com" className="contact-link">kailasmane777@gmail.com</a></p>
                                </div>
                            </div>
                            <div className="contact-info__item">
                                <div className="contact-info__icon"><AppIcon name="phone" size={18} aria-hidden /></div>
                                <div className="contact-info__text">
                                    <h4>Phone</h4>
                                    <p><a href="tel:+919673592818" className="contact-link">+91 96735 92818</a><br />Mon–Sat, 10am–6pm IST</p>
                                </div>
                            </div>
                            <div className="contact-info__item">
                                <div className="contact-info__icon"><AppIcon name="mapPin" size={18} aria-hidden /></div>
                                <div className="contact-info__text">
                                    <h4>Address</h4>
                                    <p>Shriram Nagar, Takali Road,<br />Laxmi Takali, Pandharpur<br />Maharashtra – 413304, India</p>
                                </div>
                            </div>
                            <div className="contact-info__item">
                                <div className="contact-info__icon"><AppIcon name="message" size={18} aria-hidden /></div>
                                <div className="contact-info__text">
                                    <h4>WhatsApp</h4>
                                    <p><a href="https://wa.me/919673592818" className="contact-link contact-link--strong">Chat with us on WhatsApp →</a></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </Layout>
    );
}
