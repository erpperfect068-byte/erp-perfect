import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    if (!id) {
      return NextResponse.json({ error: 'معرف البند مطلوب' }, { status: 400 });
    }

    const { error: deleteErr } = await supabase
      .from('custody_expenses')
      .delete()
      .eq('id', id);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true, message: 'تم حذف بند المصروف/التسوية بنجاح' });
  } catch (error: any) {
    console.error('Failed to delete custody expense:', error);
    return NextResponse.json({ error: error.message || 'فشل حذف البند' }, { status: 500 });
  }
}
