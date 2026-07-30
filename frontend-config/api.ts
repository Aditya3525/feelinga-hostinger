'use client';

/**
 * API client — simplified for Hostinger (same-origin PHP backend)
 * 
 * CHANGES from original (next-frontend/src/utils/api.ts):
 * 1. REMOVED: Multi-origin fallback (Render, Vercel proxy)
 * 2. REMOVED: Vercel hostname detection
 * 3. REMOVED: RETRYABLE_STATUS fallback chain
 * 4. KEPT: Token refresh (JWT via httpOnly cookies)
 * 5. KEPT: Retry logic for transient errors
 * 
 * The API lives on the same domain: /api/v1/...
 */

const GET_RETRY_COUNT = 4;
const RETRY_DELAY_MS = 1200;

function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getApiBase(): string {
    return '/api/v1';
}

async function fetchWithRetry(url: string, init: RequestInit, method: string): Promise<Response> {
    const retries = method === 'GET' ? GET_RETRY_COUNT : 0;
    let attempt = 0;

    while (true) {
        try {
            const response = await fetch(url, init);
            if (attempt < retries && [502, 503, 504].includes(response.status)) {
                attempt += 1;
                await wait(RETRY_DELAY_MS * attempt);
                continue;
            }
            return response;
        } catch (networkError) {
            if (attempt < retries) {
                attempt += 1;
                await wait(RETRY_DELAY_MS * attempt);
                continue;
            }
            throw new Error('Network error — please check your connection and try again.');
        }
    }
}

// Mutex: only one token refresh at a time
let refreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null;

async function doRefresh(apiBase: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('feelinga_refresh') : null;
    try {
        const res = await fetch(`${apiBase}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(refreshToken ? { refreshToken } : {}),
        });
        if (res.ok) {
            const data = await res.json();
            if (data?.data?.refreshToken) {
                localStorage.setItem('feelinga_refresh', data.data.refreshToken);
            }
            return data.data;
        }
    } catch (err) {
        console.warn('[Auth] Token refresh failed:', err instanceof Error ? err.message : 'Network error');
    }
    // Refresh failed
    localStorage.removeItem('feelinga_refresh');
    localStorage.removeItem('feelinga_user');
    return null;
}

export async function apiRequest(path: string, options: any = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const apiBase = getApiBase();
    const url = `${apiBase}${path}`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const requestInit = { ...options, headers, credentials: 'include' as const };
    let res = await fetchWithRetry(url, requestInit, method);

    // Auto-refresh on 401
    if (res.status === 401 && !path.startsWith('/auth/refresh')) {
        if (!refreshPromise) {
            refreshPromise = doRefresh(apiBase).finally(() => { refreshPromise = null; });
        }
        const tokens = await refreshPromise;
        if (tokens) {
            res = await fetchWithRetry(url, { ...options, headers, credentials: 'include' }, method);
        }
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        if ([502, 503, 504].includes(res.status)) {
            throw new Error('Server is waking up. Please try again in a few seconds.');
        }
        throw new Error(data.message || `Request failed (${res.status})`);
    }

    return data;
}
