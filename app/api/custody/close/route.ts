import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, userHasPermission, forbiddenResponse } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    // RBAC: require custody.close permission
    if (!userHasPermission(user, 'custody.close')) {
      return forbiddenResponse('غير مصرح لك بإقفال العهدة وتوريد المتبقي للخزينة');
    }

    const body = await req.json();
    const { custodyId } = body;

    if (!custodyId) {
      return NextResponse.json({ error: 'معرف العهدة مطلوب' }, { status: 400 });
    }

    // 1. Fetch custody & expenses with employee profile (including fingerprint)
    const { data: custody, error: custodyErr } = await supabase
      .from('employee_custodies')
      .select('*, employee:profiles!employee_custodies_employee_id_fkey(name, fingerprint), expenses:custody_expenses(*)')
      .eq('id', custodyId)
      .single();

    if (custodyErr || !custody) {
      return NextResponse.json({ error: 'العهدة غير موجودة' }, { status: 404 });
    }

    const expensesList = Array.isArray(custody.expenses) ? custody.expenses : [];
    
    // Find settlement expense item if created during temp stage
    const settlementItem = expensesList.find(
      (e: any) => e.expense_type === 'تسوية/استرداد متبقي' && !e.is_reversed
    );

    // Calculate refund amount
    const totalSpentWithoutSettlement = expensesList
      .filter((e: any) => !e.is_reversed && e.expense_type !== 'تسوية/استرداد متبقي')
      .reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0);

    const totalIssued = parseFloat(custody.amount) || 0;
    const refundAmount = settlementItem
      ? parseFloat(settlementItem.amount)
      : Math.max(0, totalIssued - totalSpentWithoutSettlement);

    const empName = custody.employee?.name || 'الموظف';
    const empFingerprint = custody.employee?.fingerprint || 100;
    const refNo = `REF-${empFingerprint}`;

    // 2. Real Treasury Deposit: Insert deposit transaction using REF-fingerprint format
    if (refundAmount > 0) {
      const { error: depositErr } = await supabase
        .from('treasury_transactions')
        .insert({
          company_id: (user as any).company_id || null,
          transaction_type: 'deposit',
          amount: parseFloat(refundAmount.toFixed(2)),
          currency: custody.currency || 'EGP',
          notes: `توريد متبقي عهدة الموظف: ${empName}_${empFingerprint}`,
          reference_number: refNo,
          transaction_date: new Date().toISOString().split('T')[0],
          created_by: user.id,
        });

      if (depositErr) throw depositErr;
    }

    // 3. Update custody status to 'closed'
    const { data: updatedCustody, error: updateErr } = await supabase
      .from('employee_custodies')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', custodyId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      message: 'تم إقفال العهدة وتوريد المتبقي للخزينة بنجاح',
      custody: updatedCustody,
    });
  } catch (error: any) {
    console.error('Failed to close custody:', error);
    return NextResponse.json({ error: error.message || 'فشل إقفال العهدة' }, { status: 500 });
  }
}
