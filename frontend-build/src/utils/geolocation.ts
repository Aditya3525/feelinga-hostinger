export type DetectedAddress = {
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    pincode: string;
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
    gpsTag: string;
};

type NominatimAddress = {
    house_number?: string;
    house_name?: string;
    building?: string;
    amenity?: string;
    road?: string;
    pedestrian?: string;
    footway?: string;
    cycleway?: string;
    path?: string;
    neighbourhood?: string;
    suburb?: string;
    quarter?: string;
    residential?: string;
    hamlet?: string;
    city?: string;
    town?: string;
    village?: string;
    borough?: string;
    municipality?: string;
    county?: string;
    city_district?: string;
    state_district?: string;
    state?: string;
    region?: string;
    country?: string;
    postcode?: string;
};

type NominatimResponse = {
    address?: NominatimAddress;
    name?: string;
    display_name?: string;
};

function cleanAddressText(raw: string): string {
    if (!raw) return '';

    return raw
        .normalize('NFKC')
        .replace(/\uFFFD/g, ' ')
        .replace(/[?]+/g, ' ')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
        .replace(/\s+,/g, ',')
        .replace(/,\s*,+/g, ', ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function pickFirst(address: NominatimAddress, keys: Array<keyof NominatimAddress>): string {
    for (const key of keys) {
        const value = address[key];
        if (typeof value === 'string') {
            const cleaned = cleanAddressText(value);
            if (cleaned) return cleaned;
        }
    }
    return '';
}

function normalizePincode(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    const match = digits.match(/\d{6}/);
    return match ? match[0] : digits.slice(0, 6);
}

function uniqueParts(values: string[]): string[] {
    const seen = new Set<string>();
    const output: string[] = [];

    values.forEach((value) => {
        const normalized = cleanAddressText(value);
        if (!normalized) return;
        const key = normalized.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        output.push(normalized);
    });

    return output;
}

export function mergeAddressLine2(existingLine2: string, detectedLine2: string, gpsTag: string): string {
    const normalizedParts = uniqueParts(
        [existingLine2, detectedLine2]
            .join(' | ')
            .split('|')
            .map((part) => part.trim())
            .filter((part) => part && !/^GPS\s*:/i.test(part))
    );

    return uniqueParts([...normalizedParts, gpsTag]).join(' | ');
}

function mapAddress(
    address: NominatimAddress,
    fallbackName?: string,
    displayName?: string
): Omit<DetectedAddress, 'latitude' | 'longitude' | 'accuracyMeters' | 'gpsTag'> {
    const houseNumber = pickFirst(address, ['house_number']);
    const buildingOrLandmark = pickFirst(address, ['house_name', 'building', 'amenity']);
    const road = pickFirst(address, ['road', 'pedestrian', 'footway', 'cycleway', 'path']);
    const locality = pickFirst(address, ['neighbourhood', 'suburb', 'quarter', 'residential', 'hamlet']);
    const city = pickFirst(address, ['city', 'town', 'village', 'borough', 'municipality', 'city_district', 'county']);
    const state = pickFirst(address, ['state', 'region', 'state_district']);
    const pincode = normalizePincode(pickFirst(address, ['postcode']));

    const line1Parts = uniqueParts([
        houseNumber,
        buildingOrLandmark,
        road || locality || fallbackName || '',
    ]);
    const line2Parts = uniqueParts([
        road && locality ? locality : locality,
        pickFirst(address, ['city_district', 'state_district']),
        pickFirst(address, ['country']),
    ]);

    if (line1Parts.length === 0 && displayName) {
        const firstSegment = cleanAddressText(displayName.split(',')[0] || '');
        if (firstSegment) line1Parts.push(firstSegment);
    }

    return {
        addressLine1: line1Parts.join(', '),
        addressLine2: line2Parts.join(', '),
        city,
        state,
        pincode,
    };
}

function getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !navigator.geolocation) {
            reject(new Error('Geolocation is not supported in this browser.'));
            return;
        }

        navigator.geolocation.getCurrentPosition(resolve, (error) => {
            if (error.code === error.PERMISSION_DENIED) {
                reject(new Error('Location permission denied. Please allow location access and try again.'));
                return;
            }
            if (error.code === error.TIMEOUT) {
                reject(new Error('Location request timed out. Please try again in an open area.'));
                return;
            }
            reject(new Error('Unable to get current GPS location.'));
        }, {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 0,
        });
    });
}

async function reverseGeocode(latitude: number, longitude: number): Promise<NominatimResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(latitude))}&lon=${encodeURIComponent(String(longitude))}&addressdetails=1&namedetails=1&accept-language=en`,
            {
                headers: {
                    Accept: 'application/json',
                },
                signal: controller.signal,
            }
        );

        if (!response.ok) {
            throw new Error('Could not translate your location into an address.');
        }

        return (await response.json()) as NominatimResponse;
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new Error('Address lookup timed out. Please try again.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function getAddressFromCurrentLocation(): Promise<DetectedAddress> {
    const position = await getCurrentPosition();
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    const data = await reverseGeocode(latitude, longitude);
    const mapped = mapAddress(data.address || {}, data.name, data.display_name);

    if (!mapped.addressLine1 || !mapped.city || !mapped.state) {
        throw new Error('Location found, but we could not detect a complete address. Please fill the remaining fields.');
    }

    const gpsTag = `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

    return {
        ...mapped,
        latitude,
        longitude,
        accuracyMeters: Number.isFinite(position.coords.accuracy) ? Math.round(position.coords.accuracy) : undefined,
        gpsTag,
    };
}
