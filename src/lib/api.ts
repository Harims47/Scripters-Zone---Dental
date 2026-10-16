/**
 * Resolves the API base URL based on build mode and configuration.
 * - In production: defaults to '' (same-origin relative /api). If an external URL is explicitly
 *   provided, it is used, but localhost/127.0.0.1 is strictly prevented to avoid production leaks.
 * - In development: defaults to '' so Vite dev proxy handles requests to backend port 3001,
 *   or uses VITE_API_BASE_URL if explicitly configured.
 */
function getApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

  if (import.meta.env.PROD) {
    // In production, prevent accidental leakage of localhost / 127.0.0.1
    if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      return '';
    }
    return envUrl.replace(/\/$/, '');
  }

  // In development, return custom URL if set; otherwise relative '' (handled by Vite proxy)
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  return '';
}

export const API_BASE_URL = getApiBaseUrl();

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

export const api = {
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Ensure credentials are sent with every request for HTTP-only cookies
    const config: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      // Attempt to parse JSON response safely
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      }

      if (!response.ok) {
        // Return a clean application-level error
        const message = data?.error || response.statusText || 'An unexpected error occurred';
        throw new ApiError(response.status, message, data);
      }

      return data as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      // Handle network errors (e.g., backend down)
      throw new ApiError(500, 'Network Error: Unable to connect to the server');
    }
  },

  get<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  },

  async download(endpoint: string, filename: string) {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, { credentials: 'include' });
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }
};

export default api;

