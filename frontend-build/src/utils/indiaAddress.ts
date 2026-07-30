import sourceMap from '../data/indiaStateCityDistrictMap.json';

type StateCityDistrictMap = Record<string, Record<string, string[]>>;

export const STATE_CITY_DISTRICT_MAP: StateCityDistrictMap = sourceMap as StateCityDistrictMap;

const STATE_KEY_ALIASES: Record<string, string> = {
    'andaman & nicobar islands': 'Andaman and Nicobar Islands',
    'chattisgarh': 'Chhattisgarh',
    'dadra and nagar haveli and daman and diu': 'Dadra and Nagar Haveli',
    'nct of delhi': 'Delhi',
    'pondicherry': 'Puducherry',
};

export const INDIAN_STATES = Object.keys(STATE_CITY_DISTRICT_MAP);

function normalizeLocationKey(value: string): string {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/\s+/g, ' ');
}

function resolveStateKey(state: string): string {
    const normalized = normalizeLocationKey(state);
    if (!normalized) return '';

    const aliased = STATE_KEY_ALIASES[normalized] || state;
    if (STATE_CITY_DISTRICT_MAP[aliased]) return aliased;

    const matched = INDIAN_STATES.find((entry) => normalizeLocationKey(entry) === normalizeLocationKey(aliased));
    return matched || '';
}

function resolveCityKey(stateKey: string, city: string): string {
    const cities = Object.keys(STATE_CITY_DISTRICT_MAP[stateKey] || {});
    const normalizedCity = normalizeLocationKey(city);
    if (!normalizedCity) return '';

    const exact = cities.find((entry) => normalizeLocationKey(entry) === normalizedCity);
    return exact || '';
}

export function getCitiesForState(state: string): string[] {
    const stateKey = resolveStateKey(state);
    if (!stateKey) return [];
    return Object.keys(STATE_CITY_DISTRICT_MAP[stateKey] || {});
}

export function getDistrictsForCity(state: string, city: string): string[] {
    const stateKey = resolveStateKey(state);
    if (!stateKey) return [];

    const cityKey = resolveCityKey(stateKey, city);
    if (!cityKey) return [];

    return STATE_CITY_DISTRICT_MAP[stateKey]?.[cityKey] || [];
}

export function extractDistrictFromAddressLine2(line2: string): { district: string; line2WithoutDistrict: string } {
    const raw = String(line2 || '').trim();
    if (!raw) return { district: '', line2WithoutDistrict: '' };

    const parts = raw
        .split('|')
        .map((part) => part.trim())
        .filter(Boolean);

    let district = '';
    const cleanedParts = parts.filter((part) => {
        const match = part.match(/^district\s*:\s*(.+)$/i);
        if (match) {
            district = match[1]?.trim() || '';
            return false;
        }
        return true;
    });

    return {
        district,
        line2WithoutDistrict: cleanedParts.join(' | ').trim(),
    };
}

export function composeAddressLine2(line2: string, district: string): string {
    const base = String(line2 || '').trim();
    const districtValue = String(district || '').trim();
    if (!districtValue) return base;
    return base ? `${base} | District: ${districtValue}` : `District: ${districtValue}`;
}
