import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const { data: expenseTypes, error: dbErr } = await supabase
      .from('expense_types')
      .select('*')
      .eq('company_id', (user as any).company_id)
      .order('name', { ascending: true });

    if (dbErr) throw dbErr;

    return NextResponse.json(expenseTypes || []);
  } catch (error: any) {
    console.error('Failed to get expense types:', error);
    return NextResponse.json({ error: error.message || 'فشل جلب أنواع المصروفات' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const body = await req.json();
    const { name, category = 'عام' } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'اسم نوع المصروف مطلوب' }, { status: 400 });
    }

    const { data: newType, error: insertErr } = await supabase
      .from('expense_types')
      .insert({
        company_id: (user as any).company_id || null,
        name: name.trim(),
        category: category.trim(),
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json(newType, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create expense type:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'نوع المصروف هذا موجود بالفعل' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'فشل إضافة نوع المصروف' }, { status: 500 });
  }
}
