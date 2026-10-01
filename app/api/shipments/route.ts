import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    // Query shipments with related tables
    const { data: shipmentsList, error: dbError } = await supabase
      .from('shipments')
      .select('*, client:clients(*), clientItem:client_items(*), port:ports(*), status:statuses(*), contractor:contractors(*), agency:agencies(*)')
      .eq('company_id', (user as any).company_id)
      .order('created_at', { ascending: false });

    if (dbError) throw dbError;

    // Map DB snake_case columns to camelCase expected by the frontend
    const formattedShipments = (shipmentsList || []).map((s: any) => ({
      ...s,
      clientId: s.client_id,
      clientItemId: s.client_item_id,
      invoiceValue: s.invoice_value,
      invoiceNumber: s.invoice_number,
      supplierName: s.supplier_name,
      acid: s.acid,
      declarationNumber46: s.declaration_number_46,
      containerCount: s.container_count,
      bolNumber: s.bol_number,
      arrivalDate: s.arrival_date,
      documentReceiptDate: s.document_receipt_date,
      portId: s.port_id,
      statusId: s.status_id,
      contractorId: s.contractor_id,
      agencyId: s.agency_id,
      currency: s.currency || 'USD',
      invoices: Array.isArray(s.invoices) ? s.invoices : [],
      notes: s.notes,
      createdAt: s.created_at,
      client: s.client ? {
        ...s.client,
        contactPerson: s.client.contact_person,
        taxNumber: s.client.tax_number,
      } : null,
      clientItem: s.clientItem ? {
        id: s.clientItem.id,
        name: s.clientItem.name,
      } : null,
      port: s.port,
      status: s.status,
      contractor: s.contractor,
      agency: s.agency,
    }));

    return NextResponse.json(formattedShipments);
  } catch (error: any) {
    console.error('Failed to list shipments:', error);
    if (error.code === '42501' || error.message?.includes('violates row-level security')) {
      return NextResponse.json({ error: 'غير مصرح لك بقراءة بيانات الشحنات' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'فشل جلب قائمة الشحنات' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const body = await req.json();
    const {
      clientId,
      clientItemId,
      invoices = [],
      invoiceValue,
      invoiceNumber,
      supplierName,
      acid,
      declarationNumber46,
      containerCount,
      bolNumber,
      arrivalDate,
      documentReceiptDate,
      portId,
      statusId,
      contractorId,
      agencyId,
      currency,
      notes,
    } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'اسم العميل المستورد مطلوب' }, { status: 400 });
    }

    // Process multi-currency invoices array
    const invoicesList = Array.isArray(invoices) ? invoices : [];
    const firstInvoice = invoicesList[0] || {};
    
    // Determine fallback values for legacy single-invoice fields
    const primaryInvoiceValue = firstInvoice.amount !== undefined && firstInvoice.amount !== ''
      ? parseFloat(firstInvoice.amount)
      : (invoiceValue ? parseFloat(invoiceValue) : null);
    
    const primaryInvoiceNumber = firstInvoice.invoiceNumber || invoiceNumber || null;
    const primarySupplierName = firstInvoice.supplierName || supplierName || null;
    const primaryCurrency = firstInvoice.currency || currency || 'USD';

    // 1. Insert Shipment
    const { data: newShipment, error: insertError } = await supabase
      .from('shipments')
      .insert({
        company_id: (user as any).company_id || null,
        client_id: clientId,
        client_item_id: clientItemId || null,
        invoice_value: primaryInvoiceValue,
        invoice_number: primaryInvoiceNumber,
        supplier_name: primarySupplierName,
        currency: primaryCurrency,
        invoices: invoicesList,
        acid: acid || null,
        declaration_number_46: declarationNumber46 || null,
        container_count: containerCount ? parseInt(containerCount) : null,
        bol_number: bolNumber || null,
        arrival_date: arrivalDate || null,
        document_receipt_date: documentReceiptDate || null,
        port_id: portId || null,
        status_id: statusId || null,
        contractor_id: contractorId || null,
        agency_id: agencyId || null,
        notes: notes || null,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 2. Auto-create empty Statement for this shipment
    await supabase.from('statements').insert({
      company_id: (user as any).company_id || null,
      shipment_id: newShipment.id,
      statement_date: new Date().toISOString().split('T')[0],
      currency: 'EGP',
      total_amount: 0.00,
      created_by: user.id,
      updated_by: user.id,
    });

    const formatted = {
      ...newShipment,
      clientId: newShipment.client_id,
      clientItemId: newShipment.client_item_id,
      invoiceValue: newShipment.invoice_value,
      invoiceNumber: newShipment.invoice_number,
      supplierName: newShipment.supplier_name,
      acid: newShipment.acid,
      declarationNumber46: newShipment.declaration_number_46,
      containerCount: newShipment.container_count,
      bolNumber: newShipment.bol_number,
      arrivalDate: newShipment.arrival_date,
      documentReceiptDate: newShipment.document_receipt_date,
      portId: newShipment.port_id,
      statusId: newShipment.status_id,
      contractorId: newShipment.contractor_id,
      agencyId: newShipment.agency_id,
      invoices: newShipment.invoices || [],
      createdAt: newShipment.created_at,
    };

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Failed to create shipment:', error);
    return NextResponse.json({ error: error.message || 'فشل إنشاء الشحنة الجمركية' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const body = await req.json();
    const { id, statusId, arrivalDate, declarationNumber46, contractorId, invoices, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف الشحنة مطلوب' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (statusId !== undefined) updatePayload.status_id = statusId;
    if (arrivalDate !== undefined) updatePayload.arrival_date = arrivalDate;
    if (declarationNumber46 !== undefined) updatePayload.declaration_number_46 = declarationNumber46;
    if (contractorId !== undefined) updatePayload.contractor_id = contractorId;
    if (notes !== undefined) updatePayload.notes = notes;
    if (Array.isArray(invoices)) updatePayload.invoices = invoices;

    const { data: updatedShipment, error: updateError } = await supabase
      .from('shipments')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updatedShipment);
  } catch (error: any) {
    console.error('Failed to update shipment:', error);
    return NextResponse.json({ error: error.message || 'فشل تحديث حالة الشحنة' }, { status: 500 });
  }
}
