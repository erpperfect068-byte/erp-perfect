import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://evxeqsfuyvisfkqxdaqv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2eGVxc2Z1eXZpc2ZrcXhkYXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNTI0NjMsImV4cCI6MjEwNTgyODQ2M30.aXcDykVvTjH6Wnxd0b9BDJXLZWGt0CkF_oe5NYoYVJE';

/**
 * Enriched server-side user type returned by getAuthUser.
 * Includes company_id, role name, and all permission codes.
 */
export interface ServerUser {
  id: string;
  email?: string;
  company_id: string | null;
  role: string;
  permissions: string[];
}

/**
 * Creates a user-authenticated Supabase client using the Bearer token from the incoming Request.
 * All DB queries executed with this client will enforce Postgres Row Level Security (RLS) policies
 * and evaluate `auth.uid()` as the logged-in user.
 */
export function getSupabaseServerClient(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

  return {
    supabase: createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }),
    token,
  };
}

/**
 * Validates the user's JWT token and fetches current authenticated user,
 * along with their company_id, role name, and permission codes.
 */
export async function getAuthUser(req: NextRequest) {
  const { supabase, token } = getSupabaseServerClient(req);

  if (!token) {
    return { user: null as ServerUser | null, error: 'غير مصرح - لم يتم إرسال رمز المصادقة', status: 401, supabase };
  }

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null as ServerUser | null, error: 'رمز المصادقة غير صالح أو منتهي الصلاحية', status: 401, supabase };
  }

  // Fetch company_id and is_active from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.is_active === false) {
    return { user: null as ServerUser | null, error: 'تم إيقاف هذا الحساب من قِبَل المدير', status: 403, supabase };
  }

  // Fetch user's role
  const { data: userRoleData } = await supabase
    .from('user_roles')
    .select('role_id, role:roles(id, name)')
    .eq('user_id', user.id)
    .maybeSingle();

  const roleName: string = (userRoleData?.role as any)?.name || 'data_entry';
  const roleId: string | null = userRoleData?.role_id || null;

  // Fetch permissions for this role
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

  const serverUser: ServerUser = {
    id: user.id,
    email: user.email,
    company_id: profile?.company_id || null,
    role: roleName,
    permissions,
  };

  return { user: serverUser, error: null, status: 200, supabase };
}

/**
 * Checks if a server-side user has a specific permission.
 * Admins bypass all permission checks (super-admin).
 */
export function userHasPermission(user: ServerUser, permissionCode: string): boolean {
  if (user.role === 'admin') return true;
  return user.permissions.includes(permissionCode);
}

/**
 * Returns a 403 Forbidden JSON response.
 */
export function forbiddenResponse(message = 'غير مصرح لك بهذه العملية') {
  return NextResponse.json({ error: message }, { status: 403 });
}
