import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, userHasPermission, forbiddenResponse } from '@/lib/supabase-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/treasury/[id]/adjust - Manual Balance Adjustment Entry
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    if (!user.company_id) {
      return NextResponse.json({ error: 'لم يتم تحديد الشركة الخاصة بالمستخدم' }, { status: 400 });
    }

    // RBAC: Check treasury.adjust or treasury.create
    if (!userHasPermission(user, 'treasury.adjust') && !userHasPermission(user, 'treasury.create')) {
      return forbiddenResponse('غير مصرح لك بإجراء تسويات أرصدة الخزينة');
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'معرف الخزنة مطلوب' }, { status: 400 });
    }

    // 1. Fetch treasury
    const { data: treasury, error: fetchErr } = await supabase
      .from('treasuries')
      .select('*')
      .eq('id', id)
      .eq('company_id', user.company_id)
      .single();

    if (fetchErr || !treasury) {
      return NextResponse.json({ error: 'الخزنة المطلوبة غير موجودة' }, { status: 404 });
    }

    if (!treasury.is_active) {
      return NextResponse.json({ error: 'لا يمكن عمل تسوية لخزنة موقوفة أو معطلة' }, { status: 400 });
    }

    const body = await req.json();
    const {
      amount,
      type, // 'deposit' (فائض/إيداع تسوية) or 'withdrawal' / 'withdraw' (عجز/خصم تسوية)
      currency = 'EGP',
      reason,
      notes,
    } = body;

    const numAmount = parseFloat(Number(amount).toFixed(2));
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'مبلغ التسوية يجب أن يكون رقماً أكبر من 0' }, { status: 400 });
    }

    const adjReason = (reason || notes || '').trim();
    if (!adjReason) {
      return NextResponse.json({ error: 'سبب التسوية ومبررها المحاسبي مطلوب إلزامي' }, { status: 400 });
    }

    const cur = (currency || 'EGP').toUpperCase();
    const isWithdrawal = type === 'withdrawal' || type === 'withdraw';

    // 2. If withdrawal adjustment, check current balance of this currency in this treasury
    if (isWithdrawal) {
      const { data: transactions, error: txErr } = await supabase
        .from('treasury_transactions')
        .select('amount, currency, transaction_type')
        .eq('treasury_id', id)
        .eq('company_id', user.company_id)
        .eq('currency', cur)
        .eq('is_reversed', false);

      if (txErr) throw txErr;

      let currentCurBalance = 0;
      (transactions || []).forEach((tx: any) => {
        const amt = parseFloat(Number(tx.amount || 0).toFixed(2));
        if (['deposit', 'transfer_in', 'adjustment_in', 'adjustment_add'].includes(tx.transaction_type)) {
          currentCurBalance += amt;
        } else if (['withdraw', 'transfer_out', 'adjustment_out', 'adjustment_deduct'].includes(tx.transaction_type)) {
          currentCurBalance -= amt;
        }
      });

      if (numAmount > currentCurBalance) {
        return NextResponse.json(
          {
            error: `رصيد ${cur} المتاح في الخزنة (${currentCurBalance.toLocaleString()} ${cur}) لا يكفي لإجراء تسوية خصم بمبلغ ${numAmount.toLocaleString()} ${cur}`,
          },
          { status: 400 }
        );
      }
    }

    // 3. Insert transaction into treasury_transactions (Strict Financial Rule: balance changes logged as a transaction)
    const transactionType = isWithdrawal ? 'adjustment_out' : 'adjustment_in';
    const refNo = `ADJ-${Date.now().toString().slice(-6)}`;
    const fullNotes = `[تسوية رصيد ${isWithdrawal ? 'عجز/خصم' : 'فائض/إيداع'}] ${adjReason}`;

    const { data: newTransaction, error: insertErr } = await supabase
      .from('treasury_transactions')
      .insert({
        company_id: user.company_id,
        treasury_id: id,
        transaction_type: transactionType,
        amount: numAmount,
        currency: cur,
        exchange_rate_at_transaction: 1.0000,
        reference_number: refNo,
        notes: fullNotes,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json({
      success: true,
      message: `تم تسجيل تسوية الرصيد بنجاح (${isWithdrawal ? 'خصم' : 'إيداع'} ${numAmount.toLocaleString()} ${cur})`,
      transaction: newTransaction,
    });
  } catch (err: any) {
    console.error('Failed to adjust treasury balance:', err);
    return NextResponse.json({ error: err.message || 'فشل إجراء تسوية الرصيد' }, { status: 500 });
  }
}
