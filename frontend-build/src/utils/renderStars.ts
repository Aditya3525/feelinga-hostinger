/**
 * Returns a star string for a given rating (e.g. 4 → "★★★★☆").
 * @param count - Integer rating 0–5
 */
export function renderStars(count: number): string {
    const full = Math.min(Math.max(Math.round(count), 0), 5);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
}
