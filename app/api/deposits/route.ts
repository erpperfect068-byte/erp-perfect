import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, userHasPermission, forbiddenResponse } from '@/lib/supabase-server';

// List Client Deposits
export async function GET(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const { data: depositsList, error: dbError } = await supabase
      .from('client_deposits')
      .select('*, client:clients(*), statement:statements(*, shipment:shipments(*))')
      .eq('company_id', (user as any).company_id)
      .order('created_at', { ascending: false });

    if (dbError) throw dbError;

    const formattedDeposits = (depositsList || []).map((dep: any) => ({
      ...dep,
      clientId: dep.client_id,
      statementId: dep.statement_id,
      amount: parseFloat(Number(dep.amount || 0).toFixed(2)),
      currency: dep.currency || 'EGP',
      exchangeRateAtTransaction: dep.exchange_rate_at_transaction,
      receiptNumber: dep.receipt_number,
      depositDate: dep.deposit_date,
      createdAt: dep.created_at,
      client: dep.client ? {
        ...dep.client,
        contactPerson: dep.client.contact_person,
        taxNumber: dep.client.tax_number,
      } : null,
      statement: dep.statement ? {
        ...dep.statement,
        shipmentId: dep.statement.shipment_id,
        statementDate: dep.statement.statement_date,
        totalAmount: dep.statement.total_amount,
        shipment: dep.statement.shipment,
      } : null,
    }));

    return NextResponse.json(formattedDeposits);
  } catch (error: any) {
    console.error('Failed to list deposits:', error);
    return NextResponse.json({ error: error.message || 'فشل جلب قائمة الإيداعات' }, { status: 500 });
  }
}

// Create Client Deposit & Inject into Treasury
export async function POST(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    // RBAC: require deposits.create permission
    if (!userHasPermission(user, 'deposits.create')) {
      return forbiddenResponse('غير مصرح لك بتسجيل أمانات وودائع العملاء');
    }

    const body = await req.json();
    const { clientId, statementId, amount, currency = 'EGP', exchangeRateAtTransaction = 1.0000, receiptNumber, notes } = body;

    if (!clientId || !amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'العميل والمبلغ (أكبر من 0) مطلوبان' }, { status: 400 });
    }

    const parsedAmount = parseFloat(Number(amount).toFixed(2));
    const parsedRate = parseFloat(Number(exchangeRateAtTransaction).toFixed(4));

    // 1. Insert Deposit record into client_deposits
    const { data: newDeposit, error: depErr } = await supabase
      .from('client_deposits')
      .insert({
        company_id: (user as any).company_id || null,
        client_id: clientId,
        statement_id: statementId || null,
        amount: parsedAmount,
        currency: currency || 'EGP',
        exchange_rate_at_transaction: parsedRate,
        receipt_number: receiptNumber || null,
        notes: notes || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (depErr) throw depErr;

    // 2. Reflect cash receipt in treasury_transactions (deposit type)
    const { error: trErr } = await supabase
      .from('treasury_transactions')
      .insert({
        company_id: (user as any).company_id || null,
        client_id: clientId,
        statement_id: statementId || null,
        transaction_type: 'deposit',
        amount: parsedAmount,
        currency: currency || 'EGP',
        exchange_rate_at_transaction: parsedRate,
        reference_number: receiptNumber || null,
        notes: `إيداع أمانة عميل: ${notes || ''}`,
        created_by: user.id,
      });

    if (trErr) console.warn('Failed to record automatic treasury transaction:', trErr);

    const formatted = {
      ...newDeposit,
      clientId: newDeposit.client_id,
      statementId: newDeposit.statement_id,
      receiptNumber: newDeposit.receipt_number,
      depositDate: newDeposit.deposit_date,
      createdAt: newDeposit.created_at,
    };

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Failed to create deposit:', error);
    return NextResponse.json({ error: error.message || 'فشل تسجيل الإيداع المالي' }, { status: 500 });
  }
}
