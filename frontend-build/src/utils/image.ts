const LOCAL_API_ORIGIN = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i;

export function resolveProductImageUrl(raw?: string | null, fallback = '/images/darjeeling-tea.png'): string {
    const value = String(raw || '').trim();
    if (!value) return fallback;

    const normalized = value.replace(/\\/g, '/');

    // Convert DB values like "uploads/products/x.jpg" into root-relative paths.
    if (normalized.startsWith('uploads/')) {
        return `/${normalized}`;
    }

    // Convert localhost API image links into proxied root-relative uploads.
    if (LOCAL_API_ORIGIN.test(normalized)) {
        const uploadIndex = normalized.indexOf('/uploads/');
        if (uploadIndex !== -1) {
            return normalized.slice(uploadIndex);
        }
    }

    // If the value already contains uploads path but without a leading slash.
    if (!normalized.startsWith('/') && normalized.includes('/uploads/')) {
        return normalized.slice(normalized.indexOf('/uploads/'));
    }

    return normalized;
}

export function resolveProductImageList(images?: string[] | null): string[] {
    if (!Array.isArray(images)) return [];
    return images
        .map((image) => resolveProductImageUrl(image, ''))
        .filter(Boolean);
}
