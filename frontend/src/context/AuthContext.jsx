import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { PERMISSIONS } from '@/data/constants';
import { authAPI } from '@/services/api';

const AuthContext = createContext(null);

/**
 * Normalize a backend profile into the shape used across the frontend.
 */
function normalizeUser(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    name: profile.full_name || profile.name || 'Utilizator',
    role: profile.role,
    avatar: profile.avatar_initials || (profile.full_name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
    email: profile.email || '',
    status: profile.status,
    organization: profile.department || '',  // org name stored in department
    phone: profile.phone || '',
    bio: profile.bio || '',
    created_at: profile.created_at || '',
    last_login_at: profile.last_login_at || '',
  };
}

export function AuthProvider({ children }) {
  // Try to restore from localStorage on mount
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('civiup_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('civiup_token'));
  const [loading, setLoading] = useState(true);

  // On mount, verify the stored token is still valid
  useEffect(() => {
    const token = localStorage.getItem('civiup_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authAPI.me()
      .then((profile) => {
        const u = normalizeUser(profile);
        setUser(u);
        setIsAuthenticated(true);
        localStorage.setItem('civiup_user', JSON.stringify(u));
      })
      .catch(() => {
        // Token expired or invalid
        localStorage.removeItem('civiup_token');
        localStorage.removeItem('civiup_refresh_token');
        localStorage.removeItem('civiup_user');
        setUser(null);
        setIsAuthenticated(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const data = await authAPI.login(email, password);
      // Store tokens
      localStorage.setItem('civiup_token', data.access_token);
      localStorage.setItem('civiup_refresh_token', data.refresh_token);
      // Normalize and store user
      const u = normalizeUser(data.user);
      localStorage.setItem('civiup_user', JSON.stringify(u));
      setUser(u);
      setIsAuthenticated(true);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Email sau parolă incorectă.' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // best-effort
    }
    localStorage.removeItem('civiup_token');
    localStorage.removeItem('civiup_refresh_token');
    localStorage.removeItem('civiup_user');
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const updateCurrentUser = useCallback((profile) => {
    const next = normalizeUser(profile);
    setUser(next);
    localStorage.setItem('civiup_user', JSON.stringify(next));
  }, []);

  const hasPermission = useCallback(
    (module) => {
      if (!user) return false;
      const allowed = PERMISSIONS[module];
      if (!allowed) return false;
      return allowed.includes(user.role);
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      loading,
      login,
      logout,
      updateCurrentUser,
      hasPermission,
    }),
    [user, isAuthenticated, loading, login, logout, updateCurrentUser, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
