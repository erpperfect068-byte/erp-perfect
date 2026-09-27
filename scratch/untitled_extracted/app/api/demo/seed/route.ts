import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import {
  users,
  ports,
  agencies,
  contractors,
  statuses,
  clients,
  clientItems,
  clientPricing,
  shipments,
  statements,
  statementItems,
  clientDeposits,
  treasuryTransactions,
  auditLog,
} from '@/src/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    // 1. Ensure Demo Admin User exists
    let [adminUser] = await db.select().from(users).where(eq(users.uid, 'demo-admin-uid'));
    if (!adminUser) {
      [adminUser] = await db.insert(users).values({
        uid: 'demo-admin-uid',
        email: 'admin@demo-customs.eg',
        name: 'أحمد محمود (مدير النظام التجريبي)',
        role: 'admin',
        isActive: true,
      }).returning();
    }

    // 2. Clear old demo data if exists to prevent duplicates
    await db.delete(statementItems);
    await db.delete(statements);
    await db.delete(clientDeposits);
    await db.delete(treasuryTransactions);
    await db.delete(shipments);
    await db.delete(clientPricing);
    await db.delete(clientItems);
    await db.delete(clients);
    await db.delete(ports);
    await db.delete(agencies);
    await db.delete(contractors);
    await db.delete(statuses);

    // 3. Seed Ports
    const [portAlex] = await db.insert(ports).values({ name: 'ميناء الإسكندرية البحري' }).returning();
    const [portSokhna] = await db.insert(ports).values({ name: 'ميناء العين السخنة' }).returning();
    const [portDamietta] = await db.insert(ports).values({ name: 'ميناء دمياط البحري' }).returning();
    const [portPortSaid] = await db.insert(ports).values({ name: 'ميناء بورسعيد غرب' }).returning();
    const [portAirport] = await db.insert(ports).values({ name: 'قرية البضائع - مطار القاهرة' }).returning();

    // 4. Seed Agencies
    const [agencyMaersk] = await db.insert(agencies).values({ name: 'توكيل ميرسك مصر (Maersk Line)' }).returning();
    const [agencyMSC] = await db.insert(agencies).values({ name: 'توكيل إم إس سي مصر (MSC Shipping)' }).returning();
    const [agencyCMA] = await db.insert(agencies).values({ name: 'سي إم إيه للتوكيلات الملاحية (CMA CGM)' }).returning();
    const [agencyHapag] = await db.insert(agencies).values({ name: 'هاباج لويد (Hapag-Lloyd Egypt)' }).returning();

    // 5. Seed Contractors
    const [contractorTransport] = await db.insert(contractors).values({ name: 'شركة الفرسان للنقل الثقيل والحاويات' }).returning();
    const [contractorLabor] = await db.insert(contractors).values({ name: 'مؤسسة السلام للعتالة وتعتيق البضائع' }).returning();
    const [contractorLogistics] = await db.insert(contractors).values({ name: 'النيل لخدمات الفحص والتخزين الجمركي' }).returning();

    // 6. Seed Statuses
    const [stArrival] = await db.insert(statuses).values({ name: 'وصول الباخرة وتفريغ الحاويات', color: '#2563eb' }).returning();
    const [stInspection] = await db.insert(statuses).values({ name: 'كشف ومعاينة وفحص رقابي', color: '#d97706' }).returning();
    const [stTaxPayment] = await db.insert(statuses).values({ name: 'سداد الضرائب والرسوم الجمركية', color: '#7c3aed' }).returning();
    const [stReleased] = await db.insert(statuses).values({ name: 'إفراج نهائي وخروج من المنفذ', color: '#059669' }).returning();
    const [stPendingDocs] = await db.insert(statuses).values({ name: 'بانتظار استكمال المستندات الأصلية', color: '#dc2626' }).returning();

    // 7. Seed Clients + Custom Items + Pricing
    // Client 1: Nile Foods
    const [clientNile] = await db.insert(clients).values({
      name: 'شركة النيل الدولية للصناعات الغذائية',
      contactPerson: 'أ. طارق عبد الرحمن',
      phone: '01012345678',
      email: 'import@nile-foods.com.eg',
      address: 'المنطقة الصناعية الثالثة، مدينة السادس من أكتوبر، الجيزة',
      taxNumber: '100-245-890',
      notes: 'عميل رئيسي، يتم سداد الفواتير خلال أسبوع من الإفراج الجمركي.',
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    }).returning();

    const [itemMeat] = await db.insert(clientItems).values({ clientId: clientNile.id, name: 'لحوم مجمدة معبأة', createdBy: adminUser.id }).returning();
    const [itemOils] = await db.insert(clientItems).values({ clientId: clientNile.id, name: 'زيوت طعام مكررة', createdBy: adminUser.id }).returning();
    const [itemSpices] = await db.insert(clientItems).values({ clientId: clientNile.id, name: 'توابل وبهارات خام', createdBy: adminUser.id }).returning();

    await db.insert(clientPricing).values([
      { clientId: clientNile.id, serviceName: 'أتعاب التخليص الجمركي للشحنة', price: '5000.00', currency: 'EGP', createdBy: adminUser.id },
      { clientId: clientNile.id, serviceName: 'نولون نقل الحاوية من الميناء للمصنع', price: '4500.00', currency: 'EGP', createdBy: adminUser.id },
      { clientId: clientNile.id, serviceName: 'أتعاب الفحص المعملي ومطابقة الهيئة', price: '1500.00', currency: 'EGP', createdBy: adminUser.id },
    ]);

    // Client 2: Electro Egypt
    const [clientElectro] = await db.insert(clients).values({
      name: 'المجموعة المصرية لتجارة الأجهزة الكهربائية',
      contactPerson: 'المهندس كريم الشناوي',
      phone: '01229876543',
      email: 'procurement@electro-egypt.com',
      address: 'شارع عبد العزيز، العتبة، القاهرة',
      taxNumber: '210-983-451',
      notes: 'يتم توريد أمانة نقدية مسبقة لكل بوليصة شحن لتغطية ضريبة القيمة المضافة.',
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    }).returning();

    const [itemScreens] = await db.insert(clientItems).values({ clientId: clientElectro.id, name: 'شاشات تلفزيون سمارت 4K', createdBy: adminUser.id }).returning();
    const [itemParts] = await db.insert(clientItems).values({ clientId: clientElectro.id, name: 'قطع غيار غسالات وثلاجات', createdBy: adminUser.id }).returning();

    await db.insert(clientPricing).values([
      { clientId: clientElectro.id, serviceName: 'أتعاب التخليص الجمركي للأجهزة', price: '6500.00', currency: 'EGP', createdBy: adminUser.id },
      { clientId: clientElectro.id, serviceName: 'رسوم تفريغ وعتالة الحاوية', price: '2000.00', currency: 'EGP', createdBy: adminUser.id },
    ]);

    // Client 3: Al-Ahram Textiles
    const [clientAhram] = await db.insert(clients).values({
      name: 'الأهرام للغزل والمنسوجات الحديثة',
      contactPerson: 'أ. محمود فؤاد',
      phone: '01145678901',
      email: 'fabrics@ahram-textiles.eg',
      address: 'المحلة الكبرى، محافظة الغربية',
      taxNumber: '315-772-109',
      notes: 'التعامل النقدي بالدولار واليورو لأرصدة الأمانات.',
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    }).returning();

    const [itemFabrics] = await db.insert(clientItems).values({ clientId: clientAhram.id, name: 'أقمشة بوليستر وقطن خام', createdBy: adminUser.id }).returning();

    await db.insert(clientPricing).values([
      { clientId: clientAhram.id, serviceName: 'أتعاب التخليص الجمركي للغزل', price: '4000.00', currency: 'EGP', createdBy: adminUser.id },
    ]);

    // 8. Seed Shipments & Statements
    // Shipment 1 (Nile Foods - Alexandria)
    const [shipment1] = await db.insert(shipments).values({
      clientId: clientNile.id,
      clientItemId: itemMeat.id,
      invoiceValue: '45000.00',
      invoiceNumber: 'INV-BRA-9901',
      supplierName: 'JBS Foods Brazil S.A.',
      acid: '9948271034',
      declarationNumber46: '12048/2026',
      containerCount: 2,
      bolNumber: 'MEDU1029384',
      arrivalDate: new Date('2026-09-20'),
      documentReceiptDate: new Date('2026-09-18'),
      portId: portAlex.id,
      statusId: stInspection.id,
      contractorId: contractorTransport.id,
      agencyId: agencyMSC.id,
      currency: 'USD',
      notes: 'شحنة لحوم مبردة في ساحة كشف الثلاجات بميناء الإسكندرية.',
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    }).returning();

    const [stmt1] = await db.insert(statements).values({
      shipmentId: shipment1.id,
      statementDate: new Date('2026-09-21'),
      currency: 'EGP',
      totalAmount: '112000.00',
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    }).returning();

    // Statement 1 items
    await db.insert(statementItems).values([
      {
        statementId: stmt1.id,
        itemType: 'expense',
        description: 'سداد ضريبة الوارد الجمركية وضريبة القيمة المضافة (بوابة نافذة)',
        amount: '85000.00',
        currency: 'EGP',
        exchangeRateAtTransaction: '1.0000',
        externalReceiptNumber: 'TAX-NAF-8812',
        createdBy: adminUser.id,
      },
      {
        statementId: stmt1.id,
        itemType: 'expense',
        description: 'رسوم كشف وتفريغ حاويات الثلاجة والتعتيق',
        amount: '12000.00',
        currency: 'EGP',
        exchangeRateAtTransaction: '1.0000',
        externalReceiptNumber: 'PORT-ALX-441',
        createdBy: adminUser.id,
      },
      {
        statementId: stmt1.id,
        itemType: 'expense',
        description: 'مصروفات فحص الحجر البيطري والصحي',
        amount: '10000.00',
        currency: 'EGP',
        exchangeRateAtTransaction: '1.0000',
        externalReceiptNumber: 'VET-INSP-092',
        createdBy: adminUser.id,
      },
      {
        statementId: stmt1.id,
        itemType: 'fee',
        description: 'أتعاب التخليص الجمركي المتفق عليها للمكتب',
        amount: '5000.00',
        currency: 'EGP',
        exchangeRateAtTransaction: '1.0000',
        createdBy: adminUser.id,
      },
    ]);

    // Shipment 2 (Electro Egypt - Sokhna)
    const [shipment2] = await db.insert(shipments).values({
      clientId: clientElectro.id,
      clientItemId: itemScreens.id,
      invoiceValue: '82000.00',
      invoiceNumber: 'INV-SHA-2026-08',
      supplierName: 'Shenzhen Skyworth Digital Co., Ltd.',
      acid: '8812903419',
      declarationNumber46: '15409/2026',
      containerCount: 4,
      bolNumber: 'MSKU8829102',
      arrivalDate: new Date('2026-09-24'),
      documentReceiptDate: new Date('2026-09-22'),
      portId: portSokhna.id,
      statusId: stTaxPayment.id,
      contractorId: contractorTransport.id,
      agencyId: agencyMaersk.id,
      currency: 'USD',
      notes: '4 حاويات 40 قدم هاي كيوب شاشات سمارت.',
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    }).returning();

    const [stmt2] = await db.insert(statements).values({
      shipmentId: shipment2.id,
      statementDate: new Date('2026-09-25'),
      currency: 'EGP',
      totalAmount: '148500.00',
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    }).returning();

    // Statement 2 items with a demonstration reversal
    const [wrongItem] = await db.insert(statementItems).values({
      statementId: stmt2.id,
      itemType: 'expense',
      description: 'رسوم وزن إضافية (أُدخلت بالخطأ)',
      amount: '5000.00',
      currency: 'EGP',
      exchangeRateAtTransaction: '1.0000',
      isReversed: true,
      createdBy: adminUser.id,
    }).returning();

    const [reversalItem] = await db.insert(statementItems).values({
      statementId: stmt2.id,
      itemType: 'reversal',
      description: 'عكس عملية: رسوم وزن إضافية (أُدخلت بالخطأ)',
      amount: '-5000.00',
      currency: 'EGP',
      exchangeRateAtTransaction: '1.0000',
      reversalReason: 'خطأ في إدخال إيصال مكرر وتم عكس القيد محاسبياً',
      createdBy: adminUser.id,
    }).returning();

    await db.update(statementItems).set({ reversedByItemId: reversalItem.id }).where(eq(statementItems.id, wrongItem.id));

    await db.insert(statementItems).values([
      {
        statementId: stmt2.id,
        itemType: 'expense',
        description: 'رسوم توكيل ملاحي ميرسك وحراسة حاويات',
        amount: '42000.00',
        currency: 'EGP',
        exchangeRateAtTransaction: '1.0000',
        externalReceiptNumber: 'MRSK-EGY-781',
        createdBy: adminUser.id,
      },
      {
        statementId: stmt2.id,
        itemType: 'expense',
        description: 'ضريبة جمركية وضريبة جدول على الإلكترونيات',
        amount: '100000.00',
        currency: 'EGP',
        exchangeRateAtTransaction: '1.0000',
        externalReceiptNumber: 'SOK-CUST-391',
        createdBy: adminUser.id,
      },
      {
        statementId: stmt2.id,
        itemType: 'fee',
        description: 'أتعاب التخليص الجمركي للمكتب',
        amount: '6500.00',
        currency: 'EGP',
        exchangeRateAtTransaction: '1.0000',
        createdBy: adminUser.id,
      },
    ]);

    // Shipment 3 (Al-Ahram - Damietta - Released)
    const [shipment3] = await db.insert(shipments).values({
      clientId: clientAhram.id,
      clientItemId: itemFabrics.id,
      invoiceValue: '35000.00',
      invoiceNumber: 'INV-TURK-449',
      supplierName: 'Istanbul Tekstil Sanayi A.S.',
      acid: '7720194812',
      declarationNumber46: '9901/2026',
      containerCount: 1,
      bolNumber: 'CMA7739102',
      arrivalDate: new Date('2026-09-15'),
      documentReceiptDate: new Date('2026-09-12'),
      portId: portDamietta.id,
      statusId: stReleased.id,
      contractorId: contractorTransport.id,
      agencyId: agencyCMA.id,
      currency: 'USD',
      notes: 'تم الإفراج النهائي وخروج الحاوية من بوابة الميناء.',
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    }).returning();

    const [stmt3] = await db.insert(statements).values({
      shipmentId: shipment3.id,
      statementDate: new Date('2026-09-16'),
      currency: 'EGP',
      totalAmount: '44000.00',
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    }).returning();

    await db.insert(statementItems).values([
      {
        statementId: stmt3.id,
        itemType: 'expense',
        description: 'سداد ضريبة ورسوم جمركية قطن خام',
        amount: '40000.00',
        currency: 'EGP',
        exchangeRateAtTransaction: '1.0000',
        externalReceiptNumber: 'DAM-REC-502',
        createdBy: adminUser.id,
      },
      {
        statementId: stmt3.id,
        itemType: 'fee',
        description: 'أتعاب التخليص الجمركي',
        amount: '4000.00',
        currency: 'EGP',
        exchangeRateAtTransaction: '1.0000',
        createdBy: adminUser.id,
      },
    ]);

    // 9. Seed Deposits (Custody)
    // Deposit 1: General Deposit for Electro Egypt
    await db.insert(clientDeposits).values({
      clientId: clientElectro.id,
      statementId: null, // GENERAL DEPOSIT
      amount: '150000.00',
      currency: 'EGP',
      exchangeRateAtTransaction: '1.0000',
      depositDate: new Date('2026-09-22'),
      receiptNumber: 'DEP-GEN-2026-01',
      notes: 'أمانة عامة مفتوحة بحساب المجموعة المصرية للتخليص على الشحنات القادمة.',
      createdBy: adminUser.id,
    });

    // Deposit 2: Linked Deposit for Nile Foods (Tied to Shipment 1)
    await db.insert(clientDeposits).values({
      clientId: clientNile.id,
      statementId: stmt1.id, // LINKED TO SHIPMENT 1
      amount: '100000.00',
      currency: 'EGP',
      exchangeRateAtTransaction: '1.0000',
      depositDate: new Date('2026-09-19'),
      receiptNumber: 'DEP-LNK-8842',
      notes: 'أمانة مخصصة لسداد رسوم فحص وجمارك بوليصة اللحوم رقم MEDU1029384.',
      createdBy: adminUser.id,
    });

    // Deposit 3: USD Deposit for Al-Ahram Textiles
    await db.insert(clientDeposits).values({
      clientId: clientAhram.id,
      statementId: null, // GENERAL USD DEPOSIT
      amount: '5000.00',
      currency: 'USD',
      exchangeRateAtTransaction: '48.5000',
      depositDate: new Date('2026-09-14'),
      receiptNumber: 'DEP-USD-0091',
      notes: 'وديعة نقدية بالدولار الأمريكي لسداد نوالين الشحن للتوكيلات الأجنبية.',
      createdBy: adminUser.id,
    });

    // 10. Seed Treasury Transactions (Positive balances in EGP, USD, EUR)
    await db.insert(treasuryTransactions).values([
      {
        clientId: clientElectro.id,
        statementId: null,
        transactionType: 'deposit',
        amount: '150000.00',
        currency: 'EGP',
        exchangeRateAtTransaction: '1.0000',
        referenceNumber: 'DEP-GEN-2026-01',
        notes: 'استلام أمانة عامة نقداً من المجموعة المصرية',
        createdBy: adminUser.id,
      },
      {
        clientId: clientNile.id,
        statementId: stmt1.id,
        transactionType: 'deposit',
        amount: '100000.00',
        currency: 'EGP',
        exchangeRateAtTransaction: '1.0000',
        referenceNumber: 'DEP-LNK-8842',
        notes: 'استلام أمانة شحنة اللحوم المجمدة',
        createdBy: adminUser.id,
      },
      {
        clientId: clientNile.id,
        statementId: stmt1.id,
        transactionType: 'withdraw',
        amount: '85000.00',
        currency: 'EGP',
        exchangeRateAtTransaction: '1.0000',
        referenceNumber: 'TAX-NAF-8812',
        notes: 'سداد ضريبة الجمارك لمصلحة الجمارك عبر نافذة',
        createdBy: adminUser.id,
      },
      {
        clientId: clientAhram.id,
        statementId: null,
        transactionType: 'deposit',
        amount: '5000.00',
        currency: 'USD',
        exchangeRateAtTransaction: '48.5000',
        referenceNumber: 'DEP-USD-0091',
        notes: 'استلام أمانة نقدية بالدولار الأمريكي',
        createdBy: adminUser.id,
      },
      {
        clientId: null,
        statementId: null,
        transactionType: 'deposit',
        amount: '2500.00',
        currency: 'EUR',
        exchangeRateAtTransaction: '52.3000',
        referenceNumber: 'EUR-CAP-01',
        notes: 'عهدة سيولة يورو بخزينة فرع الميناء للتوكيلات الأوروبية',
        createdBy: adminUser.id,
      },
    ]);

    // 11. Seed Audit Logs
    await db.insert(auditLog).values([
      {
        tableName: 'clients',
        recordId: clientNile.id,
        action: 'INSERT',
        newData: { name: clientNile.name, taxNumber: clientNile.taxNumber },
        changedByEmail: 'admin@demo-customs.eg',
        ipAddress: '197.38.12.94',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Demo Session',
      },
      {
        tableName: 'shipments',
        recordId: shipment1.id,
        action: 'INSERT',
        newData: { bolNumber: shipment1.bolNumber, acid: shipment1.acid, port: 'الإسكندرية' },
        changedByEmail: 'admin@demo-customs.eg',
        ipAddress: '197.38.12.94',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Demo Session',
      },
      {
        tableName: 'client_deposits',
        recordId: 'dep-demo-1',
        action: 'INSERT',
        newData: { client: clientElectro.name, amount: '150000.00', type: 'عهدة عامة' },
        changedByEmail: 'admin@demo-customs.eg',
        ipAddress: '197.38.12.94',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Demo Session',
      },
      {
        tableName: 'statement_items',
        recordId: reversalItem.id,
        action: 'INSERT',
        newData: { type: 'reversal', amount: '-5000.00', reason: 'عكس قيد محاسبي مكرر' },
        changedByEmail: 'admin@demo-customs.eg',
        ipAddress: '197.38.12.94',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Demo Session',
      },
    ]);

    return NextResponse.json({
      success: true,
      message: 'تم تفعيل وتهيئة بيانات الديمو التجريبية بنجاح!',
    });
  } catch (error: any) {
    console.error('Failed to seed demo data:', error);
    return NextResponse.json({ error: error.message || 'فشل تحميل البيانات التجريبية' }, { status: 500 });
  }
}
