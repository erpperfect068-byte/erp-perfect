import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { permissions } from '@/src/db/schema';
import { verifyAuth } from '@/lib/auth-server';
import { ensurePermissionsAndRoles } from '@/lib/roles-service';
import { MODULE_LABELS } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  try {
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    await ensurePermissionsAndRoles();

    const allPermissions = await db.select().from(permissions);

    const grouped: Record<string, { module: string; moduleLabel: string; permissions: any[] }> = {};

    for (const p of allPermissions) {
      if (!grouped[p.module]) {
        grouped[p.module] = {
          module: p.module,
          moduleLabel: MODULE_LABELS[p.module] || p.module,
          permissions: [],
        };
      }
      grouped[p.module].permissions.push(p);
    }

    return NextResponse.json({
      permissions: allPermissions,
      grouped: Object.values(grouped),
    });
  } catch (error: any) {
    console.error('Failed to list permissions:', error);
    return NextResponse.json({ error: 'فشل في استرجاع قائمة الصلاحيات' }, { status: 500 });
  }
}
