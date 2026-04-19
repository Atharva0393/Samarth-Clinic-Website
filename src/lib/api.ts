// Auth API client — uses native fetch (no axios dependency needed)
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export type UserRole = 'super_admin' | 'dentist' | 'receptionist';

export interface AuthUser {
  id:             string;
  email:          string;
  role:           UserRole;
  first_name:     string;
  last_name:      string;
  phone?:         string;
  clinic_id:      string;
  clinic_name:    string;
  clinic_upi_id?: string;
  permissions:    string[];
}

// ─────────────────────────────────────────────
// Fetch helper — auto-injects auth header
// ─────────────────────────────────────────────
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = authService.getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    authService.logout(false);
    throw new Error(data.error || 'Unauthorized');
  }

  if (!res.ok) {
    throw { response: { data, status: res.status } };
  }

  return data as T;
}

export { apiFetch };

// ─────────────────────────────────────────────
// Auth Service
// ─────────────────────────────────────────────
const TOKEN_KEY = 'clinic_jwt';
const USER_KEY  = 'clinic_user';

export const authService = {
  async login(email: string, password: string): Promise<AuthUser> {
    const data = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body:   JSON.stringify({ email, password }),
    });
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data.user;
  },

  logout(redirect = true) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    if (redirect) window.location.href = '/';
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch { return false; }
  },

  hasRole(...roles: UserRole[]): boolean {
    const user = this.getUser();
    return user ? roles.includes(user.role) : false;
  },

  hasPermission(permission: string): boolean {
    const user = this.getUser();
    if (!user) return false;
    const [resource] = permission.split(':');
    return user.permissions?.some(p => p === permission || p === `${resource}:*`) ?? false;
  },

  isAdmin():        boolean { return this.hasRole('super_admin'); },
  isDentist():      boolean { return this.hasRole('dentist', 'super_admin'); },
  isReceptionist(): boolean { return this.hasRole('receptionist', 'super_admin'); },
};
