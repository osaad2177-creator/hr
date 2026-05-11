'use client';
// ============================================================
// Auth Context - Global authentication state
// ============================================================
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { subscribeToAuthChanges } from '@/lib/firebase/auth';
import { getUserById } from '@/lib/firebase/firestore';
import { User } from '@/lib/types/index';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  user: null,
  loading: true,
  refreshUser: async () => {},
  isAdmin: false,
  isManager: false,
  isEmployee: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (firebaseUser) {
      const userData = await getUserById(firebaseUser.uid);
      setUser(userData);
    }
  }, [firebaseUser]);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const userData = await getUserById(fbUser.uid);
          setUser(userData);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    firebaseUser,
    user,
    loading,
    refreshUser,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isEmployee: user?.role === 'employee',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
