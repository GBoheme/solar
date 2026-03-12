/**
 * Simple fetch wrapper with JSON Content-Type defaults.
 */

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);

    if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    return fetch(input, { ...init, headers });
}

/**
 * Convenience: apiFetch that auto-parses JSON and throws on error
 */
export async function apiJson<T = any>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
    const res = await apiFetch(input, init);
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data as T;
}
