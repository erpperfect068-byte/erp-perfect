import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';

// GET: Fetch list of employee custodies with employee details, expenses, and shipment info
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

// POST: Issue new custody & record withdrawal with CUST-fingerprint reference
export async function POST(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const body = await req.json();
    const { employeeId, amount, currency = 'EGP', notes } = body;

    if (!employeeId || !amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'يرجى تحديد الموظف ومبلغ العهدة بشكل صحيح' }, { status: 400 });
    }

    // 1. Insert custody record
    const { data: newCustody, error: custodyErr } = await supabase
      .from('employee_custodies')
      .insert({
        company_id: (user as any).company_id || null,
        employee_id: employeeId,
        amount: parseFloat(amount),
        currency: currency,
        status: 'open',
        issued_date: new Date().toISOString(),
        created_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .select('*, employee:profiles!employee_custodies_employee_id_fkey(id, name, email, fingerprint)')
      .single();

    if (custodyErr) throw custodyErr;

    const empName = newCustody.employee?.name || 'الموظف';
    const empFingerprint = newCustody.employee?.fingerprint || 100;
    const refNo = `CUST-${empFingerprint}`;

    // 2. Insert real withdrawal transaction in treasury_transactions with CUST-fingerprint reference
    const { data: treasuryTx, error: treasuryErr } = await supabase
      .from('treasury_transactions')
      .insert({
        company_id: (user as any).company_id || null,
        transaction_type: 'withdraw',
        amount: parseFloat(amount),
        currency: currency || 'EGP',
        notes: `صرف عهدة نقدية للموظف: ${empName}_${empFingerprint}${notes ? ` (${notes})` : ''}`,
        reference_number: refNo,
        transaction_date: new Date().toISOString().split('T')[0],
        created_by: user.id,
      })
      .select()
      .single();

    if (treasuryErr) throw treasuryErr;

    // 3. Link treasury_transaction_id back to employee_custodies
    await supabase
      .from('employee_custodies')
      .update({ treasury_transaction_id: treasuryTx.id })
      .eq('id', newCustody.id);

    return NextResponse.json({
      id: newCustody.id,
      employeeId: newCustody.employee_id,
      employee: newCustody.employee,
      amount: newCustody.amount,
      totalIssued: parseFloat(newCustody.amount),
      totalSpent: 0,
      remainingAmount: parseFloat(newCustody.amount),
      hasSettlementItem: false,
      currency: newCustody.currency,
      status: newCustody.status,
      issuedDate: newCustody.issued_date,
      expenses: [],
      createdAt: newCustody.created_at,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to issue custody:', error);
    return NextResponse.json({ error: error.message || 'فشل صرف العهدة' }, { status: 500 });
  }
}
