const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

/**
 * Retrieves the stored JWT access token safely.
 * On the client (Client Components), it reads from localStorage.
 * On the server (Server Actions/SSR), it reads the HttpOnly cookie.
 */
async function getToken(): Promise<string | null> {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('access_token');
    }
    // Server-side
    try {
        const { cookies } = await import('next/headers');
        const cookieStore = cookies();
        return cookieStore.get('access_token')?.value || null;
    } catch (e) {
        return null;
    }
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
    const token = await getToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || 'API request failed');
    }

    return response.json();
}

export const apiClient = {
    get:    (endpoint: string)              => apiFetch(endpoint, { method: 'GET' }),
    post:   (endpoint: string, data: any)  => apiFetch(endpoint, { method: 'POST',   body: JSON.stringify(data) }),
    put:    (endpoint: string, data: any)  => apiFetch(endpoint, { method: 'PUT',    body: JSON.stringify(data) }),
    delete: (endpoint: string)             => apiFetch(endpoint, { method: 'DELETE' }),
};
