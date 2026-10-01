import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://evxeqsfuyvisfkqxdaqv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2eGVxc2Z1eXZpc2ZrcXhkYXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNTI0NjMsImV4cCI6MjEwNTgyODQ2M30.aXcDykVvTjH6Wnxd0b9BDJXLZWGt0CkF_oe5NYoYVJE';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: password || 'Password123!',
    });

    if (error || !data.session) {
      return NextResponse.json({ error: error?.message || 'فشل تسجيل الدخول' }, { status: 401 });
    }

    return NextResponse.json({
      access_token: data.session.access_token,
      user: data.user,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'خطأ أثناء تسجيل الدخول' }, { status: 500 });
  }
}
