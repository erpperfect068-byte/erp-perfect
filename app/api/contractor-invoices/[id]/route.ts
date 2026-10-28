import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, userHasPermission, forbiddenResponse } from '@/lib/supabase-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    if (!userHasPermission(user, 'contractors.invoices_view') && !userHasPermission(user, 'contractors.view')) {
      return forbiddenResponse();
    }

    const { id } = await context.params;

    const { data: invoice, error: fetchErr } = await supabase
      .from('contractor_invoices')
      .select(`
        *,
        contractor:contractors(*, bank_accounts:contractor_bank_accounts(*)),
        shipment:shipments(*, client:clients(name)),
        items:contractor_invoice_items(*),
        payments:treasury_transactions(*, treasury:treasuries(name), bank_account:contractor_bank_accounts(*))
      `)
      .eq('id', id)
      .single();

    if (fetchErr || !invoice) {
      return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ success: true, invoice });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'فشل استرجاع الفاتورة' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    if (!userHasPermission(user, 'contractors.invoices_edit')) {
      return forbiddenResponse('غير مصرح لك بتعديل فاتورة المقاول');
    }

    const { id } = await context.params;
    const body = await req.json();
    const { invoiceNumber, invoiceDate, notes, items } = body;

    // Check existing invoice status
    const { data: existing, error: fetchErr } = await supabase
      .from('contractor_invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });

    if (existing.status === 'paid') {
      return NextResponse.json({ error: 'لا يمكن تعديل فاتورة تم سدادها بالكامل' }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (invoiceNumber !== undefined) updates.invoice_number = invoiceNumber.trim();
    if (invoiceDate !== undefined) updates.invoice_date = invoiceDate;
    if (notes !== undefined) updates.notes = notes ? notes.trim() : null;

    // If items are being updated and invoice is still pending
    if (Array.isArray(items)) {
      if (existing.status !== 'pending' && user.role !== 'admin') {
        return NextResponse.json({ error: 'لا يمكن تعديل بنود فاتورة تم اعتمادها إلا من قبل مدير النظام' }, { status: 400 });
      }

      const validItems = items.filter((it: any) => it.description && Number(it.amount) >= 0);
      const newTotal = validItems.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);
      updates.total_amount = newTotal;

      // Replace items
      await supabase.from('contractor_invoice_items').delete().eq('invoice_id', id);

      const itemsPayload = validItems.map((it: any) => ({
        invoice_id: id,
        item_type: it.itemType || 'transport',
        description: it.description.trim(),
        amount: Number(it.amount) || 0,
        attachment_url: it.attachmentUrl || null,
        created_at: new Date().toISOString(),
      }));

      if (itemsPayload.length > 0) {
        await supabase.from('contractor_invoice_items').insert(itemsPayload);
      }
    }

    const { data: updatedInvoice, error: updateErr } = await supabase
      .from('contractor_invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, message: 'تم تحديث الفاتورة بنجاح', invoice: updatedInvoice });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'فشل تحديث الفاتورة' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    if (!userHasPermission(user, 'contractors.invoices_delete')) {
      return forbiddenResponse('غير مصرح لك بحذف فاتورة المقاول');
    }

    const { id } = await context.params;

    const { data: existing, error: fetchErr } = await supabase
      .from('contractor_invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });

    if (existing.status === 'paid' || Number(existing.paid_amount) > 0) {
      return NextResponse.json({ error: 'لا يمكن حذف فاتورة تم سداد مبالغ منها بالفعل' }, { status: 400 });
    }

    const { error: delErr } = await supabase
      .from('contractor_invoices')
      .delete()
      .eq('id', id);

    if (delErr) throw delErr;

    return NextResponse.json({ success: true, message: 'تم حذف الفاتورة بنجاح' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'فشل حذف الفاتورة' }, { status: 500 });
  }
}
