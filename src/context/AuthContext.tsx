import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, ApiError } from '../lib/api';
import type { ClinicRole } from '../lib/role-config';

export interface SafeUser {
  id: string;
  username: string;
  name: string; // added for UI compatibility
  role: ClinicRole;
  staffId?: string;
  staff?: {
    id: string;
    name: string;
  };
}

interface AuthContextType {
  currentUser: SafeUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password?: string) => Promise<{ success: boolean; error?: string; user?: SafeUser }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    async function restoreSession() {
      try {
        const data = await api.get<{ user: SafeUser }>('/api/auth/me');
        const userWithUiName = { ...data.user, name: data.user.staff?.name || data.user.username };
        setCurrentUser(userWithUiName);
      } catch (err) {
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  // Make sure no localStorage auth remains
  useEffect(() => {
    localStorage.removeItem('dc_v2_user');
  }, []);

  const login = async (username: string, password?: string) => {
    try {
      const data = await api.post<{ message: string, user: SafeUser }>('/api/auth/login', { username, password });
      const userWithUiName = { ...data.user, name: data.user.staff?.name || data.user.username };
      setCurrentUser(userWithUiName);
      return { success: true, user: userWithUiName };
    } catch (err) {
      if (err instanceof ApiError) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network Error' };
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error', err);
    }
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAuthenticated: !!currentUser,
      isLoading,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
