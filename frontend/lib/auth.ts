import axios from 'axios';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface DecodedToken {
  id: string;
  email: string;
  role: 'super_admin' | 'dentist' | 'receptionist';
  clinic_id: string;
  first_name: string;
  last_name: string;
  exp: number;
}

export const authService = {
  async login(email: string, password: string): Promise<DecodedToken> {
    const response = await axios.post(`${API_URL}/api/auth/login`, { email, password });
    const { token } = response.data;

    if (!token) throw new Error('No token received from server.');

    // Store JWT in a secure, httpOnly-style cookie (client-set as fallback)
    Cookies.set('clinic_token', token, { expires: 1, secure: false, sameSite: 'Strict' });

    const decoded = jwtDecode<DecodedToken>(token);
    return decoded;
  },

  logout() {
    Cookies.remove('clinic_token');
    window.location.href = '/login';
  },

  getToken(): string | undefined {
    return Cookies.get('clinic_token');
  },

  getCurrentUser(): DecodedToken | null {
    const token = Cookies.get('clinic_token');
    if (!token) return null;

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      // Check expiry
      if (decoded.exp * 1000 < Date.now()) {
        Cookies.remove('clinic_token');
        return null;
      }
      return decoded;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  },

  hasRole(roles: DecodedToken['role'][]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  },
};

// Axios instance with auto-token injection
export const apiClient = axios.create({ baseURL: API_URL });

apiClient.interceptors.request.use((config) => {
  const token = authService.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      authService.logout();
    }
    return Promise.reject(error);
  }
);
