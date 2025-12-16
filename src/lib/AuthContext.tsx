'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth, db } from './firebaseClient';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, sendEmailVerification, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface User {
  uid: string;
  username: string;
  email?: string | null;
  role?: 'admin' | 'user' | undefined;
}

interface AuthContextType {
  isLoggedIn: boolean;
  currentUser: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean }>;
  register: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'admin' | 'user' | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;
    
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (!isMounted) return;
        setFirebaseUser(u);
        
        if (u) {
          try {
            // upsert user profile for lookups (email/displayName)
            await setDoc(doc(db, 'users', u.uid), {
              email: u.email || null,
              displayName: u.displayName || (u.email || '')?.split('@')[0] || null,
              updatedAt: serverTimestamp(),
            }, { merge: true });
          } catch (err) {
            console.warn('Failed to update user profile:', err);
          }
          
          try {
            const ref = doc(db, 'users', u.uid);
            const snap = await getDoc(ref);
            if (!isMounted) return;
            const data = snap.exists() ? (snap.data() as any) : null;
            setRole((data?.role as 'admin' | 'user') || 'user');
          } catch (err) {
            console.warn('Failed to fetch user role:', err);
            if (!isMounted) return;
            setRole('user');
          }
        } else {
          setRole(undefined);
        }
        
        if (!isMounted) return;
        setLoading(false);
      } catch (err: any) {
        console.error('Auth state change error:', err);
        if (!isMounted) return;
        setLoading(false);
      }
    });
    
    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!cred.user.emailVerified) {
        try { await sendEmailVerification(cred.user); } catch {}
        await signOut(auth);
        return { success: false, requiresVerification: true };
      }
      return { success: true };
    } catch (error: any) {
      let message = 'ログインに失敗しました。';
      if (typeof error?.code === 'string') {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            message = 'メールアドレスまたはパスワードが正しくありません。';
            break;
          case 'auth/too-many-requests':
            message = 'ログイン試行が多すぎます。時間をおいて再度お試しください。';
            break;
        }
      }
      return { success: false, error: message };
    }
  };

  const register = async (email: string, password: string, displayName?: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
      try { await sendEmailVerification(cred.user); } catch {}
      await signOut(auth);
      return { success: true, requiresVerification: true };
    } catch (error: any) {
      let message = '登録に失敗しました。';
      if (typeof error?.code === 'string') {
        switch (error.code) {
          case 'auth/email-already-in-use':
            message = 'このメールアドレスはすでに登録されています。';
            break;
          case 'auth/invalid-email':
            message = '有効なメールアドレスを入力してください。';
            break;
          case 'auth/weak-password':
            message = 'パスワードが安全ではありません。別のパスワードをお試しください。';
            break;
        }
      }
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value: AuthContextType = useMemo(() => ({
    isLoggedIn: !!firebaseUser,
    currentUser: firebaseUser ? { uid: firebaseUser.uid, username: firebaseUser.displayName || (firebaseUser.email || '').split('@')[0], email: firebaseUser.email, role } : null,
    login,
    register,
    logout,
    isAdmin: role === 'admin'
  }), [firebaseUser, role]);

  // loading中でも空のdivを返す（nullではなく）- iOS Safari対応
  if (loading) {
    return <div style={{ display: 'none' }} />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};