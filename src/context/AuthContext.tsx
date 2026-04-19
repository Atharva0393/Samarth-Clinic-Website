import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authService } from '../lib/api';
import type { AuthUser, UserRole } from '../lib/api';


// ─────────────────────────────────────────────
// Context Shape
// ─────────────────────────────────────────────
interface AuthContextType {
  user:            AuthUser | null;
  isAuthenticated: boolean;
  isLoading:       boolean;
  login:           (email: string, password: string) => Promise<AuthUser>;
  logout:          () => void;
  hasRole:         (...roles: UserRole[]) => boolean;
  hasPermission:   (permission: string)   => boolean;
  isAdmin:         boolean;
  isDentist:       boolean;
  isReceptionist:  boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    if (authService.isAuthenticated()) {
      setUser(authService.getUser());
    } else {
      // Stale/expired token — clean up silently
      authService.logout(false);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const loggedInUser = await authService.login(email, password);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = () => {
    authService.logout(false);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    hasRole:         (...roles) => authService.hasRole(...roles),
    hasPermission:   (p)        => authService.hasPermission(p),
    isAdmin:         user?.role === 'super_admin',
    isDentist:       user?.role === 'dentist' || user?.role === 'super_admin',
    isReceptionist:  user?.role === 'receptionist' || user?.role === 'super_admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
