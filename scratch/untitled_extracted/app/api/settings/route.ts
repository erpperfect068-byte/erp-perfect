import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { ports, agencies, contractors, statuses } from '@/src/db/schema';
import { logAudit } from '@/lib/audit';
import { verifyAuth, checkRole } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  try {
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status });
    }

    // Load tables
    const portsList = await db.select().from(ports);
    const agenciesList = await db.select().from(agencies);
    const contractorsList = await db.select().from(contractors);
    const statusesList = await db.select().from(statuses);

    return NextResponse.json({
      ports: portsList,
      agencies: agenciesList,
      contractors: contractorsList,
      statuses: statusesList,
    });
  } catch (error) {
    console.error('Failed to load settings:', error);
    return NextResponse.json({ error: 'Failed to retrieve settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status });
    }

    // Only admin can change global operational settings
    if (!checkRole(user, ['admin'])) {
      return NextResponse.json({ error: 'غير مصرح - تعديل الإعدادات متاح لمدير النظام فقط' }, { status: 403 });
    }

    const body = await req.json();
    const { type, name, color } = body;

    if (!type || !name) {
      return NextResponse.json({ error: 'Type and name are required' }, { status: 400 });
    }

    let insertedRecord;

    switch (type) {
      case 'port':
        [insertedRecord] = await db.insert(ports).values({ name }).returning();
        await logAudit({ tableName: 'ports', recordId: insertedRecord.id, action: 'INSERT', newData: insertedRecord, userEmail: user.email, req });
        break;
      case 'agency':
        [insertedRecord] = await db.insert(agencies).values({ name }).returning();
        await logAudit({ tableName: 'agencies', recordId: insertedRecord.id, action: 'INSERT', newData: insertedRecord, userEmail: user.email, req });
        break;
      case 'contractor':
        [insertedRecord] = await db.insert(contractors).values({ name }).returning();
        await logAudit({ tableName: 'contractors', recordId: insertedRecord.id, action: 'INSERT', newData: insertedRecord, userEmail: user.email, req });
        break;
      case 'status':
        [insertedRecord] = await db.insert(statuses).values({ name, color: color || '#6b7280' }).returning();
        await logAudit({ tableName: 'statuses', recordId: insertedRecord.id, action: 'INSERT', newData: insertedRecord, userEmail: user.email, req });
        break;
      default:
        return NextResponse.json({ error: 'Invalid setting type' }, { status: 400 });
    }

    return NextResponse.json(insertedRecord);
  } catch (error: any) {
    console.error('Failed to add setting:', error);
    if (error.code === '23505') { // Unique constraint violation in postgres
      return NextResponse.json({ error: 'هذا السجل متواجد بالفعل بقاعدة البيانات' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create settings record' }, { status: 500 });
  }
}
