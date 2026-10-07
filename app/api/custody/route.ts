import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, userHasPermission, forbiddenResponse } from '@/lib/supabase-server';

// GET: Fetch list of employee custodies with employee details, treasury, expenses, and shipment info
export async function GET(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const { data: custodies, error: dbError } = await supabase
      .from('employee_custodies')
      .select(`
        *,
        employee:profiles!employee_custodies_employee_id_fkey(id, name, email, fingerprint),
        treasury:treasuries!employee_custodies_treasury_id_fkey(id, name, type),
        expenses:custody_expenses(
          *,
          shipment:shipments(
            id,
            bol_number,
            acid,
            declaration_number_46,
            client:clients(name)
          )
        )
      `)
      .eq('company_id', (user as any).company_id)
      .order('created_at', { ascending: false });

    if (dbError) throw dbError;

    // Format & compute dynamic balance for each custody
    const formatted = (custodies || []).map((c: any) => {
      const expensesList = Array.isArray(c.expenses) ? c.expenses : [];
      const totalSpent = expensesList
        .filter((e: any) => !e.is_reversed)
        .reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0);
      
      const totalIssued = parseFloat(c.amount) || 0;
      const remainingAmount = Math.max(0, totalIssued - totalSpent);
      const hasSettlementItem = expensesList.some((e: any) => e.expense_type === 'تسوية/استرداد متبقي' && !e.is_reversed);

      const formattedExpenses = expensesList
        .sort((a: any, b: any) => new Date(b.created_at || b.expense_date).getTime() - new Date(a.created_at || a.expense_date).getTime())
        .map((e: any) => ({
          id: e.id,
          custodyId: e.custody_id,
          description: e.description,
          amount: parseFloat(e.amount),
          currency: e.currency,
          expenseType: e.expense_type || 'عام',
          receiptNumber: e.receipt_number || null,
          expenseDate: e.expense_date,
          shipmentId: e.shipment_id,
          shipment: e.shipment ? {
            id: e.shipment.id,
            bolNumber: e.shipment.bol_number,
            acid: e.shipment.acid,
            declarationNumber46: e.shipment.declaration_number_46,
            clientName: e.shipment.client?.name || 'عميل',
          } : null,
          createdAt: e.created_at,
        }));

      return {
        id: c.id,
        employeeId: c.employee_id,
        employee: c.employee ? {
          id: c.employee.id,
          name: c.employee.name,
          email: c.employee.email,
          fingerprint: c.employee.fingerprint,
        } : null,
        treasuryId: c.treasury_id,
        treasury: c.treasury ? {
          id: c.treasury.id,
          name: c.treasury.name,
          type: c.treasury.type,
        } : null,
        amount: c.amount,
        totalIssued,
        totalSpent,
        remainingAmount,
        hasSettlementItem,
        currency: c.currency || 'EGP',
        status: c.status || 'open',
        issuedDate: c.issued_date || c.created_at,
        closedAt: c.closed_at,
        expenses: formattedExpenses,
        createdAt: c.created_at,
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Failed to list employee custodies:', error);
    if (error.code === '42501' || error.message?.includes('violates row-level security')) {
      return NextResponse.json({ error: 'غير مصرح لك بقراءة بيانات العهد' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'فشل جلب قائمة العهد' }, { status: 500 });
  }
}

// Helper function to calculate net balance for a treasury in a specific currency
async function getTreasuryCurrencyBalance(supabase: any, companyId: string, treasuryId: string, currency: string): Promise<number> {
  const { data: txs, error } = await supabase
    .from('treasury_transactions')
    .select('transaction_type, amount')
    .eq('company_id', companyId)
    .eq('treasury_id', treasuryId)
    .eq('currency', currency)
    .eq('is_reversed', false);

  if (error || !txs) return 0;

  return txs.reduce((sum: number, tx: any) => {
    const amt = parseFloat(tx.amount) || 0;
    if (tx.transaction_type === 'deposit' || tx.transaction_type === 'transfer_in') {
      return sum + amt;
    } else if (tx.transaction_type === 'withdraw' || tx.transaction_type === 'transfer_out') {
      return sum - amt;
    }
    return sum;
  }, 0);
}

// POST: Issue new custody with Treasury selection, pre-check balance, and optional multi-currency support
export async function POST(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    // RBAC: require custody.create or custody.issue permission
    if (!userHasPermission(user, 'custody.create') && !userHasPermission(user, 'custody.issue')) {
      return forbiddenResponse('غير مصرح لك بصرف عهدة جديدة');
    }

    const body = await req.json();
    const { employeeId, treasuryId, amount, currency = 'EGP', amounts, notes } = body;

    if (!employeeId) {
      return NextResponse.json({ error: 'يرجى اختيار الموظف المستلم' }, { status: 400 });
    }
    if (!treasuryId) {
      return NextResponse.json({ error: 'يرجى اختيار الخزنة المراد الصرف منها' }, { status: 400 });
    }

    // Normalize amounts to array: support single amount/currency or multi-currency array `amounts: [{ amount: 100, currency: 'USD' }, ...]`
    let itemsToDisburse: Array<{ amount: number; currency: string }> = [];
    if (Array.isArray(amounts) && amounts.length > 0) {
      itemsToDisburse = amounts
        .map((item: any) => ({
          amount: parseFloat(item.amount),
          currency: (item.currency || 'EGP').toUpperCase(),
        }))
        .filter((item) => !isNaN(item.amount) && item.amount > 0);
    } else if (amount && parseFloat(amount) > 0) {
      itemsToDisburse = [{ amount: parseFloat(amount), currency: (currency || 'EGP').toUpperCase() }];
    }

    if (itemsToDisburse.length === 0) {
      return NextResponse.json({ error: 'يرجى إدخال مبلغ صحيح على الأقل لصرف العهدة' }, { status: 400 });
    }

    // 1. Fetch Treasury details
    const { data: treasury, error: treasuryErr } = await supabase
      .from('treasuries')
      .select('id, name')
      .eq('id', treasuryId)
      .single();

    if (treasuryErr || !treasury) {
      return NextResponse.json({ error: 'الخزنة المختارة غير موجودة أو معطلة' }, { status: 404 });
    }

    // 2. Fetch Employee details
    const { data: employee, error: empErr } = await supabase
      .from('profiles')
      .select('id, name, email, fingerprint')
      .eq('id', employeeId)
      .single();

    if (empErr || !employee) {
      return NextResponse.json({ error: 'الموظف المحدد غير موجود' }, { status: 404 });
    }

    const companyId = (user as any).company_id;

    // 3. Pre-check Treasury Balance for EACH requested currency
    for (const item of itemsToDisburse) {
      const availableBalance = await getTreasuryCurrencyBalance(supabase, companyId, treasuryId, item.currency);
      if (availableBalance < item.amount) {
        return NextResponse.json(
          {
            error: `عفواً، رصيد عملة (${item.currency}) في خزنة "${treasury.name}" غير كافٍ للصرف. الرصيد المتاح حالياً: ${availableBalance.toLocaleString('ar-EG')} ${item.currency}، بينما المطلوب صرفه: ${item.amount.toLocaleString('ar-EG')} ${item.currency}.`,
          },
          { status: 400 }
        );
      }
    }

    // 4. Perform disbursement: create custody records and record withdrawal transactions for each currency
    const createdCustodies: any[] = [];
    const empName = employee.name || 'الموظف';
    const empFingerprint = employee.fingerprint || 100;
    const refNo = `CUST-${empFingerprint}`;

    for (const item of itemsToDisburse) {
      // Insert custody record
      const { data: newCustody, error: custodyErr } = await supabase
        .from('employee_custodies')
        .insert({
          company_id: companyId || null,
          employee_id: employeeId,
          treasury_id: treasuryId,
          amount: item.amount,
          currency: item.currency,
          status: 'open',
          issued_date: new Date().toISOString(),
          created_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (custodyErr) throw custodyErr;

      // Insert real withdrawal transaction in treasury_transactions for selected treasury
      const { data: treasuryTx, error: treasuryTxErr } = await supabase
        .from('treasury_transactions')
        .insert({
          company_id: companyId || null,
          treasury_id: treasuryId,
          transaction_type: 'withdraw',
          amount: item.amount,
          currency: item.currency,
          notes: `صرف عهدة نقدية للموظف: ${empName}_${empFingerprint} من خزنة ${treasury.name}${notes ? ` (${notes})` : ''}`,
          reference_number: refNo,
          transaction_date: new Date().toISOString().split('T')[0],
          created_by: user.id,
        })
        .select()
        .single();

      if (treasuryTxErr) throw treasuryTxErr;

      // Link treasury_transaction_id back to employee_custodies
      await supabase
        .from('employee_custodies')
        .update({ treasury_transaction_id: treasuryTx.id })
        .eq('id', newCustody.id);

      createdCustodies.push({
        ...newCustody,
        employee,
        treasury,
        totalIssued: item.amount,
        totalSpent: 0,
        remainingAmount: item.amount,
        hasSettlementItem: false,
        expenses: [],
      });
    }

    return NextResponse.json(
      {
        message: 'تم صرف العهدة وتسجيل سحب المبالغ من الخزنة بنجاح',
        custodies: createdCustodies,
        custody: createdCustodies[0], // Backward compatibility for single custody response
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to issue custody:', error);
    return NextResponse.json({ error: error.message || 'فشل صرف العهدة' }, { status: 500 });
  }
}
