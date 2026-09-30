import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://evxeqsfuyvisfkqxdaqv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2eGVxc2Z1eXZpc2ZrcXhkYXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNTI0NjMsImV4cCI6MjEwNTgyODQ2M30.aXcDykVvTjH6Wnxd0b9BDJXLZWGt0CkF_oe5NYoYVJE';

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
 * Validates the user's JWT token and fetches current authenticated user.
 */
export async function getAuthUser(req: NextRequest) {
  const { supabase, token } = getSupabaseServerClient(req);

  if (!token) {
    return { user: null, error: 'غير مصرح - لم يتم إرسال رمز المصادقة', status: 401, supabase };
  }

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: 'رمز المصادقة غير صالح أو منتهي الصلاحية', status: 401, supabase };
  }

  return { user, error: null, status: 200, supabase };
}
