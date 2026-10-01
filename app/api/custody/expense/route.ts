import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const body = await req.json();
    const {
      custodyId,
      amount,
      expenseType = 'عام',
      receiptNumber = null,
      description = '',
      expenseDate,
      shipmentId = null,
    } = body;

    if (!custodyId || !amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'معرف العهدة والمبلغ المصروف مطلوبان' }, { status: 400 });
    }

    // 1. Verify custody exists & is open
    const { data: custody, error: fetchErr } = await supabase
      .from('employee_custodies')
      .select('id, amount, currency, status')
      .eq('id', custodyId)
      .single();

    if (fetchErr || !custody) {
      return NextResponse.json({ error: 'العهدة غير موجودة' }, { status: 404 });
    }

    if (custody.status === 'closed') {
      return NextResponse.json({ error: 'لا يمكن إضافة مصروفات على عهدة مغلقة ومسواة بالكامل' }, { status: 400 });
    }

    // 2. Insert record into custody_expenses
    const { data: newExpense, error: insertErr } = await supabase
      .from('custody_expenses')
      .insert({
        company_id: (user as any).company_id || null,
        custody_id: custodyId,
        amount: parseFloat(amount),
        currency: custody.currency || 'EGP',
        expense_type: expenseType,
        receipt_number: receiptNumber || null,
        description: description || 'مصروف عهدة',
        expense_date: expenseDate ? new Date(expenseDate).toISOString() : new Date().toISOString(),
        shipment_id: shipmentId || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // 3. If shipmentId is provided, route expense to shipment statement
    if (shipmentId) {
      // Find existing statement for shipment or create statement
      const { data: stmt } = await supabase
        .from('statements')
        .select('id')
        .eq('shipment_id', shipmentId)
        .maybeSingle();

      let statementId = stmt?.id;
      if (!statementId) {
        const { data: newStmt } = await supabase
          .from('statements')
          .insert({
            company_id: (user as any).company_id || null,
            shipment_id: shipmentId,
            statement_date: new Date().toISOString().split('T')[0],
            currency: custody.currency || 'EGP',
            total_amount: 0.00,
            created_by: user.id,
            updated_by: user.id,
          })
          .select('id')
          .single();
        statementId = newStmt?.id;
      }

      if (statementId) {
        // Insert statement item for billing client
        await supabase.from('statement_items').insert({
          company_id: (user as any).company_id || null,
          statement_id: statementId,
          description: `[مصروف عهدة - ${expenseType}] ${description}${receiptNumber ? ` (إيصال: ${receiptNumber})` : ''}`,
          amount: parseFloat(amount),
          currency: custody.currency || 'EGP',
          item_date: new Date().toISOString().split('T')[0],
          created_by: user.id,
        });

        // Recalculate statement total amount
        const { data: allItems } = await supabase
          .from('statement_items')
          .select('amount')
          .eq('statement_id', statementId);

        const newTotal = (allItems || []).reduce((sum: number, it: any) => sum + (parseFloat(it.amount) || 0), 0);
        await supabase.from('statements').update({ total_amount: newTotal }).eq('id', statementId);
      }
    }

    return NextResponse.json(newExpense, { status: 201 });
  } catch (error: any) {
    console.error('Failed to add custody expense:', error);
    return NextResponse.json({ error: error.message || 'فشل تسجيل المصروف' }, { status: 500 });
  }
}
