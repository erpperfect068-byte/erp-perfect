import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, userHasPermission, forbiddenResponse } from '@/lib/supabase-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/custody/expenses/[id]/reverse - Partial / Full Reversal (Refund) for Custody Expense
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    // RBAC: Check custody permissions
    if (
      !userHasPermission(user, 'custody.expense') &&
      !userHasPermission(user, 'custody.manage') &&
      !userHasPermission(user, 'custody.settle') &&
      !userHasPermission(user, 'custody.reverse') &&
      (user as any).role !== 'admin'
    ) {
      return forbiddenResponse('غير مصرح لك بإجراء استرداد أو عكس لمصروفات العهدة');
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'معرف المصروف مطلوب' }, { status: 400 });
    }

    const body = await req.json();
    const { refundAmount, reason } = body;

    // Validate refundAmount
    const numRefund = parseFloat(Number(refundAmount).toFixed(2));
    if (isNaN(numRefund) || numRefund <= 0) {
      return NextResponse.json({ error: 'مبلغ الاسترداد يجب أن يكون رقماً أكبر من صفر' }, { status: 400 });
    }

    // Validate reason
    const trimmedReason = (reason || '').trim();
    if (!trimmedReason) {
      return NextResponse.json({ error: 'سبب ومبرر الاسترداد مطلوب إلزامي' }, { status: 400 });
    }

    // 1. Fetch original expense
    const { data: originalExpense, error: fetchErr } = await supabase
      .from('custody_expenses')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !originalExpense) {
      return NextResponse.json({ error: 'بند المصروف الأصلي غير موجود' }, { status: 404 });
    }

    const origAmount = parseFloat(Number(originalExpense.amount || 0).toFixed(2));
    if (origAmount <= 0) {
      return NextResponse.json(
        { error: 'لا يمكن عمل استرداد لقيد استرداد أو تسوية سالب القيمة' },
        { status: 400 }
      );
    }

    // 2. Fetch existing reversals linked to this expense to prevent over-refunding
    const { data: existingReversals, error: revErr } = await supabase
      .from('custody_expenses')
      .select('amount')
      .eq('custody_id', originalExpense.custody_id)
      .eq('reversed_by_expense_id', originalExpense.id)
      .eq('is_reversed', false);

    if (revErr) throw revErr;

    const totalAlreadyRefunded = (existingReversals || []).reduce(
      (sum: number, r: any) => sum + Math.abs(parseFloat(r.amount) || 0),
      0
    );

    const maxRefundable = parseFloat((origAmount - totalAlreadyRefunded).toFixed(2));
    if (maxRefundable <= 0) {
      return NextResponse.json(
        { error: 'تم استرداد هذا المصروف بالكامل مسبقاً' },
        { status: 400 }
      );
    }

    if (numRefund > maxRefundable) {
      return NextResponse.json(
        {
          error: `المبلغ المطلوب استرداده (${numRefund.toLocaleString()} ${originalExpense.currency}) يتجاوز المتبقي القابل للاسترداد (${maxRefundable.toLocaleString()} ${originalExpense.currency})`,
        },
        { status: 400 }
      );
    }

    // 3. Verify custody exists and is not closed
    const { data: custody, error: custodyErr } = await supabase
      .from('employee_custodies')
      .select('id, status')
      .eq('id', originalExpense.custody_id)
      .single();

    if (custodyErr || !custody) {
      return NextResponse.json({ error: 'العهدة التابع لها المصروف غير موجودة' }, { status: 404 });
    }

    if (custody.status === 'closed') {
      return NextResponse.json(
        { error: 'لا يمكن إجراء استرداد لمصروف على عهدة مغلقة ومورّدة للخزينة' },
        { status: 400 }
      );
    }

    // 4. Execution (The Contra Entry): Insert a NEW record into custody_expenses
    const negativeAmount = -Math.abs(numRefund);
    const identifier = originalExpense.receipt_number || originalExpense.id.slice(0, 8);
    const noteDescription = `استرداد/عكس جزئي من مصروف رقم ${identifier}: ${trimmedReason}`;
    const refundReceipt = originalExpense.receipt_number
      ? `REF-${originalExpense.receipt_number}`
      : `REF-${Date.now().toString().slice(-6)}`;

    const { data: newContraExpense, error: insertErr } = await supabase
      .from('custody_expenses')
      .insert({
        company_id: originalExpense.company_id || (user as any).company_id || null,
        custody_id: originalExpense.custody_id,
        shipment_id: originalExpense.shipment_id || null,
        amount: negativeAmount,
        currency: originalExpense.currency || 'EGP',
        expense_type: 'استرداد مصروف',
        receipt_number: refundReceipt,
        description: noteDescription,
        expense_date: new Date().toISOString(),
        reversed_by_expense_id: originalExpense.id,
        created_by: user.id,
        exchange_rate_at_transaction:
          originalExpense.exchange_rate_at_transaction ||
          (originalExpense.currency === 'EGP' ? null : 1.0),
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json({
      success: true,
      message: `تم تسجيل قيد الاسترداد العكسي بمبلغ ${numRefund.toLocaleString()} ${originalExpense.currency} بنجاح وإعادة الرصيد إلى العهدة`,
      expense: newContraExpense,
      refundedAmount: numRefund,
      remainingExpenseAmount: parseFloat((maxRefundable - numRefund).toFixed(2)),
    });
  } catch (err: any) {
    console.error('Failed to reverse custody expense:', err);
    return NextResponse.json(
      { error: err.message || 'فشل إجراء استرداد بند المصروف' },
      { status: 500 }
    );
  }
}
