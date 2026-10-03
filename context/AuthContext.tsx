'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient, User as SupabaseUser, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://evxeqsfuyvisfkqxdaqv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2eGVxc2Z1eXZpc2ZrcXhkYXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNTI0NjMsImV4cCI6MjEwNTgyODQ2M30.aXcDykVvTjH6Wnxd0b9BDJXLZWGt0CkF_oe5NYoYVJE';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  dbUser: DatabaseUser | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  getAuthToken: () => Promise<string | null>;
  hasPermission: (permissionCode: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [dbUser, setDbUser] = useState<DatabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchUserProfile = async (authUser: SupabaseUser) => {
    try {
      // 1. Fetch Profile
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileErr || !profile) {
        console.warn('Profile not found in public.profiles:', profileErr);
      }

      if (profile && profile.is_active === false) {
        throw new Error('user_banned');
      }

      // 2. Fetch User Role
      const { data: userRoleData } = await supabase
        .from('user_roles')
        .select('role_id, role:roles(id, name)')
        .eq('user_id', authUser.id)
        .maybeSingle();

      const roleName = (userRoleData?.role as any)?.name || 'data_entry';
      const roleId = userRoleData?.role_id || null;

      // 3. Fetch Role Permissions
      let permissions: string[] = [];
      if (roleId) {
        const { data: rolePerms } = await supabase
          .from('role_permissions')
          .select('permission:permissions(code)')
          .eq('role_id', roleId);

        permissions = (rolePerms || [])
          .map((rp: any) => rp.permission?.code)
          .filter(Boolean);
      }

      const formattedUser: DatabaseUser = {
        id: authUser.id,
        uid: authUser.id,
        email: authUser.email || '',
        name: profile?.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'مستخدم',
        role: roleName,
        roleId: roleId,
        permissions: permissions,
        isActive: profile ? profile.is_active : true,
        createdAt: profile?.created_at || authUser.created_at,
        updatedAt: profile?.updated_at || authUser.created_at,
      };

      setDbUser(formattedUser);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching user profile:', err);
      if (err.message === 'user_banned') {
        setError('تم إيقاف هذا الحساب، يرجى التواصل مع مدير النظام.');
        await supabase.auth.signOut();
        setDbUser(null);
        setUser(null);
        setSession(null);
      } else {
        setError(err.message || 'حدث خطأ أثناء تحميل بيانات الملف الشخصي');
      }
    }
  };

  const getAuthToken = async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || session?.access_token || null;
  };

  const hasPermission = (permissionCode: string): boolean => {
    if (!dbUser) return false;
    if (dbUser.role === 'admin') return true;
    if (dbUser.permissions && Array.isArray(dbUser.permissions)) {
      return dbUser.permissions.includes(permissionCode);
    }
    return false;
  };

  const refreshUser = async () => {
    if (user) {
      await fetchUserProfile(user);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setDbUser(null);
      router.push('/login');
    } catch (err: any) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      setSession(initSession);
      setUser(initSession?.user || null);
      if (initSession?.user) {
        fetchUserProfile(initSession.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      const currentUser = currentSession?.user || null;
      setUser(currentUser);

      if (currentUser) {
        await fetchUserProfile(currentUser);
      } else {
        setDbUser(null);
        if (window.location.pathname !== '/login') {
          router.push('/login');
        }
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        dbUser,
        loading,
        error,
        logout,
        getAuthToken,
        hasPermission,
        refreshUser,
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
