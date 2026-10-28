import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, userHasPermission, forbiddenResponse } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) return NextResponse.json({ error: error || 'غير مصرح' }, { status });

    let query = supabase
      .from('contractor_invoices')
      .select(`
        *,
        contractor:contractors(id, name, phone, bank_accounts:contractor_bank_accounts(*)),
        shipment:shipments(id, bol_number, declaration_number_46, client:clients(name)),
        items:contractor_invoice_items(*)
      `)
      .in('status', ['approved', 'partially_paid'])
      .order('approved_at', { ascending: false });

    if (user.company_id) query = query.eq('company_id', user.company_id);

    const { data: payables, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    let totalOutstanding = 0;
    const formatted = (payables || []).map((inv: any) => {
      const total = Number(inv.total_amount) || 0;
      const paid = Number(inv.paid_amount) || 0;
      const remaining = Math.max(0, total - paid);
      totalOutstanding += remaining;

      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        invoiceDate: inv.invoice_date,
        approvedAt: inv.approved_at,
        totalAmount: total,
        paidAmount: paid,
        remainingAmount: remaining,
        currency: inv.currency || 'EGP',
        status: inv.status,
        notes: inv.notes,
        contractor: inv.contractor,
        shipment: inv.shipment,
        itemsCount: (inv.items || []).length,
      };
    });

    return NextResponse.json({
      success: true,
      totalOutstandingDebt: totalOutstanding,
      count: formatted.length,
      payables: formatted,
    });
  } catch (err: any) {
    console.error('Failed to get contractor payables:', err);
    return NextResponse.json({ error: err.message || 'فشل استرجاع ديون المقاولين' }, { status: 500 });
  }
}
