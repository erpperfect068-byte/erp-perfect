'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth, googleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from '../lib/firebase-client';
import { useRouter } from 'next/navigation';

export interface DatabaseUser {
  id: string;
  uid: string;
  email: string;
  name: string | null;
  role: string;
  roleId?: string | null;
  permissions?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DemoRole = 'admin' | 'accountant' | 'clearance_officer' | 'data_entry';

export const DEMO_ACCOUNTS: Record<DemoRole, { email: string; name: string; role: DemoRole; desc: string; color: string; permissions: string[] }> = {
  admin: {
    email: 'admin@demo-customs.eg',
    name: 'أحمد محمود (مدير النظام التجريبي)',
    role: 'admin',
    desc: 'كامل الصلاحيات، التدقيق، إدارة المستخدمين والإعدادات',
    color: 'bg-red-500',
    permissions: [
      'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
      'shipments.view', 'shipments.create', 'shipments.edit', 'shipments.delete',
      'treasury.view', 'treasury.create', 'treasury.reverse',
      'statements.view', 'statements.create', 'statements.edit', 'statements.print',
      'deposits.view', 'deposits.create',
      'users.view', 'users.invite', 'users.manage_roles',
      'roles.manage',
      'settings.view', 'settings.edit',
      'audit.view'
    ],
  },
  accountant: {
    email: 'accountant@demo-customs.eg',
    name: 'سارة إبراهيم (محاسب مالي تجريبي)',
    role: 'accountant',
    desc: 'إدارة الخزينة، كشوف الحساب، الأمانات والودائع',
    color: 'bg-emerald-500',
    permissions: [
      'treasury.view', 'treasury.create', 'treasury.reverse',
      'statements.view', 'statements.create', 'statements.edit', 'statements.print',
      'deposits.view', 'deposits.create',
      'clients.view', 'shipments.view'
    ],
  },
  clearance_officer: {
    email: 'clearance@demo-customs.eg',
    name: 'كابتن طارق السعيد (مخلص جمركي تجريبي)',
    role: 'clearance_officer',
    desc: 'متابعة الشحنات، بوالص الشحن، وإجراءات الموانئ',
    color: 'bg-blue-500',
    permissions: [
      'shipments.view', 'shipments.create', 'shipments.edit',
      'clients.view', 'settings.view'
    ],
  },
  data_entry: {
    email: 'dataentry@demo-customs.eg',
    name: 'مصطفى عادل (مدخل بيانات تجريبي)',
    role: 'data_entry',
    desc: 'إدخال بيانات العملاء والبيانات الجمركية الأولية',
    color: 'bg-amber-500',
    permissions: [
      'clients.view', 'clients.create', 'clients.edit',
      'shipments.view', 'shipments.create'
    ],
  },
};

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  dbUser: DatabaseUser | null;
  loading: boolean;
  error: string | null;
  isDemoMode: boolean;
  demoRole: DemoRole | null;
  loginWithGoogle: () => Promise<void>;
  loginAsDemo: (role?: DemoRole) => Promise<void>;
  logout: () => Promise<void>;
  getAuthToken: () => Promise<string | null>;
  resetDemoData: () => Promise<boolean>;
  hasPermission: (permissionCode: string) => boolean;
  exitDemoMode: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<DatabaseUser | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [demoRole, setDemoRole] = useState<DemoRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const hasPermission = (permissionCode: string): boolean => {
    if (!dbUser) return false;
    if (dbUser.role === 'admin') return true;
    if (dbUser.permissions && Array.isArray(dbUser.permissions)) {
      return dbUser.permissions.includes(permissionCode);
    }
    return false;
  };

  const getAuthToken = async (): Promise<string | null> => {
    if (isDemoMode && demoRole) {
      return `demo-${demoRole}`;
    }
    if (auth.currentUser) {
      return auth.currentUser.getIdToken();
    }
    return null;
  };

  const syncWithDatabase = async (fbUser: FirebaseUser) => {
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        if (
          res.status === 403 ||
          data.error?.includes('deactivated') ||
          data.error?.includes('banned') ||
          data.error?.includes('user_banned')
        ) {
          throw new Error('تم إيقاف هذا الحساب، يرجى التواصل مع مدير النظام.');
        }
        throw new Error(data.error || 'فشلت عملية التحقق من الحساب');
      }

      if (data.user && data.user.isActive === false) {
        throw new Error('تم إيقاف هذا الحساب، يرجى التواصل مع مدير النظام.');
      }

      setDbUser(data.user);
      setIsDemoMode(false);
      setDemoRole(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('customs_demo_role');
      }
      setError(null);
      return data.user;
    } catch (err: any) {
      console.error('Database sync error:', err);
      setError(err.message || 'حدث خطأ أثناء مزامنة البيانات');
      await firebaseSignOut(auth);
      setDbUser(null);
      return null;
    }
  };

  const loginAsDemo = async (role: DemoRole = 'admin') => {
    setLoading(true);
    setError(null);
    try {
      const demoConfig = DEMO_ACCOUNTS[role];
      const token = `demo-${role}`;

      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok && data.user) {
        setDbUser(data.user);
      } else {
        setDbUser({
          id: `demo-${role}-id`,
          uid: `demo-uid-${role}`,
          email: demoConfig.email,
          name: demoConfig.name,
          role: role,
          permissions: demoConfig.permissions,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      setIsDemoMode(true);
      setDemoRole(role);
      setFirebaseUser(null);

      if (typeof window !== 'undefined') {
        localStorage.setItem('customs_demo_role', role);
      }

      if (window.location.pathname === '/login') {
        router.push('/');
      }
    } catch (err: any) {
      console.error('Error logging in as demo user:', err);
      setError('فشل تفعيل الحساب التجريبي');
    } finally {
      setLoading(false);
    }
  };

  const resetDemoData = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/seed', {
        method: 'POST',
      });
      return res.ok;
    } catch (err) {
      console.error('Failed to reset demo data:', err);
      return false;
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDemoRole = localStorage.getItem('customs_demo_role') as DemoRole | null;
      if (savedDemoRole && DEMO_ACCOUNTS[savedDemoRole]) {
        loginAsDemo(savedDemoRole);
        return;
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setFirebaseUser(user);
        const success = await syncWithDatabase(user);
        if (success && window.location.pathname === '/login') {
          router.push('/');
        }
      } else {
        if (typeof window !== 'undefined' && !localStorage.getItem('customs_demo_role')) {
          setFirebaseUser(null);
          setDbUser(null);
          setIsDemoMode(false);
          setDemoRole(null);
          if (window.location.pathname !== '/login') {
            router.push('/login');
          }
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loginWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('customs_demo_role');
      }
      setIsDemoMode(false);
      setDemoRole(null);
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.message || 'فشلت عملية تسجيل الدخول باستخدام Google');
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('customs_demo_role');
      }
      setIsDemoMode(false);
      setDemoRole(null);
      setDbUser(null);
      setFirebaseUser(null);
      await firebaseSignOut(auth).catch(() => {});
      router.push('/login');
    } catch (err: any) {
      console.error('Logout error:', err);
      setError(err.message || 'فشل تسجيل الخروج');
    } finally {
      setLoading(false);
    }
  };

  const exitDemoMode = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('customs_demo_role');
      }
      setIsDemoMode(false);
      setDemoRole(null);
      setDbUser(null);
      setFirebaseUser(null);
      await firebaseSignOut(auth).catch(() => {});
      router.push('/login');
    } catch (err: any) {
      console.error('Exit demo mode error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        dbUser,
        loading,
        error,
        isDemoMode,
        demoRole,
        loginWithGoogle,
        loginAsDemo,
        logout,
        getAuthToken,
        resetDemoData,
        hasPermission,
        exitDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
