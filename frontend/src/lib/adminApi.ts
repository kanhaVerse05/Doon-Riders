export function getApiBase(): string {
  // 1. In browser environment, always use same-origin relative '/api'
  // Next.js automatically rewrites/proxies this to the backend server
  if (typeof window !== 'undefined') {
    return '/api';
  }

  // 2. Server-side default for SSR / SSG
  const serverBackend = process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_URL || 'https://doon-riders-backend.onrender.com';
  return `${serverBackend.replace(/\/+$/, '')}/api`;
}

export const adminApi = {
  async request(endpoint: string, options: RequestInit = {}) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('dr_admin_token') : null;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}${endpoint}`, {
        ...options,
        headers
      });

      const data = await res.json().catch(() => ({
        success: false,
        message: res.status === 413
          ? 'Image or payload is too large for the server. Please upload an image under 10MB.'
          : (res.statusText ? `Error (${res.status}): ${res.statusText}` : 'Invalid response from server')
      }));
      
      if (!res.ok) {
        if (res.status === 401 && typeof window !== 'undefined') {
          const errMsg = (data?.message || '').toLowerCase();
          const isTokenProblem = errMsg.includes('jwt') || errMsg.includes('token') || errMsg.includes('expired') || errMsg.includes('auth');

          if (isTokenProblem) {
            console.warn('[adminApi] 401 Unauthorized / Token Expired:', data?.message);
            localStorage.removeItem('dr_admin_token');
            localStorage.removeItem('dr_admin_user');

            if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
              window.location.href = '/admin/login?session_expired=1';
            }
          }
        }
        if (res.status === 413) {
          return {
            success: false,
            message: data?.message || 'Image or payload is too large for the server. Please upload an image under 10MB.'
          };
        }
        return data || { success: false, message: `Error HTTP ${res.status}` };
      }

      return data;
    } catch (err: any) {
      console.warn(`[adminApi] Network notice for ${endpoint}:`, err.message);
      return { success: false, message: err.message, networkError: true };
    }
  },

  get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint: string, body: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  patch(endpoint: string, body: any) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  },

  put(endpoint: string, body: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};
