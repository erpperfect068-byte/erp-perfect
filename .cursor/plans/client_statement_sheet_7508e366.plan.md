---
name: Client Statement Sheet
overview: إضافة ورقة كشف حساب تخليص قابلة للطباعة بنفس شكل الفاتورة الورقية (هيدر مزدوج ثابت + جدول بنود ديناميكي + 3 إجماليات)، على نمط ContractorInvoiceSheet، مع ربط البيانات الموجودة وخصم الأمانة المرتبطة بالكشف.
todos:
  - id: sheet-component
    content: بناء ClientStatementSheet بهيدر مزدوج + جدول بنود + 3 إجماليات + طباعة
    status: completed
  - id: api-enrich
    content: توسيع GET statements/deposits لتمرير حقول الهيدر والأمانات المرتبطة بالكشف
    status: completed
  - id: wire-statements-page
    content: ربط زر فتح الورقة من صفحة الكشوف مع أصناف العميل والتعديل المحلي لرقم الأوردر
    status: completed
  - id: totals-logic
    content: حساب مصاريف / مدفوع أمانة / مستحق وعرضهم في فوتر الورقة
    status: completed
isProject: false
---

# ورقة كشف حساب تخليص (Client Statement Sheet)

## الهدف

عند فتح كشف العميل، تظهر ورقة مستند مثل [`ContractorInvoiceSheet`](components/contractors/ContractorInvoiceSheet.tsx) قابلة للطباعة، بنفس تقسيم الفاتورة المرفقة: عنوان **كشف حساب تخليص**، جدولين هيدر جنب بعض، جدول بنود ديناميكي، ثم 3 صفوف إجمالي ثابتة + توقيع.

## التخطيط البصري

```mermaid
flowchart TB
  title[كشف حساب تخليص]
  subgraph header [هيدر ثابت من الشحنة]
    rightTable[تاريخ / رقم كشف / منشأ / مورد / صنف / حاويات / بوليصة / رقم 46 / وصول / انتهاء تخزين]
    leftTable[مطلوب من / سعر دولار يورو / رقم أوردر قابل للتعديل / أصناف العميل / ميناء مغادرة فارغ / ميناء وصول]
  end
  subgraph body [جدول ديناميكي]
    cols[مسلسل | الوصف | رمز العملة | المبلغ | رقم الإيصال]
  end
  subgraph footer [إجماليات ثابتة]
    t1[إجمالي مصاريف الشحنة EGP]
    t2[إجمالي المدفوع تحت الحساب من الأمانات]
    t3[إجمالي المستحق = مصاريف - مدفوع]
  end
  title --> header --> body --> footer
```

## قرارات مثبتة منك

- الواجهة: مودال ورقة + طباعة (`window.print` + CSS `@media print`)، مش إعادة تصميم اللوحة الجانبية فقط.
- **رقم الشهادة** في الورقة = `shipments.declaration_number_46`.
- **انتهاء التخزين** و**ميناء المغادرة**: خلايا فارغة الآن (بدون migration).
- **رقم الأوردر**: افتراضي = رقم 46 نفسه، قابل للتعديل محليًا على الورقة قبل الطباعة (لا يشترط حفظ فوري في DB).
- **نوع البضاعة**: اختيار من أصناف العميل (`client_items`) كـ checkboxes على الورقة.
- **المدفوع تحت الحساب**: من أمانات العميل المرتبطة بالكشف (`client_deposits.statement_id`) + بنود `deposit_deduction` على نفس الكشف (أمانة عامة مُطبَّقة على الكشف).

## المكوّن الجديد

ملف: [`components/statements/ClientStatementSheet.tsx`](components/statements/ClientStatementSheet.tsx)

- Props: `statement` (مع `shipment`, `client`, `items`)، `clientItems`، `depositsForStatement`، callbacks للإضافة/التحديث، `onClose`.
- قسم عنوان + جدولين هيدر RTL بحدود جداول بسيطة (شكل ورقي، مش كروت داشبورد).
- جدول البنود:
  - أعمدة: مسلسل | الوصف | `$/€` (فارغ لـ EGP، `$` لـ USD، `€` لـ EUR) | المبلغ | رقم الإيصال.
  - مصدر الصفوف: `statement_items` الحالية عبر نفس API الإدراج الموجود.
  - إضافة صف جديد من الورقة (وصف + مبلغ + عملة + إيصال) يستدعي POST الحالي في [`app/api/statements/route.ts`](app/api/statements/route.ts).
- فوتر ثابت بـ 3 صفوف محسوبة:
  - **مصاريف** = Σ بنود `expense` + `fee` (غير معكوسة) × سعر الصرف → EGP.
  - **مدفوع** = Σ أمانات مرتبطة بالكشف (EGP) + Σ `deposit_deduction` غير المعكوسة.
  - **مستحق** = مصاريف − مدفوع.
- منطقة توقيع: اسم المحاسب من المستخدم الحالي + تاريخ الكشف.
- زر **طباعة** يخفي أزرار التحكم ويعرض الورقة فقط.

## ربط الصفحة

في [`app/statements/page.tsx`](app/statements/page.tsx):

- زر «فتح كشف الحساب / طباعة» على الكشف المختار يفتح الـ Sheet.
- عند الفتح: تحميل أصناف العميل + أمانات العميل المرتبطة بهذا `statementId` (من [`app/api/deposits/route.ts`](app/api/deposits/route.ts) مع فلتر).
- توسيع select في GET statements ليشمل حقول الشحنة الناقصة في الهيدر: `supplier_name`, `declaration_number_46`, `arrival_date`, `document_receipt_date`, `invoice_number`, `client_item_id` + `clientItem`, `port`, `client`.
- الإبقاء على اقتراح أسعار التعاقد وإدراج القيد كاختصارات؛ الورقة تصبح سطح العرض/الطباعة الأساسي.

## تعبئة الهيدر (من الداتا الموجودة)

| حقل الورقة     | المصدر                                                                                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| التاريخ        | `statement.statementDate`                                                                                                                                       |
| كشف حساب رقم   | رقم عرض قصير من تسلسل داخلي بسيط (عداد كشوف الشركة أو short code من `created_at`+index) — بدون جدول جديد ثقيل إن أمكن؛ وإلا عمود `statement_number` serial خفيف |
| المنشأ         | فارغ الآن                                                                                                                                                       |
| المورد         | `shipment.supplierName`                                                                                                                                         |
| الصنف          | اسم `client_item` المرتبط بالشحنة                                                                                                                               |
| عدد الحاويات   | `containerCount`                                                                                                                                                |
| البوليصة       | `bolNumber`                                                                                                                                                     |
| رقم الشهادة    | `declarationNumber46`                                                                                                                                           |
| وصول السفينة   | `arrivalDate`                                                                                                                                                   |
| انتهاء التخزين | فارغ                                                                                                                                                            |
| مطلوب من       | `client.name`                                                                                                                                                   |
| أسعار تحويل    | من `/api/settings` أو أسعار الصرف الحالية في الصفحة (USD/EUR)                                                                                                   |
| رقم الأوردر    | default = رقم 46، editable على الورقة                                                                                                                           |
| نوع البضاعة    | multi-select من أصناف العميل                                                                                                                                    |
| ميناء المغادرة | فارغ                                                                                                                                                            |
| ميناء الوصول   | `port.name`                                                                                                                                                     |

## ما لن نلمسه الآن

- لا نضيف أعمدة شحنة للمنشأ / انتهاء التخزين / ميناء المغادرة.
- لا نعيد بناء نموذج إدخال الشحنة إلا إن احتجنا تمرير حقول موجودة أصلًا للهيدر.
- لا نبني PDF library؛ الطباعة عبر المتصفح بنفس شكل الورقة.

## ملفات أساسية

- جديد: `components/statements/ClientStatementSheet.tsx` (+ CSS print داخل المكوّن أو class `print:`).
- تعديل: `app/statements/page.tsx` (فتح الورقة + جلب deposits/items).
- تعديل خفيف: `app/api/statements/route.ts` (تضمين حقول الشحنة الكاملة في الـ select).
- اختياري صغير: إن لم يوجد رقم كشف بشري واضح، migration خفيفة `statements.statement_number` أو حساب display number من الترتيب.
