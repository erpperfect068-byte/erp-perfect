import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, userHasPermission, forbiddenResponse } from '@/lib/supabase-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    if (!userHasPermission(user, 'contractors.view')) return forbiddenResponse();

    const { id: contractorId } = await context.params;
    const { data: accounts, error: err } = await supabase
      .from('contractor_bank_accounts')
      .select('*')
      .eq('contractor_id', contractorId)
      .order('is_default', { ascending: false });

    if (err) throw err;
    return NextResponse.json({ success: true, accounts: accounts || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'فشل استرجاع الحسابات البنكية' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    if (!userHasPermission(user, 'contractors.update')) return forbiddenResponse('غير مصرح لك بإضافة حسابات بنكية للمقاول');

    const { id: contractorId } = await context.params;
    const body = await req.json();
    const { bankName, accountNumber, iban, accountHolder, isDefault, notes } = body;

    if (!bankName || !accountNumber) {
      return NextResponse.json({ error: 'اسم البنك ورقم الحساب مطلوبان' }, { status: 400 });
    }

    if (isDefault) {
      // Unset previous defaults
      await supabase
        .from('contractor_bank_accounts')
        .update({ is_default: false })
        .eq('contractor_id', contractorId);
    }

    const { data: newAccount, error: insErr } = await supabase
      .from('contractor_bank_accounts')
      .insert({
        contractor_id: contractorId,
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        iban: iban ? iban.trim() : null,
        account_holder: accountHolder ? accountHolder.trim() : null,
        is_default: Boolean(isDefault),
        notes: notes ? notes.trim() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insErr) throw insErr;

    return NextResponse.json({ success: true, message: 'تم إضافة الحساب البنكي بنجاح', account: newAccount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'فشل إضافة الحساب البنكي' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    if (!userHasPermission(user, 'contractors.update')) return forbiddenResponse('غير مصرح لك بتعديل الحساب البنكي');

    const { id: contractorId } = await context.params;
    const body = await req.json();
    const { accountId, bankName, accountNumber, iban, accountHolder, isDefault, notes } = body;

    if (!accountId) {
      return NextResponse.json({ error: 'معرف الحساب البنكي مطلوب' }, { status: 400 });
    }

    if (isDefault) {
      await supabase
        .from('contractor_bank_accounts')
        .update({ is_default: false })
        .eq('contractor_id', contractorId);
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (bankName !== undefined) updates.bank_name = bankName.trim();
    if (accountNumber !== undefined) updates.account_number = accountNumber.trim();
    if (iban !== undefined) updates.iban = iban ? iban.trim() : null;
    if (accountHolder !== undefined) updates.account_holder = accountHolder ? accountHolder.trim() : null;
    if (isDefault !== undefined) updates.is_default = Boolean(isDefault);
    if (notes !== undefined) updates.notes = notes ? notes.trim() : null;

    const { data: updatedAccount, error: updateErr } = await supabase
      .from('contractor_bank_accounts')
      .update(updates)
      .eq('id', accountId)
      .eq('contractor_id', contractorId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, message: 'تم تحديث الحساب البنكي بنجاح', account: updatedAccount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'فشل تحديث الحساب البنكي' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    if (!userHasPermission(user, 'contractors.update')) return forbiddenResponse('غير مصرح لك بحذف الحساب البنكي');

    const { id: contractorId } = await context.params;
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'معرف الحساب البنكي مطلوب' }, { status: 400 });
    }

    const { error: delErr } = await supabase
      .from('contractor_bank_accounts')
      .delete()
      .eq('id', accountId)
      .eq('contractor_id', contractorId);

    if (delErr) throw delErr;

    return NextResponse.json({ success: true, message: 'تم حذف الحساب البنكي بنجاح' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'فشل حذف الحساب البنكي' }, { status: 500 });
  }
}
