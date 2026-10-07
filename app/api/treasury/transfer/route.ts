import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, userHasPermission, forbiddenResponse } from '@/lib/supabase-server';

// POST /api/treasury/transfer - Inter-Treasury Transfer
export async function POST(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    if (!user.company_id) {
      return NextResponse.json({ error: 'لم يتم تحديد الشركة الخاصة بالمستخدم' }, { status: 400 });
    }

    if (!userHasPermission(user, 'treasury.transfer') && !userHasPermission(user, 'treasury.create')) {
      return forbiddenResponse('غير مصرح لك بإجراء تحويلات بين الخزن');
    }

    const body = await req.json();
    const {
      fromTreasuryId,
      toTreasuryId,
      fromCurrency = 'EGP',
      toCurrency = 'EGP',
      amount,
      exchangeRate = 1.0000,
      convertedAmount: clientConvertedAmount,
      referenceNumber,
      notes,
    } = body;

    // Validations
    if (!fromTreasuryId || !toTreasuryId) {
      return NextResponse.json({ error: 'الخزنة المصدر والخزنة الهدف مطلوبتان' }, { status: 400 });
    }

    if (fromTreasuryId === toTreasuryId) {
      return NextResponse.json({ error: 'لا يمكن التحويل لنفس الخزنة المصدر' }, { status: 400 });
    }

    const numAmount = parseFloat(Number(amount).toFixed(2));
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'مبلغ التحويل يجب أن يكون أكبر من 0' }, { status: 400 });
    }

    const numRate = parseFloat(Number(exchangeRate).toFixed(4));
    if (fromCurrency !== toCurrency && (isNaN(numRate) || numRate <= 0)) {
      return NextResponse.json({ error: 'سعر الصرف مطلوب ويجب أن يكون أكبر من 0 عند تحويل عملات مختلفة' }, { status: 400 });
    }

    // Fetch both treasuries and ensure they belong to user's company
    const { data: sourceTreasury, error: srcErr } = await supabase
      .from('treasuries')
      .select('*')
      .eq('id', fromTreasuryId)
      .eq('company_id', user.company_id)
      .single();

    if (srcErr || !sourceTreasury) {
      return NextResponse.json({ error: 'الخزنة المصدر غير موجودة أو لا تتبع لشركتك' }, { status: 404 });
    }

    const { data: targetTreasury, error: tgtErr } = await supabase
      .from('treasuries')
      .select('*')
      .eq('id', toTreasuryId)
      .eq('company_id', user.company_id)
      .single();

    if (tgtErr || !targetTreasury) {
      return NextResponse.json({ error: 'الخزنة الهدف غير موجودة أو لا تتبع لشركتك' }, { status: 404 });
    }

    // Check available balance in source treasury for fromCurrency
    const { data: sourceTxs } = await supabase
      .from('treasury_transactions')
      .select('amount, transaction_type, currency, is_reversed')
      .eq('company_id', user.company_id)
      .eq('treasury_id', fromTreasuryId)
      .eq('currency', fromCurrency)
      .eq('is_reversed', false);

    let currentSourceBalance = 0;
    (sourceTxs || []).forEach((tx: any) => {
      const amt = parseFloat(Number(tx.amount || 0).toFixed(2));
      if (['deposit', 'transfer_in'].includes(tx.transaction_type)) {
        currentSourceBalance += amt;
      } else if (['withdraw', 'transfer_out'].includes(tx.transaction_type)) {
        currentSourceBalance -= amt;
      }
    });

    if (currentSourceBalance < numAmount) {
      return NextResponse.json({
        error: `الرصيد المتاح في (${sourceTreasury.name}) بعملة ${fromCurrency} هو ${currentSourceBalance.toLocaleString()} فقط. لا يمكن تحويل ${numAmount.toLocaleString()}.`
      }, { status: 400 });
    }

    // Calculate converted destination amount
    let targetAmount = numAmount;
    if (fromCurrency !== toCurrency) {
      if (clientConvertedAmount && parseFloat(clientConvertedAmount) > 0) {
        targetAmount = parseFloat(Number(clientConvertedAmount).toFixed(2));
      } else {
        if (fromCurrency === 'USD' && toCurrency === 'EGP') {
          targetAmount = parseFloat((numAmount * numRate).toFixed(2));
        } else if (fromCurrency === 'EGP' && toCurrency === 'USD') {
          targetAmount = parseFloat((numAmount / numRate).toFixed(2));
        } else if (fromCurrency === 'EUR' && toCurrency === 'EGP') {
          targetAmount = parseFloat((numAmount * numRate).toFixed(2));
        } else if (fromCurrency === 'EGP' && toCurrency === 'EUR') {
          targetAmount = parseFloat((numAmount / numRate).toFixed(2));
        } else {
          targetAmount = parseFloat((numAmount * numRate).toFixed(2));
        }
      }
    }

    const transferGroupId = crypto.randomUUID();
    const refNo = referenceNumber || `TRF-${Date.now().toString().slice(-6)}`;

    // 1. Create Outflow Transaction (Source Treasury)
    const { data: outTx, error: outErr } = await supabase
      .from('treasury_transactions')
      .insert({
        company_id: user.company_id,
        treasury_id: fromTreasuryId,
        related_treasury_id: toTreasuryId,
        transaction_type: 'transfer_out',
        amount: numAmount,
        currency: fromCurrency,
        exchange_rate_at_transaction: numRate,
        reference_number: refNo,
        transfer_group_id: transferGroupId,
        notes: `تحويل صادرة إلى (${targetTreasury.name}) ${fromCurrency !== toCurrency ? `| سعر الصرف: ${numRate}` : ''} ${notes ? `| ${notes}` : ''}`,
        created_by: user.id,
      })
      .select()
      .single();

    if (outErr) throw outErr;

    // 2. Create Inflow Transaction (Target Treasury)
    const { data: inTx, error: inErr } = await supabase
      .from('treasury_transactions')
      .insert({
        company_id: user.company_id,
        treasury_id: toTreasuryId,
        related_treasury_id: fromTreasuryId,
        transaction_type: 'transfer_in',
        amount: targetAmount,
        currency: toCurrency,
        exchange_rate_at_transaction: numRate,
        reference_number: refNo,
        transfer_group_id: transferGroupId,
        notes: `تحويل واردة من (${sourceTreasury.name}) ${fromCurrency !== toCurrency ? `| سعر الصرف: ${numRate}` : ''} ${notes ? `| ${notes}` : ''}`,
        created_by: user.id,
      })
      .select()
      .single();

    if (inErr) throw inErr;

    return NextResponse.json({
      success: true,
      message: `تم تحويل ${numAmount.toLocaleString()} ${fromCurrency} من (${sourceTreasury.name}) إلى (${targetTreasury.name}) بنجاح ${fromCurrency !== toCurrency ? `(المبلغ الصافي: ${targetAmount.toLocaleString()} ${toCurrency})` : ''}`,
      outflow: outTx,
      inflow: inTx,
    });

  } catch (error: any) {
    console.error('Failed to execute treasury transfer:', error);
    return NextResponse.json({ error: error.message || 'فشل تنفيذ عملية التحويل بين الخزن' }, { status: 500 });
  }
}
