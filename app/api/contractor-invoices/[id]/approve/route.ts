import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, userHasPermission, forbiddenResponse } from '@/lib/supabase-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    if (!userHasPermission(user, 'contractors.invoices_approve')) {
      return forbiddenResponse('غير مصرح لك باعتماد وإقفال فواتير المقاولين');
    }

    const { id } = await context.params;

    const { data: existing, error: fetchErr } = await supabase
      .from('contractor_invoices')
      .select('*, contractor:contractors(name), shipment:shipments(bol_number)')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });

    if (existing.status === 'approved' || existing.status === 'paid') {
      return NextResponse.json({ error: 'هذه الفاتورة معتمدة بالفعل ومدرجة كدين' }, { status: 400 });
    }

    const { data: updated, error: updateErr } = await supabase
      .from('contractor_invoices')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      message: `تم اعتماد وإقفال الفاتورة بنجاح. أصبحت الآن مسجلة كدين مستحق للمقاول (${existing.contractor?.name}) وستظهر في تنبيهات الخزينة.`,
      invoice: updated,
    });
  } catch (err: any) {
    console.error('Failed to approve contractor invoice:', err);
    return NextResponse.json({ error: err.message || 'فشل اعتماد الفاتورة' }, { status: 500 });
  }
}
