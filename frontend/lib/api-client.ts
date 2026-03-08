const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || 'API request failed');
    }

    return response.json();
}

export const apiClient = {
    get: (endpoint: string) => apiFetch(endpoint, { method: 'GET' }),
    post: (endpoint: string, data: any) => apiFetch(endpoint, { method: 'POST', body: JSON.stringify(data) }),
    delete: (endpoint: string) => apiFetch(endpoint, { method: 'DELETE' }),
};
