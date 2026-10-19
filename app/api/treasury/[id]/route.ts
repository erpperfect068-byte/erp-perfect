import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, userHasPermission, forbiddenResponse } from '@/lib/supabase-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/treasury/[id] - Update Treasury Metadata (Strict Rule: NO BALANCE EDITING)
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    if (!user.company_id) {
      return NextResponse.json({ error: 'لم يتم تحديد الشركة الخاصة بالمستخدم' }, { status: 400 });
    }

    // RBAC: Check treasury.edit or treasury.manage_safes
    if (!userHasPermission(user, 'treasury.edit') && !userHasPermission(user, 'treasury.manage_safes')) {
      return forbiddenResponse('غير مصرح لك بتعديل بيانات الخزنة');
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'معرف الخزنة مطلوب' }, { status: 400 });
    }

    // Fetch existing treasury
    const { data: existingTreasury, error: fetchErr } = await supabase
      .from('treasuries')
      .select('*')
      .eq('id', id)
      .eq('company_id', user.company_id)
      .single();

    if (fetchErr || !existingTreasury) {
      return NextResponse.json({ error: 'الخزنة المطلوبة غير موجودة' }, { status: 404 });
    }

    const body = await req.json();

    // Financial Rule 1: A Treasury's balance CANNOT be edited directly.
    if ('balance' in body || 'balances' in body || 'amount' in body) {
      return NextResponse.json(
        { error: 'ممنوع تعديل الرصيد المالي مباشرة. يجب تسجيل الحركات المحاسبية أو عمل تسوية رصيد مسجلة.' },
        { status: 400 }
      );
    }

    const { name, code, type, notes, isActive } = body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return NextResponse.json({ error: 'اسم الخزنة لا يمكن أن يكون فارغاً' }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (code !== undefined) {
      updates.code = code ? code.trim() : null;
    }

    if (type !== undefined) {
      updates.type = type === 'bank' ? 'bank' : 'cash';
    }

    if (notes !== undefined) {
      updates.notes = notes ? notes.trim() : null;
    }

    if (isActive !== undefined) {
      updates.is_active = Boolean(isActive);
    }

    const { data: updatedTreasury, error: updateErr } = await supabase
      .from('treasuries')
      .update(updates)
      .eq('id', id)
      .eq('company_id', user.company_id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      message: 'تم تحديث بيانات الخزنة بنجاح',
      treasury: updatedTreasury,
    });
  } catch (err: any) {
    console.error('Failed to update treasury:', err);
    return NextResponse.json({ error: err.message || 'فشل تحديث الخزنة' }, { status: 500 });
  }
}

// DELETE /api/treasury/[id] - Delete Treasury with Strict Non-Zero Balance Constraint
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    if (!user.company_id) {
      return NextResponse.json({ error: 'لم يتم تحديد الشركة الخاصة بالمستخدم' }, { status: 400 });
    }

    // RBAC: Check treasury.delete or treasury.manage_safes
    if (!userHasPermission(user, 'treasury.delete') && !userHasPermission(user, 'treasury.manage_safes')) {
      return forbiddenResponse('غير مصرح لك بحذف الخزنة');
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
      return NextResponse.json({ error: 'الخزنة المراد حذفها غير موجودة' }, { status: 404 });
    }

    if (treasury.is_main) {
      return NextResponse.json({ error: 'لا يمكن حذف الخزنة الرئيسية للشركة' }, { status: 400 });
    }

    // 2. Fetch all valid transactions to calculate current balance across all currencies
    const { data: transactions, error: txErr } = await supabase
      .from('treasury_transactions')
      .select('amount, currency, transaction_type')
      .eq('treasury_id', id)
      .eq('company_id', user.company_id)
      .eq('is_reversed', false);

    if (txErr) throw txErr;

    const balances: Record<string, number> = { EGP: 0, USD: 0, EUR: 0 };

    (transactions || []).forEach((tx: any) => {
      const cur = (tx.currency || 'EGP').toUpperCase();
      const amt = parseFloat(Number(tx.amount || 0).toFixed(2));
      const type = tx.transaction_type;

      if (!balances[cur]) balances[cur] = 0;

      if (['deposit', 'transfer_in', 'adjustment_in', 'adjustment_add'].includes(type)) {
        balances[cur] += amt;
      } else if (['withdraw', 'transfer_out', 'adjustment_out', 'adjustment_deduct'].includes(type)) {
        balances[cur] -= amt;
      }
    });

    // Financial Rule 2: A Treasury CANNOT be deleted if its balance > 0 (or != 0)
    const hasRemainingBalance = Object.entries(balances).some(
      ([_, bal]) => Math.abs(bal) > 0.001
    );

    if (hasRemainingBalance) {
      const balanceSummary = Object.entries(balances)
        .filter(([_, bal]) => Math.abs(bal) > 0.001)
        .map(([cur, bal]) => `${bal.toLocaleString()} ${cur}`)
        .join(', ');

      return NextResponse.json(
        {
          error: `Cannot delete a treasury with a non-zero balance. Transfer funds first. (المتبقي: ${balanceSummary})`,
        },
        { status: 400 }
      );
    }

    // 3. If balance == 0, check for historical ledger transactions
    const { count: txCount } = await supabase
      .from('treasury_transactions')
      .select('*', { count: 'exact', head: true })
      .or(`treasury_id.eq.${id},related_treasury_id.eq.${id}`);

    if ((txCount || 0) > 0) {
      // Soft-delete to preserve ledger integrity & foreign key constraints
      const { error: softDeleteErr } = await supabase
        .from('treasuries')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (softDeleteErr) throw softDeleteErr;

      return NextResponse.json({
        success: true,
        message: 'تم تصفية وتعطيل الخزنة بنجاح وحفظ سجل قيودها السابقة.',
      });
    }

    // If completely clean with no historical transactions, hard delete
    const { error: deleteErr } = await supabase
      .from('treasuries')
      .delete()
      .eq('id', id)
      .eq('company_id', user.company_id);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({
      success: true,
      message: 'تم حذف الخزنة نهائياً بنجاح.',
    });
  } catch (err: any) {
    console.error('Failed to delete treasury:', err);
    return NextResponse.json({ error: err.message || 'فشل حذف الخزنة' }, { status: 500 });
  }
}
