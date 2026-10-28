import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, userHasPermission, forbiddenResponse } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    if (!userHasPermission(user, 'contractors.view')) {
      return forbiddenResponse('غير مصرح لك بعرض بيانات المقاولين');
    }

    // Fetch contractors for the company
    let query = supabase
      .from('contractors')
      .select(`
        *,
        bank_accounts:contractor_bank_accounts(*),
        rates:contractor_rates(*)
      `)
      .order('name', { ascending: true });

    if (user.company_id) {
      query = query.eq('company_id', user.company_id);
    }

    const { data: contractors, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    // Fetch approved unpaid debts for contractors
    const { data: unpaidInvoices } = await supabase
      .from('contractor_invoices')
      .select('id, contractor_id, total_amount, paid_amount, status')
      .in('status', ['approved', 'partially_paid']);

    // Map summary to each contractor
    const enhancedContractors = (contractors || []).map((c: any) => {
      const cInvoices = (unpaidInvoices || []).filter((inv: any) => inv.contractor_id === c.id);
      const totalDebt = cInvoices.reduce((sum: number, inv: any) => {
        const remaining = Number(inv.total_amount || 0) - Number(inv.paid_amount || 0);
        return sum + Math.max(0, remaining);
      }, 0);

      return {
        ...c,
        taxNumber: c.tax_number,
        bankAccounts: c.bank_accounts || [],
        rates: c.rates || [],
        unpaidInvoicesCount: cInvoices.length,
        totalOutstandingDebt: totalDebt,
      };
    });

    return NextResponse.json({
      success: true,
      contractors: enhancedContractors,
    });
  } catch (err: any) {
    console.error('Failed to list contractors:', err);
    return NextResponse.json({ error: err.message || 'فشل في استرجاع المقاولين' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    if (!userHasPermission(user, 'contractors.create')) {
      return forbiddenResponse('غير مصرح لك بإضافة مقاول جديد');
    }

    const body = await req.json();
    const { name, taxNumber, phone, address, notes, bankAccounts, rates } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'اسم المقاول مطلوب' }, { status: 400 });
    }

    // 1. Insert Contractor
    const contractorPayload: any = {
      name: name.trim(),
      tax_number: taxNumber ? taxNumber.trim() : null,
      phone: phone ? phone.trim() : null,
      address: address ? address.trim() : null,
      notes: notes ? notes.trim() : null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (user.company_id) {
      contractorPayload.company_id = user.company_id;
    }

    const { data: newContractor, error: insertErr } = await supabase
      .from('contractors')
      .insert(contractorPayload)
      .select()
      .single();

    if (insertErr) throw insertErr;

    // 2. Insert initial bank accounts if provided
    if (Array.isArray(bankAccounts) && bankAccounts.length > 0) {
      const bankInserts = bankAccounts
        .filter((b: any) => b.bankName && b.accountNumber)
        .map((b: any, idx: number) => ({
          contractor_id: newContractor.id,
          bank_name: b.bankName.trim(),
          account_number: b.accountNumber.trim(),
          iban: b.iban ? b.iban.trim() : null,
          account_holder: b.accountHolder ? b.accountHolder.trim() : null,
          is_default: b.isDefault ?? (idx === 0),
          notes: b.notes ? b.notes.trim() : null,
        }));

      if (bankInserts.length > 0) {
        await supabase.from('contractor_bank_accounts').insert(bankInserts);
      }
    }

    // 3. Insert initial rates if provided
    if (Array.isArray(rates) && rates.length > 0) {
      const rateInserts = rates
        .filter((r: any) => r.zoneName && Number(r.price) >= 0)
        .map((r: any) => ({
          contractor_id: newContractor.id,
          zone_name: r.zoneName.trim(),
          container_type: r.containerType || 'general',
          price: Number(r.price) || 0,
          currency: r.currency || 'EGP',
          notes: r.notes ? r.notes.trim() : null,
        }));

      if (rateInserts.length > 0) {
        await supabase.from('contractor_rates').insert(rateInserts);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'تم إضافة المقاول بنجاح',
      contractor: newContractor,
    });
  } catch (err: any) {
    console.error('Failed to create contractor:', err);
    return NextResponse.json({ error: err.message || 'فشل إضافة المقاول' }, { status: 500 });
  }
}
