'use client';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { useState, useEffect, useMemo, useRef } from 'react';
import { apiRequest } from '../../utils/api';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import EmptyState from '../../components/EmptyState';
import AppIcon from '../../components/AppIcon';
import { getAddressFromCurrentLocation } from '../../utils/geolocation';
import { composeAddressLine2, extractDistrictFromAddressLine2 } from '../../utils/indiaAddress';
import { getEmailError } from '../../utils/email';
import { checkEmailAddress } from '../../utils/emailCheck';
import AddressFormFields, { AddressData, EMPTY_ADDRESS_FORM } from '../../components/AddressFormFields';
import { getCountryPhoneOption, formatCountryPhoneHint, parseInternationalPhone, COUNTRY_PHONE_OPTIONS, DEFAULT_COUNTRY_CODE } from '../../utils/phoneCountry';
import { getStrongPasswordError } from '../../utils/password';
import '../../styles/profile.css';
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { OrderSummary, UserAddress, UserProfile } from '../../types/app';

type FormMessage = {
    text: string;
    type: '' | 'success' | 'error';
};

type TabKey = 'info' | 'password' | 'addresses' | 'orders';



function getErrorMessage(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback;
}

export default function Profile() {
    const { user, isAuthenticated, isAdmin, openAuthModal, logout, updateProfile, setUser } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabKey>('info');
    const [profileMsg, setProfileMsg] = useState<FormMessage>({ text: '', type: '' });
    const [passwordMsg, setPasswordMsg] = useState<FormMessage>({ text: '', type: '' });
    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersError, setOrdersError] = useState<string | null>(null);
    const [addressForm, setAddressForm] = useState<AddressData>(EMPTY_ADDRESS_FORM);
    const [profilePhoneCountryCode, setProfilePhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE);
    const [profilePhone, setProfilePhone] = useState('');
    const [locatingAddress, setLocatingAddress] = useState(false);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileEmailChecking, setProfileEmailChecking] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [addressSaving, setAddressSaving] = useState(false);
    const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

    // Read ?tab= query param for deep-linking (e.g. footer "Track Order")
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('tab') === 'orders') setActiveTab('orders');
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;
        (async () => {
            try {
                setOrdersLoading(true);
                setOrdersError(null);
                const data = await apiRequest('/orders');
                setOrders((data.data || []) as OrderSummary[]);
            } catch (err) {
                console.error('Failed to load orders:', err);
                setOrdersError(getErrorMessage(err, 'Could not load your order history.'));
            } finally {
                setOrdersLoading(false);
            }
        })();
    }, [isAuthenticated]);

    const handleProfileUpdate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (profileSaving) return;
        setProfileSaving(true);
        setProfileMsg({ text: '', type: '' });
        const formData = new FormData(e.currentTarget);
        try {
            const name = String(formData.get('profileName') || '').trim();
            const email = String(formData.get('profileEmail') || '').trim();
            const emailError = getEmailError(email);
            if (emailError) {
                setProfileMsg({ text: emailError, type: 'error' });
                return;
            }
            const emailCheck = await checkEmailAddress(email);
            if (!emailCheck.valid) {
                setProfileMsg({ text: emailCheck.reason || 'Please enter a valid email address.', type: 'error' });
                return;
            }
            const phoneDigits = profilePhone.trim().replace(/\D/g, '');
            const selectedPhoneCountry = getCountryPhoneOption(profilePhoneCountryCode);
            if (phoneDigits && (phoneDigits.length < selectedPhoneCountry.minDigits || phoneDigits.length > selectedPhoneCountry.maxDigits)) {
                setProfileMsg({ text: `Phone number must be ${formatCountryPhoneHint(selectedPhoneCountry)} for ${selectedPhoneCountry.label} (${selectedPhoneCountry.code}).`, type: 'error' });
                setProfileSaving(false);
                return;
            }
            const phone = phoneDigits ? `${selectedPhoneCountry.code}${phoneDigits.slice(0, selectedPhoneCountry.maxDigits)}` : '';
            const updates: Record<string, string> = { name, email, phone };
            // Backend requires currentPassword when changing email
            if (email !== user?.email) {
                const pw = String(formData.get('profileCurrentPassword') || '');
                if (!pw) { setProfileMsg({ text: 'Current password is required to change email', type: 'error' }); return; }
                updates.currentPassword = pw;
            }
            await updateProfile(updates);
            setProfileMsg({ text: 'Profile updated!', type: 'success' });
        } catch (err) {
            setProfileMsg({ text: getErrorMessage(err, 'Failed to update profile'), type: 'error' });
        } finally {
            setProfileSaving(false);
        }
    };

    const handleProfileEmailBlur = async (email: string) => {
        const emailError = getEmailError(email);
        if (emailError) {
            setProfileMsg({ text: emailError, type: 'error' });
            return;
        }

        setProfileEmailChecking(true);
        try {
            const emailCheck = await checkEmailAddress(email);
            if (!emailCheck.valid) {
                setProfileMsg({ text: emailCheck.reason || 'Please enter a valid email address.', type: 'error' });
            }
        } catch {
            setProfileMsg({ text: 'Unable to verify this email address right now. Please try again.', type: 'error' });
        } finally {
            setProfileEmailChecking(false);
        }
    };

    const handlePasswordChange = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (passwordSaving) return;
        const form = e.currentTarget;
        setPasswordSaving(true);
        setPasswordMsg({ text: '', type: '' });
        const formData = new FormData(form);
        const currentPassword = String(formData.get('currentPassword') || '');
        const newPassword = String(formData.get('newPassword') || '');
        const confirmPassword = String(formData.get('confirmPassword') || '');
        if (newPassword !== confirmPassword) {
            setPasswordMsg({ text: 'Passwords do not match', type: 'error' });
            setPasswordSaving(false);
            return;
        }
        const strongPasswordError = getStrongPasswordError(newPassword);
        if (strongPasswordError) {
            setPasswordMsg({ text: strongPasswordError, type: 'error' });
            setPasswordSaving(false);
            return;
        }
        try {
            await apiRequest('/auth/password', {
                method: 'PATCH',
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            setPasswordMsg({ text: 'Password updated successfully!', type: 'success' });
            form.reset();
        } catch (err) {
            setPasswordMsg({ text: getErrorMessage(err, 'Failed to update password'), type: 'error' });
        } finally {
            setPasswordSaving(false);
        }
    };

    const handleSaveAddress = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (addressSaving) return;
        setAddressSaving(true);
        try {
            const firstName = addressForm.firstName.trim();
            const lastName = addressForm.lastName.trim();
            if (!firstName || !lastName) {
                showToast('First name and last name are required.', 'error');
                setAddressSaving(false);
                return;
            }

            const selectedCountry = getCountryPhoneOption(addressForm.countryCode);
            const phoneDigits = addressForm.phone.trim().replace(/\D/g, '').slice(0, selectedCountry.maxDigits);
            if (phoneDigits.length < selectedCountry.minDigits || phoneDigits.length > selectedCountry.maxDigits) {
                showToast(`Phone number must be ${formatCountryPhoneHint(selectedCountry)} for ${selectedCountry.label} (${selectedCountry.code}).`, 'error');
                setAddressSaving(false);
                return;
            }

            if (addressForm.addressLine1.trim().length < 5) {
                showToast('Address line 1 is required and must be at least 5 characters.', 'error');
                setAddressSaving(false);
                return;
            }

            if (!addressForm.state.trim() || !addressForm.city.trim() || !addressForm.district.trim()) {
                showToast('State, city, and district are required.', 'error');
                setAddressSaving(false);
                return;
            }

            if (!/^\d{6}$/.test(addressForm.pincode.trim())) {
                showToast('Please enter a valid 6-digit pincode.', 'error');
                setAddressSaving(false);
                return;
            }

            const body = {
                label: addressForm.label,
                fullName: `${firstName} ${lastName}`.trim(),
                phone: `${selectedCountry.code}${phoneDigits}`,
                addressLine1: addressForm.addressLine1.trim(),
                addressLine2: composeAddressLine2(addressForm.addressLine2, addressForm.district),
                city: addressForm.city.trim(),
                state: addressForm.state.trim(),
                pincode: addressForm.pincode.trim(),
                isDefault: addressForm.isDefault,
            };
            const isEditing = Boolean(editingAddressId);
            const path = isEditing ? `/auth/addresses/${editingAddressId}` : '/auth/addresses';
            const method = isEditing ? 'PATCH' : 'POST';

            const data = await apiRequest(path, {
                method,
                body: JSON.stringify(body),
            });
            setUser((prev: UserProfile | null) => (prev ? { ...prev, addresses: data.data.addresses as UserAddress[] } : prev));
            setAddressForm(EMPTY_ADDRESS_FORM);
            setEditingAddressId(null);
            setShowAddressForm(false);
            showToast(isEditing ? 'Address updated successfully.' : 'Address saved successfully.', 'success');
        } catch (err) {
            showToast(getErrorMessage(err, 'Failed to save address'), 'error');
        } finally {
            setAddressSaving(false);
        }
    };

    const autofillAddressFromGPS = async () => {
        setLocatingAddress(true);
        try {
            const detected = await getAddressFromCurrentLocation();
            const [firstName = '', ...rest] = (user?.name || '').trim().split(' ');
            const lastName = rest.join(' ');
            const inferredPhone = parseInternationalPhone(user?.phone || '');
            setAddressForm((prev) => ({
                ...prev,
                firstName: prev.firstName || firstName,
                lastName: prev.lastName || lastName,
                countryCode: prev.phone ? prev.countryCode : inferredPhone.countryCode,
                phone: prev.phone || inferredPhone.phone,
                addressLine1: detected.addressLine1 || prev.addressLine1,
                addressLine2: detected.addressLine2 || prev.addressLine2,
                state: detected.state || prev.state,
                city: detected.city || prev.city,
                district: prev.district,
                pincode: detected.pincode || prev.pincode,
            }));
            showToast('Address fields filled from your current location.', 'success');
        } catch (err) {
            showToast(getErrorMessage(err, 'Unable to fetch your current location.'), 'error');
        } finally {
            setLocatingAddress(false);
        }
    };

    const deleteAddress = async (id: string) => {
        if (deletingAddressId) return;
        setDeletingAddressId(id);
        try {
            const data = await apiRequest(`/auth/addresses/${id}`, { method: 'DELETE' });
            setUser((prev: UserProfile | null) => (prev ? { ...prev, addresses: data.data.addresses as UserAddress[] } : prev));
        } catch (err) {
            showToast(getErrorMessage(err, 'Failed to remove address'), 'error');
        } finally {
            setDeletingAddressId(null);
        }
    };

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    const [showAddressForm, setShowAddressForm] = useState(false);
    const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const startAddressEdit = (addr: UserAddress) => {
        if (!addr._id) {
            showToast('This address cannot be edited right now.', 'error');
            return;
        }

        const parts = (addr.fullName || '').trim().split(/\s+/).filter(Boolean);
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ');
        const parsedPhone = parseInternationalPhone(addr.phone || '');
        const { district, line2WithoutDistrict } = extractDistrictFromAddressLine2(addr.addressLine2 || '');

        setAddressForm({
            label: addr.label || 'Home',
            countryCode: parsedPhone.countryCode,
            firstName,
            lastName,
            phone: parsedPhone.phone,
            addressLine1: addr.addressLine1 || '',
            addressLine2: line2WithoutDistrict,
            city: addr.city || '',
            state: addr.state || '',
            district: district,
            pincode: addr.pincode || '',
            isDefault: Boolean(addr.isDefault),
        });
        setEditingAddressId(addr._id);
        setPendingDeleteId(null);
        setShowAddressForm(true);
    };

    const resetAddressFormState = () => {
        setAddressForm(EMPTY_ADDRESS_FORM);
        setEditingAddressId(null);
        setShowAddressForm(false);
    };

    useEffect(() => {
        if (!showAddressForm) return;
        const [firstName = '', ...rest] = (user?.name || '').trim().split(' ');
        const lastName = rest.join(' ');
        const inferredPhone = parseInternationalPhone(user?.phone || '');
        setAddressForm((prev) => ({
            ...prev,
            firstName: prev.firstName || firstName,
            lastName: prev.lastName || lastName,
            countryCode: prev.phone ? prev.countryCode : inferredPhone.countryCode,
            phone: prev.phone || inferredPhone.phone,
        }));
    }, [showAddressForm, user?.name, user?.phone]);

    useEffect(() => {
        const parsed = parseInternationalPhone(user?.phone || '');
        setProfilePhoneCountryCode(parsed.countryCode);
        setProfilePhone(parsed.phone);
    }, [user?.phone]);

    const tabs = [
        { key: 'info', label: 'Profile', icon: 'user' },
        { key: 'password', label: 'Password', icon: 'lock' },
        { key: 'addresses', label: 'Addresses', icon: 'mapPin' },
        { key: 'orders', label: 'Orders', icon: 'package' },
    ] as const;

    const handleTabKeyDown = (index: number, event: ReactKeyboardEvent<HTMLButtonElement>) => {
        const totalTabs = tabs.length;
        let nextIndex = index;

        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
            event.preventDefault();
            nextIndex = (index + 1) % totalTabs;
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
            event.preventDefault();
            nextIndex = (index - 1 + totalTabs) % totalTabs;
        } else if (event.key === 'Home') {
            event.preventDefault();
            nextIndex = 0;
        } else if (event.key === 'End') {
            event.preventDefault();
            nextIndex = totalTabs - 1;
        } else {
            return;
        }

        setActiveTab(tabs[nextIndex].key);
        tabRefs.current[nextIndex]?.focus();
    };

    const formatOrderDate = (value: string) => {
        try {
            return new Date(value).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            });
        } catch {
            return value;
        }
    };

    if (!isAuthenticated) {
        return (
            <Layout>
                <div className="container section">
                    <EmptyState icon="user" iconSize="lg" title="Please sign in" message="Sign in to access your orders, addresses, and account settings." actionLabel="Sign In" onAction={openAuthModal} />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="page-hero page-hero--compact">
                <div className="container">
                    <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link> <span>/</span> <span>My Account</span></nav>
                    <p className="overline">Account Center</p>
                    <h1>My Account</h1>
                    <p>Manage your profile, addresses, password, and orders in one place.</p>
                </div>
            </div>

            <div className="container section">
                <div className="profile">
                    <aside className="profile__sidebar">
                        <div className="profile__avatar">{(user?.name?.charAt(0) || 'U').toUpperCase()}</div>
                        <div className="profile__name">{user?.name || 'Guest User'}</div>
                        <div className="profile__email">{user?.email || 'No email'}</div>

                        <nav className="profile__nav" role="tablist" aria-orientation="vertical" aria-label="Profile sections">
                            {tabs.map((tab, index) => (
                                <button
                                    key={tab.key}
                                    ref={(el) => { tabRefs.current[index] = el; }}
                                    id={`profile-tab-${tab.key}`}
                                    role="tab"
                                    aria-controls={`profile-panel-${tab.key}`}
                                    aria-selected={activeTab === tab.key}
                                    tabIndex={activeTab === tab.key ? 0 : -1}
                                    className={`profile__nav-item ${activeTab === tab.key ? 'active' : ''}`}
                                    data-tab={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    onKeyDown={(event) => handleTabKeyDown(index, event)}
                                >
                                    <span className="profile__icon"><AppIcon name={tab.icon} size={16} aria-hidden /></span>
                                    <span>{tab.label}</span>
                                </button>
                            ))}

                            {isAdmin && (
                                <Link href="/admin" className="profile__nav-item">
                                    <span className="profile__icon"><AppIcon name="barChart" size={16} aria-hidden /></span>
                                    <span>Admin Dashboard</span>
                                </Link>
                            )}
                        </nav>

                        <button className="profile__logout" onClick={handleLogout} id="profileLogout"><AppIcon name="logout" size={16} aria-hidden />Logout</button>
                    </aside>

                    <div className="profile__main">
                        {/* Profile Info */}
                        <div
                            id="profile-panel-info"
                            role="tabpanel"
                            aria-labelledby="profile-tab-info"
                            className={`profile__tab ${activeTab === 'info' ? 'active' : ''}`}
                            hidden={activeTab !== 'info'}
                        >
                                <h2 className="profile__section-title">Profile Information</h2>
                                <form id="profileForm" onSubmit={handleProfileUpdate} className="profile__form profile__card">
                                    <div className="profile__field">
                                        <label htmlFor="profileName">Full Name</label>
                                        <input id="profileName" type="text" name="profileName" defaultValue={user?.name || ''} />
                                    </div>
                                    <div className="profile__field">
                                        <label htmlFor="profileEmail">Email</label>
                                        <input
                                            id="profileEmail"
                                            type="email"
                                            name="profileEmail"
                                            defaultValue={user?.email || ''}
                                            onBlur={(e) => { void handleProfileEmailBlur(e.currentTarget.value); }}
                                        />
                                    </div>
                                    {profileEmailChecking && <div className="profile__hint">Verifying email address...</div>}
                                    <div className="profile__field">
                                        <label htmlFor="profilePhone">Phone</label>
                                        <div className="profile__phone-group">
                                            <select
                                                id="profilePhoneCountryCode"
                                                name="profilePhoneCountryCode"
                                                value={profilePhoneCountryCode}
                                                onChange={(e) => {
                                                    const selected = getCountryPhoneOption(e.target.value);
                                                    setProfilePhoneCountryCode(selected.code);
                                                    setProfilePhone((prev) => prev.replace(/\D/g, '').slice(0, selected.maxDigits));
                                                }}
                                            >
                                                {COUNTRY_PHONE_OPTIONS.map((entry, index) => (
                                                    <option key={`${entry.code}-${entry.label}-${index}`} value={entry.code}>{entry.label} ({entry.code})</option>
                                                ))}
                                            </select>
                                            <input
                                                id="profilePhone"
                                                type="tel"
                                                name="profilePhone"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                minLength={getCountryPhoneOption(profilePhoneCountryCode).minDigits}
                                                maxLength={getCountryPhoneOption(profilePhoneCountryCode).maxDigits}
                                                placeholder={formatCountryPhoneHint(getCountryPhoneOption(profilePhoneCountryCode))}
                                                value={profilePhone}
                                                onChange={(e) => setProfilePhone(e.target.value.replace(/\D/g, '').slice(0, getCountryPhoneOption(profilePhoneCountryCode).maxDigits))}
                                            />
                                        </div>
                                        <small className="profile__hint">Choose a country code and enter {formatCountryPhoneHint(getCountryPhoneOption(profilePhoneCountryCode))}.</small>
                                    </div>
                                    <div className="profile__field">
                                        <label htmlFor="profileCurrentPassword">Current Password <span className="profile__hint">(required to change email)</span></label>
                                        <input id="profileCurrentPassword" type="password" name="profileCurrentPassword" placeholder="Enter only if changing email" />
                                    </div>
                                    {profileMsg.text && <div role="status" aria-live="polite" className={`profile__msg ${profileMsg.type}`}>{profileMsg.text}</div>}
                                    <div className="profile__form-actions">
                                        <button type="submit" className="btn btn--primary" disabled={profileSaving} aria-busy={profileSaving}>{profileSaving ? 'Saving...' : 'Save Changes'}</button>
                                    </div>
                                </form>
                        </div>

                        {/* Password */}
                        <div
                            id="profile-panel-password"
                            role="tabpanel"
                            aria-labelledby="profile-tab-password"
                            className={`profile__tab ${activeTab === 'password' ? 'active' : ''}`}
                            hidden={activeTab !== 'password'}
                        >
                                <h2 className="profile__section-title">Change Password</h2>
                                <form id="passwordForm" onSubmit={handlePasswordChange} className="profile__form profile__card">
                                    <div className="profile__field">
                                        <label htmlFor="currentPassword">Current Password</label>
                                        <input id="currentPassword" type="password" name="currentPassword" required />
                                    </div>
                                    <div className="profile__field">
                                        <label htmlFor="newPassword">New Password</label>
                                        <input id="newPassword" type="password" name="newPassword" required minLength={8} />
                                        <small className="profile__hint">Use 8+ chars with uppercase, lowercase, number, and special character.</small>
                                    </div>
                                    <div className="profile__field">
                                        <label htmlFor="confirmPassword">Confirm New Password</label>
                                        <input id="confirmPassword" type="password" name="confirmPassword" required minLength={8} />
                                    </div>
                                    {passwordMsg.text && <div role="status" aria-live="polite" className={`profile__msg ${passwordMsg.type}`}>{passwordMsg.text}</div>}
                                    <div className="profile__form-actions">
                                        <button type="submit" className="btn btn--primary" disabled={passwordSaving} aria-busy={passwordSaving}>{passwordSaving ? 'Updating...' : 'Update Password'}</button>
                                    </div>
                                </form>
                        </div>

                        {/* Addresses */}
                        <div
                            id="profile-panel-addresses"
                            role="tabpanel"
                            aria-labelledby="profile-tab-addresses"
                            className={`profile__tab ${activeTab === 'addresses' ? 'active' : ''}`}
                            hidden={activeTab !== 'addresses'}
                        >
                                <div className="profile__section-header">
                                    <h2 className="profile__section-title">Saved Addresses</h2>
                                    <button
                                        type="button"
                                        className="btn btn--primary btn--sm"
                                        onClick={() => {
                                            setEditingAddressId(null);
                                            setAddressForm(EMPTY_ADDRESS_FORM);
                                            setShowAddressForm((prev) => !prev);
                                        }}
                                        id="addAddressBtn"
                                    >
                                        + Add Address
                                    </button>
                                </div>

                                {showAddressForm && (
                                    <div className="profile__address-form">
                                        <div className="profile__address-head">
                                            <h4>{editingAddressId ? 'Edit Address' : 'Add New Address'}</h4>
                                            <button type="button" className="btn btn--ghost btn--sm" onClick={autofillAddressFromGPS} disabled={locatingAddress || addressSaving}>
                                                {locatingAddress ? 'Locating...' : 'Use Current Location'}
                                            </button>
                                        </div>
                                        <form id="addressForm" onSubmit={handleSaveAddress} className="profile__form">
                                            <AddressFormFields 
                                                address={addressForm} 
                                                onChange={setAddressForm} 
                                                idPrefix="addr" 
                                                showDefaultCheckbox={true} 
                                            />
                                            <div className="profile__form-actions" style={{ marginTop: '16px' }}>
                                                <button type="button" className="btn btn--ghost btn--sm" onClick={resetAddressFormState} disabled={addressSaving}>{editingAddressId ? 'Cancel Edit' : 'Cancel'}</button>
                                                <button type="submit" className="btn btn--primary btn--sm" disabled={addressSaving} aria-busy={addressSaving}>{addressSaving ? 'Saving...' : (editingAddressId ? 'Update Address' : 'Save Address')}</button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                <div id="addressList" className="profile__addresses">
                                    {(user?.addresses || []).length === 0 ? (
                                        <p className="profile__empty">No saved addresses yet.</p>
                                    ) : (
                                        (user?.addresses ?? []).map((addr: UserAddress, i: number) => (
                                            <div key={addr._id || i} className={`address-card ${addr.isDefault ? 'default' : ''}`}>
                                                <div>
                                                    <div>
                                                        <span className="address-card__label">{addr.label}</span>
                                                        {addr.isDefault && <span className="address-card__default">Default</span>}
                                                    </div>
                                                    <div className="address-card__name">{addr.fullName}</div>
                                                    {(() => {
                                                        const { district, line2WithoutDistrict } = extractDistrictFromAddressLine2(addr.addressLine2 || '');
                                                        return (
                                                            <p className="address-card__text">
                                                                {addr.addressLine1}{line2WithoutDistrict && `, ${line2WithoutDistrict}`}
                                                                <br />
                                                                {addr.city}{district ? `, ${district}` : ''}, {addr.state} - {addr.pincode}
                                                                <br />
                                                                Phone: {addr.phone}
                                                            </p>
                                                        );
                                                    })()}
                                                </div>
                                                {pendingDeleteId === (addr._id || String(i)) ? (
                                                    <div className="address-card__actions">
                                                        <button type="button" className="address-card__btn address-card__btn--delete" onClick={() => { if (addr._id) deleteAddress(addr._id); setPendingDeleteId(null); }} disabled={deletingAddressId === addr._id}>{deletingAddressId === addr._id ? 'Removing...' : 'Confirm'}</button>
                                                        <button type="button" className="address-card__btn" onClick={() => setPendingDeleteId(null)} disabled={deletingAddressId === addr._id}>Cancel</button>
                                                    </div>
                                                ) : (
                                                    <div className="address-card__actions">
                                                        <button type="button" className="address-card__btn" onClick={() => startAddressEdit(addr)} disabled={Boolean(deletingAddressId)}>Edit</button>
                                                        <button type="button" className="address-card__btn address-card__btn--delete" onClick={() => setPendingDeleteId(addr._id || String(i))} disabled={Boolean(deletingAddressId)}>Remove</button>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                        </div>

                        {/* Orders */}
                        <div
                            id="profile-panel-orders"
                            role="tabpanel"
                            aria-labelledby="profile-tab-orders"
                            className={`profile__tab ${activeTab === 'orders' ? 'active' : ''}`}
                            hidden={activeTab !== 'orders'}
                        >
                                <h2 className="profile__section-title">Order History</h2>
                                {ordersLoading ? (
                                    <p className="profile__empty">Loading orders...</p>
                                ) : ordersError ? (
                                    <div className="profile__msg error" role="alert">{ordersError}</div>
                                ) : orders.length === 0 ? (
                                    <p className="profile__empty">No orders yet.</p>
                                ) : (
                                    <div>
                                        {orders.map((order: OrderSummary) => (
                                            <div key={order._id} className="order-card">
                                                <div className="order-card__header">
                                                    <div>
                                                        <div className="order-card__number">{order.orderNumber}</div>
                                                        <div className="order-card__date">{formatOrderDate(order.createdAt)}</div>
                                                    </div>
                                                    <span className={`order-status order-status--${order.status}`}>{order.status}</span>
                                                </div>
                                                <div className="order-card__items">{order.items?.length || 0} items</div>
                                                <div className="order-card__footer">
                                                    <div className="order-card__total">₹{order.total.toLocaleString('en-IN')}</div>
                                                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => router.push(`/profile/orders/${order._id}`)}>View Details →</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
