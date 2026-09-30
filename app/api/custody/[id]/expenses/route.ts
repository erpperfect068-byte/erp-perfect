import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const { id: custodyId } = await params;
    const body = await req.json();
    const { description, amount, currency = 'EGP', exchangeRate = null, shipmentId = null, attachmentPath = null } = body;

    if (!description || !amount) {
      return NextResponse.json({ error: 'الوصف والمبلغ مطلوبين' }, { status: 400 });
    }

    const { data, error: rpcError } = await supabase.rpc('add_custody_expense', {
      p_custody_id: custodyId,
      p_description: description,
      p_amount: amount,
      p_currency: currency,
      p_exchange_rate: exchangeRate,
      p_shipment_id: shipmentId,
      p_attachment_path: attachmentPath,
    });

    if (rpcError) throw rpcError;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Failed to add custody expense:', error);
    if (error.code === '42501' || error.message?.includes('غير مصرح')) {
      return NextResponse.json({ error: 'غير مصرح لك بإضافة مصروفات لهذه العهدة' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'فشل إضافة المصروف' }, { status: 500 });
  }
}
