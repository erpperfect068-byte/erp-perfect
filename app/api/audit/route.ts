import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Get System Audit Log
export async function GET(req: NextRequest) {
  try {
    const { user, error, status } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const companyId = (user as any).company_id;

    let query = supabaseAdmin
      .from('audit_log')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(100);

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data: logs, error: dbError } = await query;

    if (dbError) throw dbError;

    const formattedLogs = (logs || []).map((l: any) => ({
      id: l.id,
      tableName: l.table_name,
      recordId: l.record_id,
      action: l.action,
      oldData: l.old_data,
      newData: l.new_data,
      changedByEmail: l.changed_by_email,
      ipAddress: l.ip_address,
      userAgent: l.user_agent,
      createdAt: l.changed_at,
    }));

    return NextResponse.json(formattedLogs);
  } catch (error: any) {
    console.error('Failed to list audit logs:', error);
    return NextResponse.json({ error: error.message || 'فشل جلب سجل الرقابة والتدقيق' }, { status: 500 });
  }
}
