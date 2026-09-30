import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    // 1. Fetch test accounts
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id, email, name');
    const getUserId = (email: string) => profiles?.find((p) => p.email === email)?.id;

    const adminId = getUserId('admin@test.local') || profiles?.[0]?.id;
    const accountantId = getUserId('accountant@test.local') || adminId;
    const clearanceId = getUserId('clearance@test.local') || adminId;
    const dataentryId = getUserId('dataentry@test.local') || adminId;

    if (!adminId) {
      return NextResponse.json({ error: 'لم يتم العثور على حسابات المستخدمين الأساسية' }, { status: 400 });
    }

    // 2. Clear operational tables in FK-safe order (EXCLUDING audit_log and roles/profiles)
    const tablesToDelete = [
      'custody_expenses',
      'employee_custodies',
      'statement_items',
      'statements',
      'client_deposits',
      'treasury_transactions',
      'shipments',
      'client_pricing',
      'client_items',
      'clients',
      'ports',
      'agencies',
      'contractors',
      'statuses',
    ];

    for (const table of tablesToDelete) {
      await supabaseAdmin.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    // 3. Seed Ports
    const { data: portsData, error: portsErr } = await supabaseAdmin.from('ports').insert([
      { name: 'ميناء الإسكندرية البحري' },
      { name: 'ميناء العين السخنة' },
      { name: 'ميناء دمياط البحري' },
      { name: 'ميناء بورسعيد غرب' },
      { name: 'قرية البضائع - مطار القاهرة' },
    ]).select();

    if (portsErr) throw portsErr;
    const [portAlex, portSokhna, portDamietta] = portsData;

    // 4. Seed Agencies
    const { data: agenciesData, error: agErr } = await supabaseAdmin.from('agencies').insert([
      { name: 'توكيل ميرسك مصر (Maersk Line)' },
      { name: 'توكيل إم إس سي مصر (MSC Shipping)' },
      { name: 'سي إم إيه للتوكيلات الملاحية (CMA CGM)' },
      { name: 'هاباج لويد (Hapag-Lloyd Egypt)' },
    ]).select();

    if (agErr) throw agErr;
    const [agencyMaersk, agencyMSC, agencyCMA] = agenciesData;

    // 5. Seed Contractors
    const { data: contractorsData, error: contErr } = await supabaseAdmin.from('contractors').insert([
      { name: 'شركة الفرسان للنقل الثقيل والحاويات' },
      { name: 'مؤسسة السلام للعتالة وتعتيق البضائع' },
      { name: 'النيل لخدمات الفحص والتخزين الجمركي' },
    ]).select();

    if (contErr) throw contErr;
    const [contractorTransport] = contractorsData;

    // 6. Seed Statuses
    const { data: statusesData, error: stErr } = await supabaseAdmin.from('statuses').insert([
      { name: 'وصول الباخرة وتفريغ الحاويات', color: '#2563eb' },
      { name: 'كشف ومعاينة وفحص رقابي', color: '#d97706' },
      { name: 'سداد الضرائب والرسوم الجمركية', color: '#7c3aed' },
      { name: 'إفراج نهائي وخروج من المنفذ', color: '#059669' },
      { name: 'بانتظار استكمال المستندات الأصلية', color: '#dc2626' },
    ]).select();

    if (stErr) throw stErr;
    const [stArrival, stInspection, stTaxPayment, stReleased] = statusesData;

    // 7. Seed Clients, Client Items, Client Pricing
    // Client 1: Nile Foods
    const { data: clientNile } = await supabaseAdmin.from('clients').insert({
      name: 'شركة النيل الدولية للصناعات الغذائية',
      contact_person: 'أ. طارق عبد الرحمن',
      phone: '01012345678',
      email: 'import@nile-foods.com.eg',
      address: 'المنطقة الصناعية الثالثة، مدينة السادس من أكتوبر، الجيزة',
      tax_number: '100-245-890',
      notes: 'عميل رئيسي، يتم سداد الفواتير خلال أسبوع من الإفراج الجمركي.',
      created_by: adminId,
      updated_by: adminId,
    }).select().single();

    const { data: itemMeat } = await supabaseAdmin.from('client_items').insert({
      client_id: clientNile.id,
      name: 'لحوم مجمدة معبأة',
    }).select().single();

    await supabaseAdmin.from('client_pricing').insert([
      { client_id: clientNile.id, service_name: 'أتعاب التخليص الجمركي للشحنة', default_amount: 5000.00, currency: 'EGP' },
      { client_id: clientNile.id, service_name: 'نولون نقل الحاوية من الميناء للمصنع', default_amount: 4500.00, currency: 'EGP' },
    ]);

    // Client 2: Electro Egypt
    const { data: clientElectro } = await supabaseAdmin.from('clients').insert({
      name: 'المجموعة المصرية لتجارة الأجهزة الكهربائية',
      contact_person: 'المهندس كريم الشناوي',
      phone: '01229876543',
      email: 'procurement@electro-egypt.com',
      address: 'شارع عبد العزيز، العتبة، القاهرة',
      tax_number: '210-983-451',
      created_by: adminId,
      updated_by: adminId,
    }).select().single();

    const { data: itemScreens } = await supabaseAdmin.from('client_items').insert({
      client_id: clientElectro.id,
      name: 'شاشات تلفزيون سمارت 4K',
    }).select().single();

    await supabaseAdmin.from('client_pricing').insert([
      { client_id: clientElectro.id, service_name: 'أتعاب التخليص الجمركي للأجهزة', default_amount: 6500.00, currency: 'EGP' },
    ]);

    // 8. Seed Shipments & Statements
    const { data: shipment1 } = await supabaseAdmin.from('shipments').insert({
      client_id: clientNile.id,
      client_item_id: itemMeat.id,
      invoice_value: 45000.00,
      invoice_number: 'INV-BRA-9901',
      supplier_name: 'JBS Foods Brazil S.A.',
      acid: '9948271034',
      declaration_number_46: '12048/2026',
      container_count: 2,
      bol_number: 'MEDU1029384',
      arrival_date: '2026-09-20',
      port_id: portAlex.id,
      status_id: stInspection.id,
      contractor_id: contractorTransport.id,
      agency_id: agencyMSC.id,
      currency: 'USD',
      created_by: clearanceId,
      updated_by: clearanceId,
    }).select().single();

    const { data: stmt1 } = await supabaseAdmin.from('statements').insert({
      shipment_id: shipment1.id,
      statement_date: '2026-09-21',
      currency: 'EGP',
      total_amount: 112000.00,
      created_by: accountantId,
      updated_by: accountantId,
    }).select().single();

    await supabaseAdmin.from('statement_items').insert([
      {
        statement_id: stmt1.id,
        item_type: 'expense',
        description: 'سداد ضريبة الوارد الجمركية وضريبة القيمة المضافة (نافذة)',
        amount: 85000.00,
        currency: 'EGP',
        external_receipt_number: 'TAX-NAF-8812',
        created_by: accountantId,
      },
      {
        statement_id: stmt1.id,
        item_type: 'fee',
        description: 'أتعاب التخليص الجمركي المتفق عليها للمكتب',
        amount: 5000.00,
        currency: 'EGP',
        created_by: accountantId,
      },
    ]);

    // 9. Seed Deposits & Treasury Transactions
    await supabaseAdmin.from('client_deposits').insert({
      client_id: clientElectro.id,
      amount: 150000.00,
      currency: 'EGP',
      deposit_date: '2026-09-22',
      receipt_number: 'DEP-GEN-2026-01',
      notes: 'أمانة عامة مفتوحة بحساب المجموعة المصرية للتخليص.',
      created_by: accountantId,
    });

    await supabaseAdmin.from('treasury_transactions').insert([
      {
        client_id: clientElectro.id,
        transaction_type: 'deposit',
        amount: 150000.00,
        currency: 'EGP',
        reference_number: 'DEP-GEN-2026-01',
        notes: 'استلام أمانة عامة نقداً من المجموعة المصرية',
        created_by: accountantId,
      },
      {
        client_id: clientNile.id,
        statement_id: stmt1.id,
        transaction_type: 'withdraw',
        amount: 85000.00,
        currency: 'EGP',
        reference_number: 'TAX-NAF-8812',
        notes: 'سداد ضريبة الجمارك عبر نافذة',
        created_by: accountantId,
      },
    ]);

    // 10. Seed Employee Custody & Expenses
    const { data: custody1 } = await supabaseAdmin.from('employee_custodies').insert({
      employee_id: clearanceId,
      amount: 10000.00,
      currency: 'EGP',
      status: 'open',
      created_by: accountantId,
    }).select().single();

    await supabaseAdmin.from('custody_expenses').insert([
      {
        custody_id: custody1.id,
        description: 'رسوم تعتيق وكشف عينات الحاوية بميناء الإسكندرية',
        amount: 1500.00,
        currency: 'EGP',
        shipment_id: shipment1.id,
        created_by: clearanceId,
      },
      {
        custody_id: custody1.id,
        description: 'إكراميات وسحب إيصالات تفريغ ميرسك',
        amount: 500.00,
        currency: 'EGP',
        created_by: clearanceId,
      },
    ]);

    return NextResponse.json({
      success: true,
      message: 'تم تزويد وتهيئة البيانات التشغيلية التجريبية بنجاح!',
    });
  } catch (error: any) {
    console.error('Failed to seed demo data:', error);
    return NextResponse.json({ error: error.message || 'فشل تحميل البيانات التجريبية' }, { status: 500 });
  }
}
