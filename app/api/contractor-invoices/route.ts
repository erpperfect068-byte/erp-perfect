import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, userHasPermission, forbiddenResponse } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    if (!userHasPermission(user, 'contractors.invoices_view') && !userHasPermission(user, 'contractors.view')) {
      return forbiddenResponse('غير مصرح لك بعرض فواتير المقاولين');
    }

    const { searchParams } = new URL(req.url);
    const contractorId = searchParams.get('contractorId');
    const shipmentId = searchParams.get('shipmentId');
    const invoiceStatus = searchParams.get('status');

    let query = supabase
      .from('contractor_invoices')
      .select(`
        *,
        contractor:contractors(id, name, phone, tax_number, bank_accounts:contractor_bank_accounts(*)),
        shipment:shipments(id, bol_number, declaration_number_46, client:clients(id, name)),
        items:contractor_invoice_items(*),
        approver:profiles!contractor_invoices_approved_by_fkey(name, email)
      `)
      .order('created_at', { ascending: false });

    if (user.company_id) query = query.eq('company_id', user.company_id);
    if (contractorId) query = query.eq('contractor_id', contractorId);
    if (shipmentId) query = query.eq('shipment_id', shipmentId);
    if (invoiceStatus && invoiceStatus !== 'all') query = query.eq('status', invoiceStatus);

    const { data: invoices, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    const formatted = (invoices || []).map((inv: any) => {
      const total = Number(inv.total_amount) || 0;
      const paid = Number(inv.paid_amount) || 0;
      const remaining = Math.max(0, total - paid);

      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        invoiceDate: inv.invoice_date,
        totalAmount: total,
        paidAmount: paid,
        remainingAmount: remaining,
        currency: inv.currency || 'EGP',
        status: inv.status,
        approvedAt: inv.approved_at,
        approvedBy: inv.approver?.name || null,
        notes: inv.notes,
        contractorId: inv.contractor_id,
        contractor: inv.contractor,
        shipmentId: inv.shipment_id,
        shipment: inv.shipment,
        items: (inv.items || []).map((it: any) => ({
          id: it.id,
          itemType: it.item_type,
          description: it.description,
          amount: Number(it.amount) || 0,
          attachmentUrl: it.attachment_url,
          createdAt: it.created_at,
        })),
        createdAt: inv.created_at,
        updatedAt: inv.updated_at,
      };
    });

    return NextResponse.json({ success: true, invoices: formatted });
  } catch (err: any) {
    console.error('Failed to list contractor invoices:', err);
    return NextResponse.json({ error: err.message || 'فشل استرجاع فواتير المقاولين' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    if (!userHasPermission(user, 'contractors.invoices_create')) {
      return forbiddenResponse('غير مصرح لك بتسجيل فاتورة مقاول جديدة');
    }

    const body = await req.json();
    const {
      contractorId,
      shipmentId,
      invoiceNumber,
      invoiceDate,
      notes,
      items,
    } = body;

    if (!contractorId) return NextResponse.json({ error: 'يرجى تحديد المقاول' }, { status: 400 });
    if (!shipmentId) return NextResponse.json({ error: 'يرجى ربط الفاتورة بالشحنة (رقم البوليصة)' }, { status: 400 });
    if (!invoiceNumber || !invoiceNumber.trim()) {
      return NextResponse.json({ error: 'رقم الفاتورة مطلوب' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'يجب إضافة بند واحد على الأقل في الفاتورة' }, { status: 400 });
    }

    // Verify shipment exists and belongs to company
    const { data: shipment, error: shipErr } = await supabase
      .from('shipments')
      .select('id, bol_number')
      .eq('id', shipmentId)
      .single();

    if (shipErr || !shipment) {
      return NextResponse.json({ error: 'الشحنة المحددة غير موجودة' }, { status: 400 });
    }

    // Calculate total amount from items
    const validItems = items.filter((it: any) => it.description && Number(it.amount) >= 0);
    if (validItems.length === 0) {
      return NextResponse.json({ error: 'يرجى إدخال وصف ومبلغ صحيح لكل بند' }, { status: 400 });
    }

    const totalAmount = validItems.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);

    // 1. Insert Contractor Invoice
    const invoicePayload: any = {
      contractor_id: contractorId,
      shipment_id: shipmentId,
      invoice_number: invoiceNumber.trim(),
      invoice_date: invoiceDate || new Date().toISOString().split('T')[0],
      total_amount: totalAmount,
      paid_amount: 0,
      currency: 'EGP',
      status: 'pending',
      notes: notes ? notes.trim() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (user.company_id) invoicePayload.company_id = user.company_id;

    const { data: newInvoice, error: invErr } = await supabase
      .from('contractor_invoices')
      .insert(invoicePayload)
      .select()
      .single();

    if (invErr) throw invErr;

    // 2. Insert Invoice Items
    const itemsPayload = validItems.map((it: any) => ({
      invoice_id: newInvoice.id,
      item_type: it.itemType || 'transport',
      description: it.description.trim(),
      amount: Number(it.amount) || 0,
      attachment_url: it.attachmentUrl || null,
      created_at: new Date().toISOString(),
    }));

    const { error: itemsErr } = await supabase
      .from('contractor_invoice_items')
      .insert(itemsPayload);

    if (itemsErr) throw itemsErr;

    return NextResponse.json({
      success: true,
      message: 'تم تسجيل فاتورة المقاول بنجاح وهي قيد المراجعة',
      invoice: newInvoice,
    });
  } catch (err: any) {
    console.error('Failed to create contractor invoice:', err);
    return NextResponse.json({ error: err.message || 'فشل تسجيل فاتورة المقاول' }, { status: 500 });
  }
}
