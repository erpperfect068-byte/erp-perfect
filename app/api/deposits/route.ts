import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, userHasPermission, forbiddenResponse } from '@/lib/supabase-server';

function mapShipment(shipment: any) {
  if (!shipment) return null;
  return {
    ...shipment,
    id: shipment.id,
    bolNumber: shipment.bol_number ?? shipment.bolNumber ?? null,
    acid: shipment.acid ?? null,
    declarationNumber46: shipment.declaration_number_46 ?? shipment.declarationNumber46 ?? null,
    clientItem: shipment.clientItem || shipment.client_item || null,
  };
}

// List Client Deposits
export async function GET(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    if (!userHasPermission(user, 'deposits.view') && !userHasPermission(user, 'deposits.create')) {
      return forbiddenResponse('غير مصرح لك بعرض أمانات وودائع العملاء');
    }

    const statementIdFilter = req.nextUrl.searchParams.get('statementId');
    const clientIdFilter = req.nextUrl.searchParams.get('clientId');

    let query = supabase
      .from('client_deposits')
      .select('*, client:clients(*), statement:statements(*, shipment:shipments(*))')
      .eq('company_id', (user as any).company_id)
      .order('created_at', { ascending: false });

    if (statementIdFilter) {
      query = query.eq('statement_id', statementIdFilter);
    }
    if (clientIdFilter) {
      query = query.eq('client_id', clientIdFilter);
    }

    const { data: depositsList, error: dbError } = await query;

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
      client: dep.client
        ? {
            ...dep.client,
            contactPerson: dep.client.contact_person,
            taxNumber: dep.client.tax_number,
          }
        : null,
      statement: dep.statement
        ? {
            ...dep.statement,
            shipmentId: dep.statement.shipment_id,
            statementDate: dep.statement.statement_date,
            totalAmount: dep.statement.total_amount,
            shipment: mapShipment(dep.statement.shipment),
          }
        : null,
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

    if (!userHasPermission(user, 'deposits.create')) {
      return forbiddenResponse('غير مصرح لك بتسجيل أمانات وودائع العملاء');
    }

    const body = await req.json();
    const {
      clientId,
      statementId,
      shipmentId,
      amount,
      currency = 'EGP',
      exchangeRateAtTransaction = 1.0,
      receiptNumber,
      notes,
      treasuryId,
    } = body;

    if (!clientId || !amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'العميل والمبلغ (أكبر من 0) مطلوبان' }, { status: 400 });
    }

    const companyId = (user as any).company_id || null;
    let resolvedStatementId: string | null = statementId || null;

    // UI sends shipmentId for linked deposits — resolve to statement
    if (!resolvedStatementId && shipmentId) {
      const { data: statement, error: stErr } = await supabase
        .from('statements')
        .select('id, shipment_id')
        .eq('shipment_id', shipmentId)
        .maybeSingle();

      if (stErr) throw stErr;
      if (!statement) {
        return NextResponse.json(
          { error: 'لا يوجد كشف حساب مرتبط بهذه الشحنة. أنشئ الشحنة أولاً ثم أعد المحاولة.' },
          { status: 400 }
        );
      }
      resolvedStatementId = statement.id;
    }

    // Resolve treasury (default: company main vault)
    let selectedTreasuryId = treasuryId || null;
    if (!selectedTreasuryId) {
      let treasuryQuery = supabase.from('treasuries').select('id').eq('is_main', true);
      if (companyId) treasuryQuery = treasuryQuery.eq('company_id', companyId);
      const { data: mainT, error: mainErr } = await treasuryQuery.maybeSingle();
      if (mainErr) throw mainErr;
      selectedTreasuryId = mainT?.id || null;
    }

    if (!selectedTreasuryId) {
      return NextResponse.json(
        { error: 'لم يتم العثور على خزنة رئيسية لإيداع الأمانة. أضف خزنة رئيسية من إدارة الخزينة أولاً.' },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(Number(amount).toFixed(2));
    const parsedRate = parseFloat(Number(exchangeRateAtTransaction).toFixed(4));

    const { data: newDeposit, error: depErr } = await supabase
      .from('client_deposits')
      .insert({
        company_id: companyId,
        client_id: clientId,
        statement_id: resolvedStatementId,
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

    const { error: trErr } = await supabase.from('treasury_transactions').insert({
      company_id: companyId,
      treasury_id: selectedTreasuryId,
      client_id: clientId,
      statement_id: resolvedStatementId,
      transaction_type: 'deposit',
      amount: parsedAmount,
      currency: currency || 'EGP',
      exchange_rate_at_transaction: parsedRate,
      reference_number: receiptNumber || null,
      notes: `إيداع أمانة عميل: ${notes || ''}`,
      created_by: user.id,
    });

    if (trErr) {
      // Roll back deposit so cash and ledger stay aligned
      await supabase.from('client_deposits').delete().eq('id', newDeposit.id);
      console.error('Failed to record treasury transaction for deposit:', trErr);
      return NextResponse.json(
        { error: trErr.message || 'فشل تسجيل حركة الخزينة؛ لم يتم حفظ الأمانة' },
        { status: 500 }
      );
    }

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
