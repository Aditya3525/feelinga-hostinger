'use client';
import Layout from '../../components/Layout';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import EmptyState from '../../components/EmptyState';
import AppIcon from '../../components/AppIcon';
import { apiRequest } from '../../utils/api';
import { getAddressFromCurrentLocation } from '../../utils/geolocation';
import { composeAddressLine2, extractDistrictFromAddressLine2 } from '../../utils/indiaAddress';
import { getCountryPhoneOption, parseInternationalPhone } from '../../utils/phoneCountry';
import type { UserAddress } from '../../types/app';
import AddressFormFields, { AddressData } from '../../components/AddressFormFields';

type PaymentMethod = 'cod' | 'whatsapp';
type CheckoutMode = 'cart' | 'buy-now';

type CouponApplied = {
    code: string;
    discount: number;
};

type BuyNowPayload = {
    id: string;
    slug?: string;
    name: string;
    price: number;
    size: string;
    img?: string;
    qty: number;
};

type CheckoutItem = {
    key: string;
    id: string;
    slug?: string;
    name: string;
    price: number;
    size: string;
    img?: string;
    qty: number;
};

const BUY_NOW_STORAGE_KEY = 'feelinga_buy_now';
const WHATSAPP_PROVIDER_NUMBER = '919673592818';

function getErrorMessage(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback;
}

function normalizeDigits(value: string, max: number): string {
    return value.replace(/\D/g, '').slice(0, max);
}

function getDefaultAddressIndex(addresses: UserAddress[]): number {
    const idx = addresses.findIndex((a) => a.isDefault);
    return idx >= 0 ? idx : 0;
}

function getCheckoutItemsSubtotal(items: CheckoutItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function formatPrice(value: number): string {
    return `₹${value.toLocaleString('en-IN')}`;
}

export default function Checkout() {
    const { cart, clearCart } = useCart();
    const { isAuthenticated, openAuthModal, user, setUser } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const checkoutMode: CheckoutMode = searchParams.get('mode') === 'buy-now' ? 'buy-now' : 'cart';

    const [step, setStep] = useState(1);
    const [buyNowItem, setBuyNowItem] = useState<BuyNowPayload | null>(null);
    const [address, setAddress] = useState<AddressData>({
        label: 'Home',
        firstName: '',
        lastName: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        district: '',
        state: '',
        pincode: '',
        countryCode: '+91',
        phone: '',
    });
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [couponApplied, setCouponApplied] = useState<CouponApplied | null>(null);
    const [couponError, setCouponError] = useState('');
    const [couponLoading, setCouponLoading] = useState(false);
    const [locatingAddress, setLocatingAddress] = useState(false);
    const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
    const [summaryExpanded, setSummaryExpanded] = useState(false);
    const [saveAddressConsent, setSaveAddressConsent] = useState(true);
    const [savingAddressForCheckout, setSavingAddressForCheckout] = useState(false);
    const savedAddresses = user?.addresses ?? [];
    const stepLabels = ['Shipping', 'Payment', 'Review', 'Confirm'];
    const shippingPhoneCountry = useMemo(() => getCountryPhoneOption(address.countryCode), [address.countryCode]);
    const requiresAddressSaveConfirmation = checkoutMode === 'buy-now' && savedAddresses.length === 0;

    useEffect(() => {
        if (checkoutMode !== 'buy-now') {
            setBuyNowItem(null);
            return;
        }

        try {
            const raw = sessionStorage.getItem(BUY_NOW_STORAGE_KEY);
            if (!raw) {
                setBuyNowItem(null);
                return;
            }

            const parsed = JSON.parse(raw) as Partial<BuyNowPayload>;
            if (!parsed.id || !parsed.name || !Number.isFinite(Number(parsed.price)) || !Number.isFinite(Number(parsed.qty))) {
                setBuyNowItem(null);
                return;
            }

            setBuyNowItem({
                id: String(parsed.id),
                slug: parsed.slug,
                name: String(parsed.name),
                price: Number(parsed.price),
                size: String(parsed.size || '100g'),
                img: parsed.img,
                qty: Math.max(1, Number(parsed.qty || 1)),
            });
        } catch {
            setBuyNowItem(null);
        }
    }, [checkoutMode]);

    const checkoutItems: CheckoutItem[] = useMemo(() => {
        if (checkoutMode === 'buy-now') {
            if (!buyNowItem) return [];
            return [{
                key: `${buyNowItem.id}_${buyNowItem.size}`,
                id: buyNowItem.id,
                slug: buyNowItem.slug,
                name: buyNowItem.name,
                price: buyNowItem.price,
                size: buyNowItem.size,
                img: buyNowItem.img,
                qty: buyNowItem.qty,
            }];
        }
        return cart as CheckoutItem[];
    }, [buyNowItem, cart, checkoutMode]);

    const subtotal = getCheckoutItemsSubtotal(checkoutItems);
    const shipping = subtotal >= 999 ? 0 : 79;

    const applyAddress = (addr: UserAddress) => {
        const nameParts = (addr.fullName || '').split(' ');
        const { district, line2WithoutDistrict } = extractDistrictFromAddressLine2(addr.addressLine2 || '');
        const parsedPhone = parseInternationalPhone(addr.phone || '');
        const option = getCountryPhoneOption(parsedPhone.countryCode);
        setAddress({
            label: addr.label || 'Home',
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' '),
            addressLine1: addr.addressLine1 || '',
            addressLine2: line2WithoutDistrict || '',
            city: addr.city || '',
            district: district || '',
            state: addr.state || '',
            pincode: normalizeDigits(addr.pincode || '', 6),
            countryCode: option.code,
            phone: normalizeDigits(parsedPhone.phone || '', option.maxDigits),
        });
    };

    // Pre-fill shipping address from user's default saved address
    useEffect(() => {
        if (!isAuthenticated || savedAddresses.length === 0) return;
        const defaultIndex = getDefaultAddressIndex(savedAddresses);
        setSelectedAddressIndex(defaultIndex);
        if (!address.firstName && !address.addressLine1) {
            const defaultAddr = savedAddresses[defaultIndex];
            if (defaultAddr) applyAddress(defaultAddr);
        }
    }, [isAuthenticated, savedAddresses, address.firstName, address.addressLine1]);

    useEffect(() => {
        if (step >= 3) setSummaryExpanded(true);
    }, [step]);

    const shippingAddressValid =
        address.firstName.trim().length >= 2 &&
        address.lastName.trim().length >= 2 &&
        address.addressLine1.trim().length >= 5 &&
        address.city.trim().length >= 2 &&
        address.district.trim().length >= 2 &&
        address.state.trim().length >= 2 &&
        /^\d{6}$/.test(address.pincode) &&
        /^\+\d{1,4}$/.test(address.countryCode.trim()) &&
        address.phone.length >= shippingPhoneCountry.minDigits &&
        address.phone.length <= shippingPhoneCountry.maxDigits;

    const canContinueShipping = shippingAddressValid && (!requiresAddressSaveConfirmation || saveAddressConsent);

    const maybeSaveAddressForBuyNow = async () => {
        if (!requiresAddressSaveConfirmation || !saveAddressConsent) return;

        const payload = {
            label: address.label,
            fullName: `${address.firstName.trim()} ${address.lastName.trim()}`.trim(),
            phone: `${address.countryCode.trim()}${normalizeDigits(address.phone, 12)}`,
            addressLine1: address.addressLine1.trim(),
            addressLine2: composeAddressLine2(address.addressLine2, address.district),
            city: address.city.trim(),
            state: address.state.trim(),
            pincode: address.pincode.trim(),
            isDefault: true,
        };

        setSavingAddressForCheckout(true);
        try {
            const data = await apiRequest('/auth/addresses', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            const nextAddresses = (data.data?.addresses || []) as UserAddress[];
            setUser((prev) => (prev ? { ...prev, addresses: nextAddresses } : prev));
            showToast('Address saved as your default address.', 'success');
        } finally {
            setSavingAddressForCheckout(false);
        }
    };

    const handleShippingContinue = async (e: { preventDefault: () => void }) => {
        e.preventDefault();
        if (!canContinueShipping || savingAddressForCheckout) return;

        try {
            await maybeSaveAddressForBuyNow();
            setStep(2);
        } catch (err) {
            showToast(getErrorMessage(err, 'Unable to save address. Please try again.'), 'error');
        }
    };

    const discount = couponApplied?.discount || 0;
    // Tax on pre-discount subtotal (matches backend: Math.round(subtotal * 0.05))
    const tax = Math.round(subtotal * 0.05);
    const total = subtotal + shipping + tax - discount;

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponError('');
        setCouponLoading(true);
        try {
            const data = await apiRequest('/coupons/validate', {
                method: 'POST',
                body: JSON.stringify({ code: couponCode.trim(), subtotal }),
            });
            setCouponApplied(data.data as CouponApplied);
        } catch (err) {
            setCouponError(getErrorMessage(err, 'Invalid coupon'));
            setCouponApplied(null);
        } finally {
            setCouponLoading(false);
        }
    };

    const handleRemoveCoupon = () => {
        setCouponApplied(null);
        setCouponCode('');
        setCouponError('');
    };

    const autofillShippingFromGPS = async () => {
        setLocatingAddress(true);
        try {
            const detected = await getAddressFromCurrentLocation();
            const [firstName = '', ...rest] = (user?.name || '').trim().split(' ');
            const lastName = rest.join(' ');

            setAddress((prev) => ({
                ...prev,
                firstName: prev.firstName || firstName,
                lastName: prev.lastName || lastName,
                phone: prev.phone || parseInternationalPhone(user?.phone || '').phone,
                addressLine1: detected.addressLine1 || prev.addressLine1,
                addressLine2: detected.addressLine2 || prev.addressLine2,
                city: detected.city || prev.city,
                district: prev.district,
                state: detected.state || prev.state,
                pincode: detected.pincode || prev.pincode,
            }));

            showToast('Shipping address filled from your current location.', 'success');
        } catch (err) {
            showToast(getErrorMessage(err, 'Unable to fetch your current location.'), 'error');
        } finally {
            setLocatingAddress(false);
        }
    };

    const handlePlaceOrder = async () => {
        if (!isAuthenticated) { openAuthModal(); return; }
        const orderableItems = checkoutItems.filter(item => Boolean(item.id));
        if (orderableItems.length === 0) {
            showToast('No orderable products found. Please check your cart and try again.', 'error');
            return;
        }
        if (orderableItems.length < checkoutItems.length) {
            showToast(`${checkoutItems.length - orderableItems.length} item(s) were skipped because they are not orderable.`, 'info');
        }
        setLoading(true);
        try {
            const items = orderableItems.map(item => ({
                productId: item.id,
                size: item.size || '100g',
                qty: item.qty,
            }));
            const shippingAddressPayload = {
                firstName: address.firstName,
                lastName: address.lastName,
                line1: address.addressLine1,
                line2: composeAddressLine2(address.addressLine2, address.district),
                city: address.city,
                state: address.state,
                pincode: address.pincode,
                phone: `${address.countryCode.trim()}${address.phone}`,
            };
            const result = await apiRequest('/orders', {
                method: 'POST',
                body: JSON.stringify({ items, shippingAddress: shippingAddressPayload, paymentMethod, notes, couponCode: couponApplied?.code || undefined }),
            });
            const orderNumber = result.data?.orderNumber || '';
            const uniqueItems = orderableItems.reduce((n, i) => n + i.qty, 0);
            if (checkoutMode === 'buy-now') {
                sessionStorage.removeItem(BUY_NOW_STORAGE_KEY);
            } else {
                clearCart();
            }
            showToast('Order placed successfully.', 'success');

            if (paymentMethod === 'whatsapp') {
                const itemSummary = orderableItems
                    .map((item, idx) => `${idx + 1}. ${item.name} (${item.size}) x ${item.qty} = ₹${(item.price * item.qty).toLocaleString('en-IN')}`)
                    .join('\n');

                const waText = [
                    'Hi Feelinga Team,',
                    '',
                    'I placed an order and want to complete it via WhatsApp.',
                    `Order No: ${orderNumber}`,
                    'Payment: Pay on WhatsApp',
                    '',
                    '*Customer & Delivery Details*',
                    `Name: ${address.firstName} ${address.lastName}`,
                    `Phone: ${address.countryCode}${address.phone}`,
                    `Address: ${address.addressLine1}${address.addressLine2 ? `, ${address.addressLine2}` : ''}, ${address.city}, ${address.district}, ${address.state} - ${address.pincode}`,
                    '',
                    '*Products*',
                    itemSummary,
                    '',
                    '*Bill Summary*',
                    `Subtotal: ₹${subtotal.toLocaleString('en-IN')}`,
                    `Shipping: ${shipping === 0 ? 'Free' : `₹${shipping.toLocaleString('en-IN')}`}`,
                    `Tax (5%): ₹${tax.toLocaleString('en-IN')}`,
                    `${discount > 0 ? `Discount: -₹${discount.toLocaleString('en-IN')}` : 'Discount: ₹0'}`,
                    `Total: ₹${total.toLocaleString('en-IN')}`,
                    '',
                    `Notes: ${notes?.trim() || 'None'}`,
                ].join('\n');

                window.open(`https://wa.me/${WHATSAPP_PROVIDER_NUMBER}?text=${encodeURIComponent(waText)}`, '_blank');
            }
            router.push(`/order-confirm?order=${encodeURIComponent(orderNumber)}&items=${uniqueItems}&total=${total}`);
        } catch (err) {
            showToast(getErrorMessage(err, 'Failed to place order'), 'error');
        } finally {
            setLoading(false);
        }
    };

    if (checkoutItems.length === 0 && step < 4) {
        return (
            <Layout>
                <div className="container section checkout-shell">
                    <EmptyState
                        icon="shopping"
                        iconSize="lg"
                        title={checkoutMode === 'buy-now' ? 'Buy Now item not found' : 'Your cart is empty'}
                        message={checkoutMode === 'buy-now' ? 'Please go back to the product page and click Buy Now again.' : 'Add some teas to get started!'}
                        actionLabel="Shop Teas"
                        actionHref="/shop"
                    />
                </div>
            </Layout>
        );
    }

    if (!isAuthenticated) {
        return (
            <Layout>
                <div className="page-hero">
                    <div className="container">
                        <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link> <span>/</span> <span>Checkout</span></nav>
                        <h1>Checkout</h1>
                    </div>
                </div>
                <div className="container section checkout-shell checkout-auth-gate">
                    <div className="checkout-auth-gate__icon"><AppIcon name="lock" size={48} aria-hidden /></div>
                    <h2 className="checkout-auth-gate__title">Sign in to continue</h2>
                    <p className="checkout-auth-gate__description">
                        Please log in or create an account to complete your purchase. This helps us track your order and send you updates.
                    </p>
                    <div className="checkout-auth-gate__actions">
                        <button className="btn btn--primary checkout-auth-gate__action" onClick={openAuthModal}>
                            Log In / Sign Up
                        </button>
                        <Link href="/shop" className="btn btn--ghost checkout-auth-gate__action">
                            Continue Shopping
                        </Link>
                    </div>
                    <div className="checkout-auth-gate__cart-preview">
                        <p className="checkout-auth-gate__cart-title">Your cart is safe</p>
                        <p className="checkout-auth-gate__cart-description">
                            You have {checkoutItems.reduce((sum, i) => sum + i.qty, 0)} item{checkoutItems.reduce((sum, i) => sum + i.qty, 0) !== 1 ? 's' : ''} worth {formatPrice(subtotal)} waiting in checkout. They&apos;ll be here after you sign in.
                        </p>
                        {checkoutItems.length > 0 && (
                            <div className="checkout-auth-gate__item-list">
                                {checkoutItems.map((item) => (
                                    <div key={item.key} className="checkout-auth-gate__item-row">
                                        <span className="checkout-auth-gate__item-name">{item.name} · {item.size} × {item.qty}</span>
                                        <span className="checkout-auth-gate__item-price">{formatPrice(item.price * item.qty)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="page-hero">
                <div className="container">
                    <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link> <span>/</span> <span>Checkout</span></nav>
                    <h1>Checkout</h1>
                    <div className="checkout-mode-badge-wrap">
                        <span className={`checkout-mode-badge ${checkoutMode === 'buy-now' ? 'checkout-mode-badge--buy-now' : 'checkout-mode-badge--cart'}`}>
                            {checkoutMode === 'buy-now' ? 'Buy Now Checkout' : 'Cart Checkout'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="container section checkout-shell">
                {/* Progress */}
                <div className="checkout-stepper" role="list" aria-label="Checkout progress">
                    <p className="visually-hidden" aria-live="polite">Step {step} of 4: {stepLabels[Math.min(step - 1, stepLabels.length - 1)]}</p>
                    {stepLabels.map((s, i) => (
                        <div key={i} role="listitem" aria-current={step === i + 1 ? 'step' : undefined} className={`checkout-stepper__step ${step >= i + 1 ? 'checkout-stepper__step--active' : ''}`}>
                            <div className={`checkout-stepper__circle ${step >= i + 1 ? 'checkout-stepper__circle--active' : ''}`}>{i + 1}</div>
                            <span className={`checkout-stepper__label ${step === i + 1 ? 'checkout-stepper__label--current' : ''}`}>{s}</span>
                        </div>
                    ))}
                </div>

                <div className="checkout-layout">
                    <div className="checkout-panel checkout-panel--main">
                        {/* Step 1: Shipping */}
                        {step === 1 && (
                            <div>
                                <div className="checkout-section-header">
                                    <h2 className="checkout-section-title">Shipping Address</h2>
                                    <button type="button" className="btn btn--ghost btn--sm" onClick={autofillShippingFromGPS} disabled={locatingAddress}>
                                        {locatingAddress ? 'Locating...' : 'Use Current Location'}
                                    </button>
                                </div>
                                {isAuthenticated && savedAddresses.length > 0 && (
                                    <div className="checkout-field-group checkout-field-group--lg-gap">
                                        <label htmlFor="savedAddressSelect" className="checkout-field-label">Use a saved address</label>
                                        <select
                                            id="savedAddressSelect"
                                            value={selectedAddressIndex}
                                            className="checkout-form-control"
                                            onChange={(e) => {
                                                const nextIndex = parseInt(e.target.value, 10);
                                                setSelectedAddressIndex(nextIndex);
                                                const addr = savedAddresses[nextIndex] as UserAddress | undefined;
                                                if (!addr) return;
                                                applyAddress(addr);
                                            }}
                                        >
                                            {savedAddresses.map((a: UserAddress, i: number) => (
                                                <option key={a._id || i} value={i}>{a.label} — {a.fullName}, {a.city}{a.isDefault ? ' (Default)' : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <form onSubmit={handleShippingContinue} className="checkout-shipping-form"><fieldset><legend className="visually-hidden">Shipping Address</legend>
                                    
                                    <AddressFormFields 
                                        address={address} 
                                        onChange={setAddress} 
                                        idPrefix="shipping" 
                                    />

                                    {requiresAddressSaveConfirmation && (
                                        <div className="checkout-shipping-form__span-all" style={{ marginTop: '16px' }}>
                                            <label htmlFor="saveBuyNowAddress" className="checkout-field-label">
                                                <input
                                                    id="saveBuyNowAddress"
                                                    type="checkbox"
                                                    checked={saveAddressConsent}
                                                    onChange={(e) => setSaveAddressConsent(e.target.checked)}
                                                    required
                                                />{' '}
                                                Save this new address to my account and mark it as default.
                                            </label>
                                        </div>
                                    )}
                                    
                                    <div className="checkout-shipping-form__submit"><button type="submit" className="btn btn--primary" disabled={!canContinueShipping || savingAddressForCheckout}>{savingAddressForCheckout ? 'Saving Address...' : 'Continue to Payment'}</button></div>
                                </fieldset></form>
                            </div>
                        )}

                        {/* Step 2: Payment */}
                        {step === 2 && (
                            <div>
                                <h2 className="checkout-section-title checkout-section-title--mb">Payment Method</h2>
                                <div className="checkout-payment-options">
                                    {[
                                        { value: 'cod', label: 'Cash on Delivery', desc: 'COD requests are accepted and serviceability is confirmed after order placement.' },
                                        { value: 'whatsapp', label: 'Pay on WhatsApp', desc: 'Your order details are auto-filled in a WhatsApp message to the provider.' },
                                    ].map(pm => (
                                        <label key={pm.value} className={`checkout-payment-option ${paymentMethod === pm.value ? 'checkout-payment-option--active' : ''}`}>
                                            <input className="checkout-payment-option__radio" type="radio" name="payment" value={pm.value} checked={paymentMethod === pm.value} onChange={() => setPaymentMethod(pm.value as PaymentMethod)} />
                                            <div>
                                                <div className="checkout-payment-option__label">{pm.label}</div>
                                                <div className="checkout-payment-option__desc">{pm.desc}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                <div className="checkout-notes-wrap"><label htmlFor="orderNotes">Order Notes (optional)</label><textarea className="checkout-form-control checkout-notes" id="orderNotes" maxLength={250} value={notes} onChange={e => setNotes(e.target.value)} /></div>
                                <div className="checkout-step-actions">
                                    <button className="btn btn--ghost" onClick={() => setStep(1)}>← Back</button>
                                    <button className="btn btn--primary" onClick={() => setStep(3)}>Review Order</button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Review */}
                        {step === 3 && (
                            <div>
                                <h2 className="checkout-section-title checkout-section-title--mb">Review Your Order</h2>
                                <div className="checkout-review-block">
                                    <h3 className="checkout-review-title">Shipping To</h3>
                                    <p>{address.firstName} {address.lastName}<br />{address.addressLine1}{address.addressLine2 && `, ${address.addressLine2}`}<br />{address.city}, {address.district}, {address.state} - {address.pincode}<br />Phone: {address.countryCode}{address.phone}</p>
                                </div>
                                <div className="checkout-review-block">
                                    <h3>Payment: {paymentMethod === 'cod' ? 'Cash on Delivery' : 'Pay on WhatsApp'}</h3>
                                </div>
                                <div className="checkout-step-actions">
                                    <button className="btn btn--ghost" onClick={() => setStep(2)}>← Back</button>
                                    <button className="btn btn--primary" onClick={handlePlaceOrder} disabled={loading || !shippingAddressValid}>{loading ? 'Placing...' : 'Place Order'}</button>
                                </div>
                                <div className="checkout-trust-list">
                                    <span className="checkout-trust-item"><AppIcon name="refresh" size={14} aria-hidden />Free returns within 7 days</span>
                                    <span className="checkout-trust-item"><AppIcon name="checkCircle" size={14} aria-hidden />100% authentic teas</span>
                                    <span className="checkout-trust-item"><AppIcon name="lock" size={14} aria-hidden />Secure checkout experience</span>
                                </div>
                            </div>
                        )}

                        {/* Order placed — user is redirected to /order-confirm immediately */}
                    </div>

                    {/* Order Summary Sidebar */}
                    {step < 4 && (
                        <div className="checkout-summary checkout-panel checkout-panel--summary">
                            <h3 className="checkout-summary__title">Order Summary</h3>
                            <button
                                type="button"
                                className="checkout-summary__toggle"
                                aria-expanded={summaryExpanded}
                                aria-controls="checkout-summary-content"
                                onClick={() => setSummaryExpanded((prev) => !prev)}
                            >
                                <span>Items: {checkoutItems.reduce((sum, item) => sum + item.qty, 0)}</span>
                                <span>{summaryExpanded ? 'Hide details' : 'View details'}</span>
                            </button>

                            <div id="checkout-summary-content" className={`checkout-summary__content ${summaryExpanded ? 'checkout-summary__content--open' : ''}`}>
                                {checkoutItems.map((item) => (
                                    <div key={item.key} className="checkout-summary__line checkout-summary__line--sm-gap">
                                        <span>{item.name} · {item.size} × {item.qty}</span>
                                        <span>{formatPrice(item.price * item.qty)}</span>
                                    </div>
                                ))}
                                <hr className="checkout-summary__divider checkout-summary__divider--my" />
                                <div className="checkout-summary__line"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                                {couponApplied && (
                                    <div className="checkout-summary__line checkout-summary__line--discount">
                                        <span>Discount ({couponApplied.code})</span>
                                        <span>−{formatPrice(discount)}</span>
                                    </div>
                                )}
                                <div className="checkout-summary__line"><span>Shipping</span><span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
                                <div className="checkout-summary__line checkout-summary__line--mb"><span>Tax (5% GST)</span><span>{formatPrice(tax)}</span></div>
                                <hr className="checkout-summary__divider checkout-summary__divider--mb" />
                            </div>

                            <div className="checkout-summary__total"><span>Total</span><span>{formatPrice(total)}</span></div>
                            {subtotal < 999 && <p className="checkout-summary__hint">Add {formatPrice(999 - subtotal)} more for free shipping!</p>}

                            {/* Coupon Code */}
                            <div className="checkout-coupon">
                                <label className="checkout-coupon__label">Have a coupon?</label>
                                {couponApplied ? (
                                    <div className="checkout-coupon__applied">
                                        <span className="checkout-coupon__applied-text"><AppIcon name="checkCircle" size={14} aria-hidden />{couponApplied.code} applied (−{formatPrice(discount)})</span>
                                        <button className="checkout-coupon__remove" onClick={handleRemoveCoupon} aria-label="Remove coupon"><AppIcon name="xCircle" size={14} aria-hidden /></button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="checkout-coupon__form-row">
                                            <input
                                                className="checkout-coupon__input"
                                                type="text"
                                                placeholder="Enter code"
                                                value={couponCode}
                                                onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                                            />
                                            <button className="btn btn--primary btn--sm" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()} aria-busy={couponLoading}>
                                                {couponLoading ? '...' : 'Apply'}
                                            </button>
                                        </div>
                                        {couponError && <p className="checkout-coupon__error" role="alert" aria-live="assertive">{couponError}</p>}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
