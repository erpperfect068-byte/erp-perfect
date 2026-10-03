import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, userHasPermission, forbiddenResponse } from '@/lib/supabase-server';

// List Treasury Transactions (IMMUTABLE LEDGER)
export async function GET(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const { data: txList, error: dbError } = await supabase
      .from('treasury_transactions')
      .select('*, client:clients(*), statement:statements(*, shipment:shipments(*))')
      .eq('company_id', (user as any).company_id)
      .order('transaction_date', { ascending: false });

    if (dbError) throw dbError;

    const formattedTransactions = (txList || []).map((tx: any) => ({
      ...tx,
      clientId: tx.client_id,
      statementId: tx.statement_id,
      transactionType: tx.transaction_type,
      amount: parseFloat(Number(tx.amount || 0).toFixed(2)),
      currency: tx.currency || 'EGP',
      exchangeRateAtTransaction: tx.exchange_rate_at_transaction,
      referenceNumber: tx.reference_number,
      isReversed: tx.is_reversed || false,
      reversedTransactionId: tx.reversed_transaction_id,
      reversalReason: tx.reversal_reason,
      transactionDate: tx.transaction_date,
      createdAt: tx.created_at,
      client: tx.client ? {
        ...tx.client,
        contactPerson: tx.client.contact_person,
        taxNumber: tx.client.tax_number,
      } : null,
      statement: tx.statement ? {
        ...tx.statement,
        shipmentId: tx.statement.shipment_id,
        statementDate: tx.statement.statement_date,
        totalAmount: tx.statement.total_amount,
        shipment: tx.statement.shipment,
      } : null,
    }));

    return NextResponse.json(formattedTransactions);
  } catch (error: any) {
    console.error('Failed to list treasury transactions:', error);
    return NextResponse.json({ error: error.message || 'فشل جلب سجل الخزينة' }, { status: 500 });
  }
}

// Record Money Movement (Deposit, Withdraw, or Reversal Entry)
export async function POST(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    // RBAC: require treasury.create permission
    if (!userHasPermission(user, 'treasury.create')) {
      return forbiddenResponse('غير مصرح لك بتسجيل حركات الخزينة');
    }

    const body = await req.json();
    const {
      transactionType,
      amount,
      currency = 'EGP',
      exchangeRateAtTransaction = 1.0000,
      referenceNumber,
      notes,
      clientId,
      statementId,
      action,
      targetTransactionId,
      reversalReason,
    } = body;

    // Handle Reversal Action (NO DIRECT UPDATE - REVERSAL ONLY)
    if (action === 'reversal' || transactionType === 'reversal') {
      if (!targetTransactionId) {
        return NextResponse.json({ error: 'معرف الحركة المراد عكسها مطلوب' }, { status: 400 });
      }

      // Fetch original transaction
      const { data: origTx, error: fetchErr } = await supabase
        .from('treasury_transactions')
        .select('*')
        .eq('id', targetTransactionId)
        .single();

      if (fetchErr || !origTx) {
        return NextResponse.json({ error: 'الحركة المراد عكسها غير موجودة' }, { status: 404 });
      }

      if (origTx.is_reversed) {
        return NextResponse.json({ error: 'هذه الحركة معكوسة بالفعل مسبقاً' }, { status: 400 });
      }

      const reverseType = origTx.transaction_type === 'deposit' ? 'withdraw' : 'deposit';
      const parsedAmount = parseFloat(Number(origTx.amount).toFixed(2));

      // 1. Insert reversing transaction
      const { data: revTx, error: revErr } = await supabase
        .from('treasury_transactions')
        .insert({
          company_id: (user as any).company_id || null,
          client_id: origTx.client_id,
          statement_id: origTx.statement_id,
          transaction_type: reverseType,
          amount: parsedAmount,
          currency: origTx.currency,
          exchange_rate_at_transaction: origTx.exchange_rate_at_transaction,
          reference_number: `REV-${origTx.reference_number || origTx.id.slice(0, 8)}`,
          notes: `قيد عكسي للحركة: ${reversalReason || 'إلغاء/تعديل محاسبي'}`,
          created_by: user.id,
        })
        .select()
        .single();

      if (revErr) throw revErr;

      // 2. Mark original transaction as reversed
      await supabase
        .from('treasury_transactions')
        .update({
          is_reversed: true,
          reversed_transaction_id: revTx.id,
          reversal_reason: reversalReason || 'تم إنشاء قيد عكسي',
        })
        .eq('id', origTx.id);

      return NextResponse.json({
        success: true,
        message: 'تم إضافة القيد العكسي ومنع التعديل المباشر وفق القواعد المالية',
        transaction: revTx
      });
    }

    // Normal Transaction Creation
    if (!transactionType || !amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'نوع الحركة والمبلغ (أكبر من 0) مطلوبان' }, { status: 400 });
    }

    const numAmount = parseFloat(Number(amount).toFixed(2));
    const numRate = parseFloat(Number(exchangeRateAtTransaction).toFixed(4));

    const { data: newTransaction, error: insertErr } = await supabase
      .from('treasury_transactions')
      .insert({
        company_id: (user as any).company_id || null,
        client_id: clientId || null,
        statement_id: statementId || null,
        transaction_type: transactionType,
        amount: numAmount,
        currency: currency || 'EGP',
        exchange_rate_at_transaction: numRate,
        reference_number: referenceNumber || null,
        notes: notes || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json(newTransaction);
  } catch (error: any) {
    console.error('Failed to create treasury transaction:', error);
    return NextResponse.json({ error: error.message || 'فشل تسجيل حركة الخزينة' }, { status: 500 });
  }
}
