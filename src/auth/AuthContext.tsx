import React, { createContext, useContext } from 'react';
import type { AuthStatus, AuthUser } from './types';

// Minimal typed authentication boundary. Real sign-in providers will later
// resolve `status`/`user` here; for now the app is guest-first and this value
// is a fixed guest snapshot with no session, storage, or network behavior.
type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  isAuthenticated: boolean;
};

const GUEST_VALUE: AuthContextValue = {
  status: 'guest',
  user: null,
  isAuthenticated: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthContext.Provider value={GUEST_VALUE}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
