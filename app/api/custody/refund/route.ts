import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';

// Temporary Custody Settlement: Adds settlement item to custody expenses to bring remaining balance to 0.00
export async function POST(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const body = await req.json();
    const { custodyId } = body;

    if (!custodyId) {
      return NextResponse.json({ error: 'معرف العهدة مطلوب' }, { status: 400 });
    }

    // Fetch custody and its expenses
    const { data: custody, error: custodyErr } = await supabase
      .from('employee_custodies')
      .select('*, expenses:custody_expenses(*)')
      .eq('id', custodyId)
      .single();

    if (custodyErr || !custody) {
      return NextResponse.json({ error: 'العهدة غير موجودة' }, { status: 404 });
    }

    const expensesList = Array.isArray(custody.expenses) ? custody.expenses : [];
    
    // Check if settlement item already exists
    const existingSettlement = expensesList.find((e: any) => e.expense_type === 'تسوية/استرداد متبقي' && !e.is_reversed);
    if (existingSettlement) {
      return NextResponse.json({ error: 'بند تسوية العهدة موجود بالفعل' }, { status: 400 });
    }

    const totalSpent = expensesList
      .filter((e: any) => !e.is_reversed)
      .reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0);

    const totalIssued = parseFloat(custody.amount) || 0;
    const remainingBalance = Math.max(0, totalIssued - totalSpent);

    if (remainingBalance <= 0) {
      return NextResponse.json({ error: 'الرصيد المتبقي في العهدة يساوي 0.00 مسبقاً، لا يوجد مبالغ لاستردادها' }, { status: 400 });
    }

    // Insert temporary settlement expense item
    const { data: settlementExpense, error: expenseErr } = await supabase
      .from('custody_expenses')
      .insert({
        company_id: (user as any).company_id || null,
        custody_id: custodyId,
        amount: remainingBalance,
        currency: custody.currency || 'EGP',
        expense_type: 'تسوية/استرداد متبقي',
        description: `تسوية مؤقتة واسترداد متبقي العهدة (${remainingBalance.toLocaleString()} ${custody.currency || 'EGP'})`,
        expense_date: new Date().toISOString(),
        created_by: user.id,
      })
      .select()
      .single();

    if (expenseErr) throw expenseErr;

    return NextResponse.json({
      success: true,
      message: 'تم إضافة بند التسوية واسترداد المتبقي مؤقتاً بنجاح',
      settlementExpense,
    });
  } catch (error: any) {
    console.error('Failed to add settlement expense:', error);
    return NextResponse.json({ error: error.message || 'فشل إضافة بند تسوية العهدة' }, { status: 500 });
  }
}
