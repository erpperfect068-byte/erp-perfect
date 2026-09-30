import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const { id: expenseId } = await params;
    const body = await req.json();
    const { reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'سبب الإلغاء مطلوب' }, { status: 400 });
    }

    const { data, error: rpcError } = await supabase.rpc('reverse_custody_expense', {
      p_expense_id: expenseId,
      p_reason: reason.trim(),
    });

    if (rpcError) throw rpcError;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Failed to reverse custody expense:', error);
    if (error.code === '42501' || error.message?.includes('غير مصرح')) {
      return NextResponse.json({ error: 'غير مصرح لك بإلغاء/عكس مصروفات العهدة' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'فشل إلغاء بند المصروف' }, { status: 500 });
  }
}
