// frontend/lib/api.ts
// Centralized API client for the admin frontend.
// Security: Authentication uses HttpOnly cookies set by the backend.
// The JWT access token is NEVER stored in localStorage or sessionStorage.
// Only non-sensitive user display info (id, email, role, tenantId) is stored in sessionStorage.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  isFormData?: boolean;
}

class ApiError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

/**
 * User display info (non-sensitive). Stored in sessionStorage for UI rendering.
 * The actual auth token is in an HttpOnly cookie — NOT accessible from JS.
 */
export function getStoredUser(): { id: string; email: string; role: string; tenantId: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem('auth_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: { id: string; email: string; role: string; tenantId: string }) {
  // Safe to store non-sensitive display info in sessionStorage
  sessionStorage.setItem('auth_user', JSON.stringify(user));
}

export function clearStoredUser() {
  sessionStorage.removeItem('auth_user');
}

async function request<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, isFormData = false } = options;

  const reqHeaders: Record<string, string> = {
    ...headers,
  };

  if (!isFormData && body) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: reqHeaders,
    // credentials: 'include' sends the HttpOnly cookie on every request automatically
    credentials: 'include',
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `Request failed: ${res.statusText}`;
    try {
      const errorData = await res.json();
      message = errorData.message || errorData.error || message;
    } catch {
      // Use default message
    }
    throw new ApiError(message, res.status);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as any;
  }

  return res.json();
}

// --- Auth ---
export const authApi = {
  login: (tenantId: string, email: string, password: string) =>
    request<{ user: { id: string; email: string; role: string; tenantId: string } }>(
      '/auth/login',
      { method: 'POST', body: { tenantId, email, password } }
    ),

  register: (tenantId: string, email: string, password: string) =>
    request<{ user: { id: string; email: string; role: string; tenantId: string } }>(
      '/auth/register',
      { method: 'POST', body: { tenantId, email, password } }
    ),

  logout: () =>
    request('/auth/logout', { method: 'POST' }),

  me: () =>
    request<{ id: string; tenantId: string; role: string }>('/auth/me'),
};

// --- Tenants ---
export const tenantsApi = {
  getMe: () => request('/tenants/me'),
  updateMe: (data: { name?: string; domain?: string; brandingConfig?: Record<string, any> }) =>
    request('/tenants/me', { method: 'PUT', body: data }),
};

// --- Super Admin ---
export const superAdminApi = {
  listTenants: () => request('/super-admin/tenants'),
  createTenant: (data: { name: string; domain?: string }) =>
    request('/super-admin/tenants', { method: 'POST', body: data }),
  deleteTenant: (id: string) =>
    request(`/super-admin/tenants/${id}`, { method: 'DELETE' }),
};

// --- Chat ---
export const chatApi = {
  listConversations: () => request('/chat/conversations'),
  getMessages: (conversationId: string) =>
    request(`/chat/conversations/${conversationId}/messages`),
};

// --- Knowledge ---
export const knowledgeApi = {
  listBases: () => request('/knowledge/bases'),
  createBase: (data: { name: string; description?: string }) =>
    request('/knowledge/bases', { method: 'POST', body: data }),
  listDocuments: (baseId: string) =>
    request(`/knowledge/bases/${baseId}/documents`),
  upload: (knowledgeBaseId: string, file: File) => {
    const formData = new FormData();
    formData.append('knowledgeBaseId', knowledgeBaseId);
    formData.append('file', file);
    return request('/knowledge/upload', { method: 'POST', body: formData, isFormData: true });
  },
};

// --- Analytics ---
export const analyticsApi = {
  getMetrics: () => request('/analytics/metrics'),
};
