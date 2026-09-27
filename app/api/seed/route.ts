import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import {
  users,
  clients,
  clientItems,
  clientPricing,
  ports,
  agencies,
  contractors,
  statuses,
  shipments,
  statements,
  statementItems,
  clientDeposits,
  treasuryTransactions,
  auditLog,
} from '@/src/db/schema';
import { sql } from 'drizzle-orm';
import { DEMO_USERS } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  try {
    // Optional check or allow in development/demo
    console.log('Seeding comprehensive dummy data system...');

    // 1. Ensure Demo Users exist
    const createdUsers: Record<string, string> = {};
    for (const [key, u] of Object.entries(DEMO_USERS)) {
      const [usr] = await db
        .insert(users)
        .values({
          uid: u.uid,
          email: u.email,
          name: u.name,
          role: u.role,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: users.email,
          set: { name: u.name, role: u.role, isActive: true },
        })
        .returning();
      createdUsers[key] = usr.id;
    }

    const adminId = createdUsers['admin'];

    // 2. Ports
    const samplePorts = [
      'ميناء الإسكندرية البحري',
      'ميناء العين السخنة',
      'ميناء دمياط البحري',
      'ميناء شرق بورسعيد',
      'قرية البضائع - مطار القاهرة الدولي',
    ];
    const portMap: Record<string, string> = {};
    for (const pName of samplePorts) {
      const [p] = await db
        .insert(ports)
        .values({ name: pName })
        .onConflictDoUpdate({ target: ports.name, set: { name: pName } })
        .returning();
      portMap[pName] = p.id;
    }

    // 3. Agencies
    const sampleAgencies = [
      'ميرسك شيبينج إيجيبت (Maersk)',
      'البحر الأبيض المتوسط للملاحة (MSC)',
      'كوسكو للملاحة البحرية (COSCO Shipping)',
      'سي إم إيه سي جي إم (CMA CGM)',
    ];
    const agencyMap: Record<string, string> = {};
    for (const aName of sampleAgencies) {
      const [a] = await db
        .insert(agencies)
        .values({ name: aName })
        .onConflictDoUpdate({ target: agencies.name, set: { name: aName } })
        .returning();
      agencyMap[aName] = a.id;
    }

    // 4. Contractors
    const sampleContractors = [
      'الشركة الهندسية للرافعات والتفريغ',
      'الفهد لخدمات النقل الثقيل والمقطورات',
      'نقابة عمال التعتيق والتحميل الجمركي',
    ];
    const contractorMap: Record<string, string> = {};
    for (const cName of sampleContractors) {
      const [c] = await db
        .insert(contractors)
        .values({ name: cName })
        .onConflictDoUpdate({ target: contractors.name, set: { name: cName } })
        .returning();
      contractorMap[cName] = c.id;
    }

    // 5. Statuses
    const sampleStatuses = [
      { name: 'تم فتح الملف وتسجيل ACID', color: '#3b82f6' },
      { name: 'جاري فحص المستندات والعرض', color: '#eab308' },
      { name: 'كشف ومعاينة وتثمين جمركي', color: '#f97316' },
      { name: 'تم سداد الرسوم وصرف الإذن', color: '#10b981' },
      { name: 'إفراج جمركي نهائي وتسليم', color: '#6366f1' },
    ];
    const statusMap: Record<string, string> = {};
    for (const s of sampleStatuses) {
      const [st] = await db
        .insert(statuses)
        .values(s)
        .onConflictDoUpdate({ target: statuses.name, set: { color: s.color } })
        .returning();
      statusMap[s.name] = st.id;
    }

    // 6. Clients with Items & Pricing
    const sampleClients = [
      {
        name: 'شركة النيل الدولية للصناعات الغذائية',
        contactPerson: 'م. أحمد شكري',
        phone: '01012345678',
        email: 'import@nile-foods.com.eg',
        address: 'المنطقة الصناعية الثالثة، مدينة 6 أكتوبر، الجيزة',
        taxNumber: '100-245-890',
        notes: 'عميل رئيسي، يتم سداد الفواتير خلال أسبوع من الإفراج الجمركي.',
        items: ['قمح روسي صب درجة أولى', 'زيت نخيل مكرر براميل', 'شحنات سكر خام'],
        pricing: [
          { serviceName: 'أتعاب تخليص حاوية 20 قدم', price: '2500.00', currency: 'EGP' },
          { serviceName: 'أتعاب تخليص حاوية 40 قدم', price: '3800.00', currency: 'EGP' },
          { serviceName: 'عمولة متابعة الصادرات والواردات', price: '750.00', currency: 'EGP' },
        ],
      },
      {
        name: 'المجموعة المصرية لتجارة الأجهزة الكهربائية',
        contactPerson: 'أ. طارق عبد الحميد',
        phone: '01229876543',
        email: 'procurement@electro-egypt.com',
        address: 'شارع عبد العزيز، العتبة، القاهرة',
        taxNumber: '320-118-452',
        notes: 'يتم توريد أمانة نقدية مسبقة لكل بوليصة شحن لتغطية ضريبة القيمة المضافة.',
        items: ['شاشات تلفزيون ذكية 55 بوصة', 'محركات غسالات كهربائية', 'مكيفات هواء سبليت'],
        pricing: [
          { serviceName: 'أتعاب تخليص رسالة إلكترونيات', price: '4500.00', currency: 'EGP' },
          { serviceName: 'مصاريف عرض جهاز تنظيم الاتصالات (NTRA)', price: '1200.00', currency: 'EGP' },
        ],
      },
      {
        name: 'الأهرام للغزل والمنسوجات الحديثة',
        contactPerson: 'الحاج رأفت المنشاوي',
        phone: '01145678901',
        email: 'fabrics@ahram-textiles.eg',
        address: 'المحلة الكبرى، الغربية',
        taxNumber: '405-789-123',
        notes: 'التعامل النقدي بالدولار واليورو لأرصدة الأمانات.',
        items: ['خيوط بوليستر مغزولة', 'صبغات نسيج صناعية', 'قطع غيار أنوال نسيج ألمانية'],
        pricing: [
          { serviceName: 'أتعاب تخليص شحنة غزل صب', price: '3000.00', currency: 'EGP' },
          { serviceName: 'إشراف تفريغ ونقل للمصنع', price: '1500.00', currency: 'EGP' },
        ],
      },
    ];

    const clientRecords: any[] = [];
    for (const cData of sampleClients) {
      // Check if client exists
      let [cl] = await db
        .insert(clients)
        .values({
          name: cData.name,
          contactPerson: cData.contactPerson,
          phone: cData.phone,
          email: cData.email,
          address: cData.address,
          taxNumber: cData.taxNumber,
          notes: cData.notes,
          isActive: true,
          createdBy: adminId,
        })
        .returning();

      // Items
      const createdItemIds: string[] = [];
      for (const item of cData.items) {
        const [it] = await db
          .insert(clientItems)
          .values({
            clientId: cl.id,
            name: item,
            createdBy: adminId,
          })
          .returning();
        createdItemIds.push(it.id);
      }

      // Pricing
      for (const pr of cData.pricing) {
        await db.insert(clientPricing).values({
          clientId: cl.id,
          serviceName: pr.serviceName,
          price: pr.price,
          currency: pr.currency,
          createdBy: adminId,
        });
      }

      clientRecords.push({
        ...cl,
        firstItemId: createdItemIds[0],
      });
    }

    // 7. Create Sample Shipments & Statements
    const c1 = clientRecords[0];
    const c2 = clientRecords[1];
    const c3 = clientRecords[2];

    const sampleShipments = [
      {
        clientId: c1.id,
        clientItemId: c1.firstItemId,
        invoiceValue: '85000.00',
        invoiceNumber: 'INV-2026-904',
        supplierName: 'Volga Grain Exports Ltd - Russia',
        acid: 'EGY-ACID-2026-88192',
        declarationNumber46: 'DEC-46-9921',
        containerCount: 8,
        bolNumber: 'MSK-MED-098231',
        portId: portMap['ميناء الإسكندرية البحري'],
        statusId: statusMap['كشف ومعاينة وتثمين جمركي'],
        agencyId: agencyMap['ميرسك شيبينج إيجيبت (Maersk)'],
        contractorId: contractorMap['الفهد لخدمات النقل الثقيل والمقطورات'],
        currency: 'USD',
        notes: 'شحنة قمح تتطلب فحص الحجر الزراعي ومعاينة سلامة الغذاء.',
      },
      {
        clientId: c2.id,
        clientItemId: c2.firstItemId,
        invoiceValue: '124000.00',
        invoiceNumber: 'INV-CN-88120',
        supplierName: 'Shenzhen Skyworth Digital Co.',
        acid: 'EGY-ACID-2026-77341',
        declarationNumber46: 'DEC-46-3341',
        containerCount: 4,
        bolNumber: 'MSC-SHA-552190',
        portId: portMap['ميناء العين السخنة'],
        statusId: statusMap['تم سداد الرسوم وصرف الإذن'],
        agencyId: agencyMap['البحر الأبيض المتوسط للملاحة (MSC)'],
        contractorId: contractorMap['الشركة الهندسية للرافعات والتفريغ'],
        currency: 'USD',
        notes: 'تم استيفاء موافقة الجهاز القومي لتنظيم الاتصالات وجاهزة للإفراج.',
      },
      {
        clientId: c3.id,
        clientItemId: c3.firstItemId,
        invoiceValue: '45000.00',
        invoiceNumber: 'EUR-TEX-4412',
        supplierName: 'Milano Textile Fibers SpA - Italy',
        acid: 'EGY-ACID-2026-44199',
        declarationNumber46: 'DEC-46-8812',
        containerCount: 2,
        bolNumber: 'CMA-IT-772910',
        portId: portMap['ميناء دمياط البحري'],
        statusId: statusMap['إفراج جمركي نهائي وتسليم'],
        agencyId: agencyMap['سي إم إيه سي جي إم (CMA CGM)'],
        contractorId: contractorMap['نقابة عمال التعتيق والتحميل الجمركي'],
        currency: 'EUR',
        notes: 'تم إنهاء كافة الإجراءات وتسليم الرسالة لمستودعات المحلة.',
      },
    ];

    for (const shipData of sampleShipments) {
      const [ship] = await db
        .insert(shipments)
        .values({
          ...shipData,
          createdBy: adminId,
        })
        .returning();

      // Create Statement
      const [stmt] = await db
        .insert(statements)
        .values({
          shipmentId: ship.id,
          currency: 'EGP',
          totalAmount: '45200.00',
          createdBy: adminId,
        })
        .returning();

      // Statement Items
      const itemsToInsert = [
        {
          statementId: stmt.id,
          itemType: 'expense',
          description: 'رسوم جمركية وارد وضريبة جدول',
          amount: '28500.00',
          currency: 'EGP',
          externalReceiptNumber: 'RCP-CUSTOMS-4412',
          createdBy: adminId,
        },
        {
          statementId: stmt.id,
          itemType: 'expense',
          description: 'مصاريف عتالة وتفريغ ساحات الميناء',
          amount: '3800.00',
          currency: 'EGP',
          externalReceiptNumber: 'RCP-PORT-8891',
          createdBy: adminId,
        },
        {
          statementId: stmt.id,
          itemType: 'fee',
          description: 'أتعاب التخليص الجمركي المتفق عليها للمكتب',
          amount: '8500.00',
          currency: 'EGP',
          createdBy: adminId,
        },
        {
          statementId: stmt.id,
          itemType: 'deposit_deduction',
          description: 'خصم من وديعة وأمانة العميل الجمركية',
          amount: '15000.00',
          currency: 'EGP',
          createdBy: adminId,
        },
      ];

      for (const it of itemsToInsert) {
        await db.insert(statementItems).values(it);
      }

      // Client Deposit
      await db.insert(clientDeposits).values({
        clientId: ship.clientId,
        statementId: stmt.id,
        amount: '50000.00',
        currency: 'EGP',
        receiptNumber: `DEP-${Math.floor(1000 + Math.random() * 9000)}`,
        notes: 'أمانة جمركية نقدية لتغطية مصاريف الإفراج ومصاريف الميناء',
        createdBy: adminId,
      });

      // Treasury Transaction
      await db.insert(treasuryTransactions).values({
        statementId: stmt.id,
        clientId: ship.clientId,
        transactionType: 'deposit',
        amount: '50000.00',
        currency: 'EGP',
        referenceNumber: `TR-IN-${Math.floor(10000 + Math.random() * 90000)}`,
        notes: 'إيداع نقدي بخزينة المكتب لحساب أمانة جمركية',
        createdBy: adminId,
      });

      await db.insert(treasuryTransactions).values({
        statementId: stmt.id,
        clientId: ship.clientId,
        transactionType: 'withdraw',
        amount: '32300.00',
        currency: 'EGP',
        referenceNumber: `TR-OUT-${Math.floor(10000 + Math.random() * 90000)}`,
        notes: 'سداد رسوم جمركية ومصاريف شحن الميناء نقداً لمندوب التخليص',
        createdBy: adminId,
      });
    }

    // 8. Audit Log
    await db.insert(auditLog).values({
      tableName: 'system',
      recordId: 'seed-dummy-data',
      action: 'SEED',
      newData: { message: 'Initialized comprehensive dummy data system' },
      changedBy: adminId,
      changedByEmail: 'admin@demo-customs.eg',
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: req.headers.get('user-agent') || 'Server Seed',
    });

    return NextResponse.json({
      success: true,
      message: 'تم تفعيل وتهيئة نظام البيانات الوهمية والتجريبية بنجاح!',
      stats: {
        ports: samplePorts.length,
        agencies: sampleAgencies.length,
        contractors: sampleContractors.length,
        statuses: sampleStatuses.length,
        clients: sampleClients.length,
        shipments: sampleShipments.length,
      },
    });
  } catch (error: any) {
    console.error('Failed to seed dummy data:', error);
    return NextResponse.json({ error: error.message || 'فشل توليد البيانات التجريبية' }, { status: 500 });
  }
}
