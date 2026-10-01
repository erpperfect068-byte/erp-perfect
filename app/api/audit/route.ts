import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';

// Get System Audit Log
export async function GET(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const { data: logs, error: dbError } = await supabase
      .from('audit_log')
      .select('*')
      .eq('company_id', (user as any).company_id)
      .order('changed_at', { ascending: false })
      .limit(100);

    if (dbError) throw dbError;

    const formattedLogs = (logs || []).map((l: any) => ({
      ...l,
      tableName: l.table_name,
      recordId: l.record_id,
      oldData: l.old_data,
      newData: l.new_data,
      userEmail: l.changed_by_email,
      ipAddress: l.ip_address,
      createdAt: l.changed_at,
    }));

    return NextResponse.json(formattedLogs);
  } catch (error: any) {
    console.error('Failed to list audit logs:', error);
    return NextResponse.json({ error: error.message || 'فشل جلب سجل الرقابة والتدقيق' }, { status: 500 });
  }
}
