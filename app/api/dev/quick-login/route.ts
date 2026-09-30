import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://evxeqsfuyvisfkqxdaqv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2eGVxc2Z1eXZpc2ZrcXhkYXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNTI0NjMsImV4cCI6MjEwNTgyODQ2M30.aXcDykVvTjH6Wnxd0b9BDJXLZWGt0CkF_oe5NYoYVJE';

const DEMO_EMAILS: Record<string, string> = {
  admin: 'admin@test.local',
  accountant: 'accountant@test.local',
  clearance_officer: 'clearance@test.local',
  clearance: 'clearance@test.local',
  data_entry: 'dataentry@test.local',
  dataentry: 'dataentry@test.local',
};

/**
 * Server-only Quick Login route for development environment.
 * Never exposes the test account password to client JS bundles.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'محرّم في بيئة الإنتاج' }, { status: 403 });
  }

  try {
    const { role } = await req.json();
    const email = DEMO_EMAILS[role];

    if (!email) {
      return NextResponse.json({ error: 'الدور المطلوب غير صالح' }, { status: 400 });
    }

    const password = process.env.DEMO_USER_PASSWORD || 'CustomsERP#2026!';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return NextResponse.json({ error: error?.message || 'فشل تسجيل الدخول السريع' }, { status: 401 });
    }

    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: data.user,
    });
  } catch (error: any) {
    console.error('Quick dev login error:', error);
    return NextResponse.json({ error: error.message || 'خطأ أثناء تسجيل الدخول السريع' }, { status: 500 });
  }
}
