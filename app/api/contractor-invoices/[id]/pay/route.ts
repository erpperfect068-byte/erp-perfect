import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, userHasPermission, forbiddenResponse } from '@/lib/supabase-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    if (!userHasPermission(user, 'contractors.pay')) {
      return forbiddenResponse('غير مصرح لك بسداد وتحويل مستحقات المقاولين من الخزينة');
    }

    const { id: invoiceId } = await context.params;
    const body = await req.json();
    const { treasuryId, bankAccountId, amount, referenceNumber, notes } = body;

    if (!treasuryId) return NextResponse.json({ error: 'يرجى تحديد الخزنة المراد الصرف منها' }, { status: 400 });
    if (!bankAccountId) return NextResponse.json({ error: 'يرجى تحديد الحساب البنكي للمقاول المحول إليه' }, { status: 400 });

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return NextResponse.json({ error: 'يرجى إدخال مبلغ سداد صحيح أكبر من الصفر' }, { status: 400 });
    }

    // 1. Fetch Invoice
    const { data: invoice, error: invErr } = await supabase
      .from('contractor_invoices')
      .select('*, contractor:contractors(id, name), shipment:shipments(bol_number)')
      .eq('id', invoiceId)
      .single();

    if (invErr || !invoice) {
      return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });
    }

    if (invoice.status === 'pending') {
      return NextResponse.json({ error: 'يجب اعتماد وإقفال الفاتورة أولاً قبل سدادها' }, { status: 400 });
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'هذه الفاتورة تم سدادها بالكامل بالفعل' }, { status: 400 });
    }

    const currentTotal = Number(invoice.total_amount) || 0;
    const currentPaid = Number(invoice.paid_amount) || 0;
    const remaining = Math.max(0, currentTotal - currentPaid);

    if (payAmount > remaining + 0.001) {
      return NextResponse.json({
        error: `المبلغ المطلوب سداده (${payAmount} ج.م) أكبر من المتبقي على الفاتورة (${remaining} ج.م)`
      }, { status: 400 });
    }

    // 2. Fetch Bank Account
    const { data: bankAccount, error: bankErr } = await supabase
      .from('contractor_bank_accounts')
      .select('*')
      .eq('id', bankAccountId)
      .eq('contractor_id', invoice.contractor_id)
      .single();

    if (bankErr || !bankAccount) {
      return NextResponse.json({ error: 'الحساب البنكي المحدد للمقاول غير موجود' }, { status: 400 });
    }

    // 3. Verify Treasury Safe and Check Balance
    const { data: treasury, error: safeErr } = await supabase
      .from('treasuries')
      .select('*')
      .eq('id', treasuryId)
      .single();

    if (safeErr || !treasury) {
      return NextResponse.json({ error: 'الخزنة المحددة غير موجودة' }, { status: 400 });
    }

    // Calculate Safe EGP balance
    const { data: txs } = await supabase
      .from('treasury_transactions')
      .select('amount, currency, transaction_type, is_reversed')
      .eq('treasury_id', treasuryId)
      .eq('currency', 'EGP')
      .eq('is_reversed', false);

    let egpBalance = 0;
    (txs || []).forEach((t: any) => {
      const val = Number(t.amount) || 0;
      if (['deposit', 'transfer_in', 'adjustment_in', 'adjustment_add'].includes(t.transaction_type)) {
        egpBalance += val;
      } else if (['withdraw', 'transfer_out', 'adjustment_out', 'adjustment_deduct'].includes(t.transaction_type)) {
        egpBalance -= val;
      }
    });

    if (egpBalance < payAmount) {
      return NextResponse.json({
        error: `رصيد الخزنة (${treasury.name}) الحالي هو (${egpBalance.toLocaleString('ar-EG')} ج.م)، وهو غير كافٍ لسداد المبلغ المطلوب (${payAmount.toLocaleString('ar-EG')} ج.م).`
      }, { status: 400 });
    }

    // 4. Record Treasury Transaction (Withdraw)
    const txNotes = notes
      ? notes.trim()
      : `سداد فاتورة مقاول رقم (${invoice.invoice_number}) - شحنة (${invoice.shipment?.bol_number || 'بدون'}) - تحويل لحساب: ${bankAccount.bank_name} (${bankAccount.account_number})`;

    const { data: newTx, error: txErr } = await supabase
      .from('treasury_transactions')
      .insert({
        treasury_id: treasuryId,
        transaction_type: 'withdraw',
        amount: payAmount,
        currency: 'EGP',
        exchange_rate_at_transaction: 1.0,
        transaction_date: new Date().toISOString().split('T')[0],
        reference_number: referenceNumber ? referenceNumber.trim() : null,
        contractor_id: invoice.contractor_id,
        contractor_invoice_id: invoice.id,
        contractor_bank_account_id: bankAccountId,
        notes: txNotes,
        created_by: user.id,
        company_id: user.company_id || treasury.company_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (txErr) throw txErr;

    // 5. Update Invoice paid_amount and status
    const newPaidAmount = currentPaid + payAmount;
    const isFullyPaid = newPaidAmount >= (currentTotal - 0.001);

    const { data: updatedInvoice, error: updateInvErr } = await supabase
      .from('contractor_invoices')
      .update({
        paid_amount: newPaidAmount,
        status: isFullyPaid ? 'paid' : 'partially_paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoice.id)
      .select()
      .single();

    if (updateInvErr) throw updateInvErr;

    return NextResponse.json({
      success: true,
      message: `تم سداد المبلغ (${payAmount.toLocaleString('ar-EG')} ج.م) بنجاح وخصمه من الخزنة (${treasury.name}) وتوثيق التحويل لحساب (${bankAccount.bank_name}).`,
      transaction: newTx,
      invoice: updatedInvoice,
    });
  } catch (err: any) {
    console.error('Failed to pay contractor invoice:', err);
    return NextResponse.json({ error: err.message || 'فشل سداد فاتورة المقاول' }, { status: 500 });
  }
}
