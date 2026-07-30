import React, { useMemo } from 'react';
import { getCitiesForState, getDistrictsForCity, INDIAN_STATES } from '../utils/indiaAddress';
import { COUNTRY_PHONE_OPTIONS, formatCountryPhoneHint, getCountryPhoneOption } from '../utils/phoneCountry';

export interface AddressData {
    label: string;
    firstName: string;
    lastName: string;
    phone: string;
    countryCode: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    district: string;
    state: string;
    pincode: string;
    isDefault?: boolean;
}

export const EMPTY_ADDRESS_FORM: AddressData = {
    label: 'Home',
    countryCode: '+91',
    firstName: '',
    lastName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    isDefault: false,
};

interface Props {
    address: AddressData;
    onChange: (address: AddressData) => void;
    idPrefix?: string;
    showDefaultCheckbox?: boolean;
    disabled?: boolean;
}

export default function AddressFormFields({ address, onChange, idPrefix = 'addr', showDefaultCheckbox = false, disabled = false }: Props) {
    const availableCities = useMemo(() => getCitiesForState(address.state), [address.state]);
    const availableDistricts = useMemo(() => getDistrictsForCity(address.state, address.city), [address.state, address.city]);
    const selectedCountry = getCountryPhoneOption(address.countryCode);

    const updateField = (field: keyof AddressData, value: string | boolean) => {
        onChange({ ...address, [field]: value });
    };

    return (
        <div className="address-form-grid" style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                <div className="checkout-field">
                    <label htmlFor={`${idPrefix}Label`} className="checkout-field-label">Label *</label>
                    <select
                        id={`${idPrefix}Label`}
                        className="checkout-form-control"
                        required
                        value={address.label}
                        onChange={(e) => updateField('label', e.target.value)}
                        disabled={disabled}
                    >
                        <option value="Home">Home</option>
                        <option value="Work">Work</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
            </div>

            <div className="address-form-row">
                <div className="checkout-field">
                    <label htmlFor={`${idPrefix}FirstName`} className="checkout-field-label">First Name *</label>
                    <input
                        id={`${idPrefix}FirstName`}
                        type="text"
                        className="checkout-form-control"
                        required
                        minLength={2}
                        value={address.firstName}
                        onChange={(e) => updateField('firstName', e.target.value)}
                        disabled={disabled}
                    />
                </div>
                <div className="checkout-field">
                    <label htmlFor={`${idPrefix}LastName`} className="checkout-field-label">Last Name *</label>
                    <input
                        id={`${idPrefix}LastName`}
                        type="text"
                        className="checkout-form-control"
                        required
                        minLength={2}
                        value={address.lastName}
                        onChange={(e) => updateField('lastName', e.target.value)}
                        disabled={disabled}
                    />
                </div>
            </div>

            <div className="checkout-field">
                <label htmlFor={`${idPrefix}Phone`} className="checkout-field-label">Phone *</label>
                <div className="address-form-phone">
                    <select
                        className="checkout-form-control"
                        style={{ width: 'auto', flexShrink: 0 }}
                        value={address.countryCode}
                        onChange={(e) => {
                            const option = getCountryPhoneOption(e.target.value);
                            onChange({
                                ...address,
                                countryCode: option.code,
                                phone: address.phone.replace(/\D/g, '').slice(0, option.maxDigits),
                            });
                        }}
                        disabled={disabled}
                    >
                        {COUNTRY_PHONE_OPTIONS.map((entry, idx) => (
                            <option key={`${entry.code}-${idx}`} value={entry.code}>{entry.label} ({entry.code})</option>
                        ))}
                    </select>
                    <input
                        id={`${idPrefix}Phone`}
                        type="tel"
                        className="checkout-form-control"
                        required
                        inputMode="numeric"
                        pattern="[0-9]*"
                        minLength={selectedCountry.minDigits}
                        maxLength={selectedCountry.maxDigits}
                        placeholder={formatCountryPhoneHint(selectedCountry)}
                        value={address.phone}
                        onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, selectedCountry.maxDigits))}
                        disabled={disabled}
                        style={{ flexGrow: 1 }}
                    />
                </div>
                <small className="profile__hint" style={{ marginTop: '4px', display: 'block' }}>Enter {formatCountryPhoneHint(selectedCountry)} for {selectedCountry.label}.</small>
            </div>

            <div className="checkout-field">
                <label htmlFor={`${idPrefix}Line1`} className="checkout-field-label">Address Line 1 *</label>
                <input
                    id={`${idPrefix}Line1`}
                    type="text"
                    className="checkout-form-control"
                    required
                    minLength={5}
                    value={address.addressLine1}
                    onChange={(e) => updateField('addressLine1', e.target.value)}
                    disabled={disabled}
                />
            </div>

            <div className="checkout-field">
                <label htmlFor={`${idPrefix}Line2`} className="checkout-field-label">Address Line 2</label>
                <input
                    id={`${idPrefix}Line2`}
                    type="text"
                    className="checkout-form-control"
                    value={address.addressLine2}
                    onChange={(e) => updateField('addressLine2', e.target.value)}
                    disabled={disabled}
                />
            </div>

            <div className="address-form-row">
                <div className="checkout-field">
                    <label htmlFor={`${idPrefix}State`} className="checkout-field-label">State *</label>
                    <select
                        id={`${idPrefix}State`}
                        className="checkout-form-control"
                        required
                        value={address.state}
                        onChange={(e) => onChange({ ...address, state: e.target.value, city: '', district: '' })}
                        disabled={disabled}
                    >
                        <option value="">Select state</option>
                        {INDIAN_STATES.map((stateName) => (
                            <option key={stateName} value={stateName}>{stateName}</option>
                        ))}
                        {address.state && !INDIAN_STATES.includes(address.state) && (
                            <option value={address.state}>{address.state}</option>
                        )}
                    </select>
                </div>
                <div className="checkout-field">
                    <label htmlFor={`${idPrefix}City`} className="checkout-field-label">City *</label>
                    <select
                        id={`${idPrefix}City`}
                        className="checkout-form-control"
                        required
                        value={address.city}
                        onChange={(e) => onChange({ ...address, city: e.target.value, district: '' })}
                        disabled={!address.state || disabled}
                    >
                        <option value="">Select city</option>
                        {availableCities.map((cityName) => (
                            <option key={cityName} value={cityName}>{cityName}</option>
                        ))}
                        {address.city && !availableCities.includes(address.city) && (
                            <option value={address.city}>{address.city}</option>
                        )}
                    </select>
                </div>
            </div>

            <div className="address-form-row">
                <div className="checkout-field">
                    <label htmlFor={`${idPrefix}District`} className="checkout-field-label">District *</label>
                    <select
                        id={`${idPrefix}District`}
                        className="checkout-form-control"
                        required
                        value={address.district}
                        onChange={(e) => updateField('district', e.target.value)}
                        disabled={!address.city || disabled}
                    >
                        <option value="">Select district</option>
                        {availableDistricts.map((districtName) => (
                            <option key={districtName} value={districtName}>{districtName}</option>
                        ))}
                        {address.district && !availableDistricts.includes(address.district) && (
                            <option value={address.district}>{address.district}</option>
                        )}
                    </select>
                </div>
                <div className="checkout-field">
                    <label htmlFor={`${idPrefix}Pincode`} className="checkout-field-label">Pincode *</label>
                    <input
                        id={`${idPrefix}Pincode`}
                        type="text"
                        className="checkout-form-control"
                        required
                        minLength={6}
                        maxLength={6}
                        pattern="[0-9]{6}"
                        inputMode="numeric"
                        value={address.pincode}
                        onChange={(e) => updateField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                        disabled={disabled}
                    />
                </div>
            </div>

            {showDefaultCheckbox && (
                <div className="checkout-field" style={{ marginTop: '8px' }}>
                    <label className="profile__checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={address.isDefault || false}
                            onChange={(e) => updateField('isDefault', e.target.checked)}
                            disabled={disabled}
                        />
                        <span style={{ fontSize: '0.9rem' }}>Set as default address</span>
                    </label>
                </div>
            )}
        </div>
    );
}
