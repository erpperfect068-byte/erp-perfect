import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, userHasPermission, forbiddenResponse } from '@/lib/supabase-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    if (!userHasPermission(user, 'contractors.view')) {
      return forbiddenResponse('غير مصرح لك بعرض بيانات المقاول');
    }

    const { id } = await context.params;

    const { data: contractor, error: fetchErr } = await supabase
      .from('contractors')
      .select(`
        *,
        bank_accounts:contractor_bank_accounts(*),
        rates:contractor_rates(*),
        invoices:contractor_invoices(*, shipment:shipments(id, bol_number, declaration_number_46, client:clients(name)))
      `)
      .eq('id', id)
      .single();

    if (fetchErr || !contractor) {
      return NextResponse.json({ error: 'المقاول غير موجود' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      contractor: {
        ...contractor,
        taxNumber: contractor.tax_number,
        bankAccounts: contractor.bank_accounts || [],
        rates: contractor.rates || [],
        invoices: contractor.invoices || [],
      },
    });
  } catch (err: any) {
    console.error('Failed to get contractor:', err);
    return NextResponse.json({ error: err.message || 'فشل استرجاع المقاول' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    if (!userHasPermission(user, 'contractors.update')) {
      return forbiddenResponse('غير مصرح لك بتعديل بيانات المقاول');
    }

    const { id } = await context.params;
    const body = await req.json();
    const { name, taxNumber, phone, address, notes, isActive } = body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) {
      if (!name || !name.trim()) return NextResponse.json({ error: 'اسم المقاول لا يمكن أن يكون فارغاً' }, { status: 400 });
      updates.name = name.trim();
    }
    if (taxNumber !== undefined) updates.tax_number = taxNumber ? taxNumber.trim() : null;
    if (phone !== undefined) updates.phone = phone ? phone.trim() : null;
    if (address !== undefined) updates.address = address ? address.trim() : null;
    if (notes !== undefined) updates.notes = notes ? notes.trim() : null;
    if (isActive !== undefined) updates.is_active = Boolean(isActive);

    const { data: updatedContractor, error: updateErr } = await supabase
      .from('contractors')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      message: 'تم تحديث بيانات المقاول بنجاح',
      contractor: updatedContractor,
    });
  } catch (err: any) {
    console.error('Failed to update contractor:', err);
    return NextResponse.json({ error: err.message || 'فشل تحديث بيانات المقاول' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    if (!userHasPermission(user, 'contractors.delete')) {
      return forbiddenResponse('غير مصرح لك بحذف هذا المقاول');
    }

    const { id } = await context.params;

    // Safety checks: check if linked to shipments
    const { count: shipmentsCount } = await supabase
      .from('shipments')
      .select('*', { count: 'exact', head: true })
      .eq('contractor_id', id);

    if (shipmentsCount && shipmentsCount > 0) {
      return NextResponse.json({
        error: `لا يمكن حذف هذا المقاول لأنه مرتبط بـ (${shipmentsCount}) شحنة مسجلة. يمكنك تعطيل حسابه بدلاً من الحذف.`
      }, { status: 400 });
    }

    // Safety checks: check if linked to invoices
    const { count: invoicesCount } = await supabase
      .from('contractor_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('contractor_id', id);

    if (invoicesCount && invoicesCount > 0) {
      return NextResponse.json({
        error: `لا يمكن حذف هذا المقاول لوجود (${invoicesCount}) فواتير مالية مسجلة باسمه.`
      }, { status: 400 });
    }

    const { error: deleteErr } = await supabase
      .from('contractors')
      .delete()
      .eq('id', id);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({
      success: true,
      message: 'تم حذف المقاول بنجاح',
    });
  } catch (err: any) {
    console.error('Failed to delete contractor:', err);
    return NextResponse.json({ error: err.message || 'فشل حذف المقاول' }, { status: 500 });
  }
}
