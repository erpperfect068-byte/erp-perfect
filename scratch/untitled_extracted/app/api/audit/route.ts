import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { auditLog } from '@/src/db/schema';
import { desc } from 'drizzle-orm';
import { verifyAuth, checkRole } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  try {
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status });
    }

    // Verify caller is admin
    if (!checkRole(user, ['admin'])) {
      return NextResponse.json({ error: 'غير مصرح لغير مدراء النظام مراجعة سجل التدقيق' }, { status: 403 });
    }

    const logs = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(100);

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Failed to list audit logs:', error);
    return NextResponse.json({ error: 'Failed to retrieve audit trail' }, { status: 500 });
  }
}
