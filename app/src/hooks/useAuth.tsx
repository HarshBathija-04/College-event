/**
 * Authentication Context and Hook
 * Manages user authentication state
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type {  User, LoginCredentials, RegisterData, AuthTokens, AuthContextType  } from '@/types';
import { authApi, apiClient } from '@/lib/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'cea_auth';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored auth on mount
  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const { user, tokens } = JSON.parse(stored);
        setUser(user);
        apiClient.setAccessToken(tokens.accessToken);
      } catch (error) {
        console.error('Failed to parse stored auth:', error);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  // Store auth data when it changes
  const storeAuth = (user: User, tokens: AuthTokens) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, tokens }));
    setUser(user);
    apiClient.setAccessToken(tokens.accessToken);
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authApi.login(credentials);
      if (response.success && response.data) {
        storeAuth(response.data.user, response.data.tokens);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await authApi.register(data);
      if (response.success && response.data) {
        storeAuth(response.data.user, response.data.tokens);
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    apiClient.setAccessToken(null);
    authApi.logout().catch(() => {}); // Ignore logout errors
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const auth = JSON.parse(stored);
      auth.user = updatedUser;
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;