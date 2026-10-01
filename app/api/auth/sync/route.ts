import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('*, role:roles(*)')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: profile?.name || user.email?.split('@')[0],
        role: userRole?.role?.name || 'data_entry',
        roleId: userRole?.role_id || null,
        isActive: profile?.is_active ?? true,
      },
    });
  } catch (error: any) {
    console.error('Session sync error:', error);
    return NextResponse.json({ error: error.message || 'فشل مزامنة الجلسة' }, { status: 500 });
  }
}
