import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';
import { MODULE_LABELS } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const { data: allPermissions, error: dbError } = await supabase
      .from('permissions')
      .select('*')
      .order('module', { ascending: true });

    if (dbError) throw dbError;

    const grouped: Record<string, { module: string; moduleLabel: string; permissions: any[] }> = {};

    (allPermissions || []).forEach((p: any) => {
      const mod = p.module || 'other';
      if (!grouped[mod]) {
        grouped[mod] = {
          module: mod,
          moduleLabel: MODULE_LABELS[mod] || mod,
          permissions: [],
        };
      }
      grouped[mod].permissions.push(p);
    });

    return NextResponse.json({
      permissions: allPermissions || [],
      grouped: Object.values(grouped),
    });
  } catch (error: any) {
    console.error('Failed to list permissions:', error);
    return NextResponse.json({ error: error.message || 'فشل في استرجاع قائمة الصلاحيات' }, { status: 500 });
  }
}
