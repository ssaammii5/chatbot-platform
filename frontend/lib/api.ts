// frontend/lib/api.ts
// Centralized API client for the admin frontend.
// All requests go through this module for consistent auth and error handling.

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

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  // Token is stored in memory/sessionStorage for this session
  return sessionStorage.getItem('auth_token');
}

export function setToken(token: string) {
  sessionStorage.setItem('auth_token', token);
}

export function clearToken() {
  sessionStorage.removeItem('auth_token');
  sessionStorage.removeItem('auth_user');
}

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
  sessionStorage.setItem('auth_user', JSON.stringify(user));
}

async function request<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, isFormData = false } = options;
  const token = getToken();

  const reqHeaders: Record<string, string> = {
    ...headers,
  };

  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  if (!isFormData && body) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: reqHeaders,
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
    request('/auth/login', { method: 'POST', body: { tenantId, email, password } }),

  register: (tenantId: string, email: string, password: string) =>
    request('/auth/register', { method: 'POST', body: { tenantId, email, password } }),

  logout: () =>
    request('/auth/logout', { method: 'POST' }),
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
