export interface PermissionDefinition {
  code: string;
  module: string;
  moduleLabelAr: string;
  labelAr: string;
  descriptionAr?: string;
}

export const MODULE_LABELS: Record<string, string> = {
  clients: 'إدارة العملاء والأسعار',
  client_items: 'أصناف وبنود العملاء',
  client_pricing: 'اتفاقيات وتسعير العملاء',
  shipments: 'إدارة الشحنات والتخليص',
  statements: 'كشوف الحسابات والتسويات',
  statement_items: 'بنود ومصروفات كشوف الحسابات',
  deposits: 'أمانات وودائع العملاء',
  treasury: 'الخزينة والمعاملات المالية',
  custody: 'عهد الموظفين وتصفيتها',
  users: 'الموظفون وفريق العمل',
  roles: 'إدارة الأدوار والصلاحيات',
  settings: 'إعدادات التشغيل العامة',
  ports: 'الموانئ البحرية والجوية',
  agencies: 'التوكيلات الملاحية',
  contractors: 'المقاولون ومقدمو الخدمات',
  statuses: 'حالات وتتبع الشحنات',
  audit: 'سجل التدقيق والرقابة',
  reports: 'التقارير والإحصائيات',
};

export const PERMISSION_LABELS: Record<string, string> = {
  // audit
  'audit.view': 'عرض سجل التدقيق والمراجعة',
  'audit.export': 'تصدير سجل التدقيق إلى CSV',

  // clients
  'clients.view': 'عرض قائمة العملاء وتفاصيلهم',
  'clients.create': 'إضافة عميل جديد',
  'clients.edit': 'تعديل بيانات العملاء وقوائم الأسعار',
  'clients.update': 'تحديث وتعديل بيانات العملاء',
  'clients.delete': 'حذف عميل',

  // client items & pricing
  'client_items.create': 'إضافة أصناف جديدة للعميل',
  'client_items.update': 'تعديل أصناف العميل',
  'client_items.delete': 'حذف أصناف العميل',
  'client_pricing.create': 'إضافة اتفاقية تسعير للعميل',
  'client_pricing.update': 'تعديل اتفاقيات التسعير',
  'client_pricing.delete': 'حذف اتفاقيات التسعير',

  // shipments
  'shipments.view': 'عرض الشحنات والشهادات الجمركية',
  'shipments.create': 'تسجيل شحنة وبوليصة جديدة',
  'shipments.edit': 'تحديث بيانات ومراحل الشحنات',
  'shipments.update': 'تعديل بيانات الشحنات',
  'shipments.delete': 'حذف الشحنات',

  // treasury
  'treasury.view': 'عرض أرصدة وحركات الخزينة',
  'treasury.create': 'تسجيل سندات إيداع أو سحب مباشر',
  'treasury.manage_safes': 'إضافة وإدارة الخزن والحسابات البنكية',
  'treasury.edit': 'تعديل بيانات الخزنة والحساب البنكي',
  'treasury.delete': 'حذف الخزنة (بشرط تصفية الرصيد)',
  'treasury.adjust': 'تسوية رصيد الخزنة (عجز / زيادة)',
  'treasury.transfer': 'إجراء تحويلات مالية بين الخزن وسعر الصرف',
  'treasury.reverse': 'عكس وإلغاء حركات الخزينة',

  // custody
  'custody.view': 'عرض عهد الموظفين وسجل التصفية',
  'custody.create': 'صرف عهدة نقدية جديدة لموظف',
  'custody.issue': 'صرف وتسليم عهدة جديدة',
  'custody.expense': 'تسجيل مصروف من العهدة',
  'custody.settle': 'استرداد المتبقي وتسوية العهدة',
  'custody.close': 'قفل العهدة نهائياً',
  'custody.reverse': 'عكس وإلغاء بند مصروف عهدة',
  'custody.manage': 'إدارة ومتابعة العهد وتصفيتها',

  // deposits
  'deposits.view': 'عرض سجل ودائع وأمانات العملاء',
  'deposits.create': 'تسجيل أمانة/وديعة جديدة للعميل',
  'deposits.edit': 'تعديل بيانات الأمانة',
  'deposits.update': 'تحديث بيانات الأمانة',
  'deposits.delete': 'حذف أمانة/وديعة',

  // statements
  'statements.view': 'عرض كشوف الحسابات والمصروفات',
  'statements.create': 'إنشاء كشف حساب وتوليد بنود',
  'statements.edit': 'تعديل مبالغ ومصروفات كشف الحساب',
  'statements.update': 'تحديث بيانات كشف الحساب',
  'statements.delete': 'حذف كشف حساب',
  'statements.print': 'طباعة وتصدير كشف الحساب إلى Excel',
  'statement_items.create': 'إضافة بنود مصروفات لكشف الحساب',
  'statement_items.update': 'تعديل بنود مصروفات كشف الحساب',
  'statement_items.delete': 'حذف بنود كشف الحساب',

  // users
  'users.view': 'عرض قائمة موظفي النظام',
  'users.create': 'إضافة موظف جديد',
  'users.invite': 'دعوة موظف جديد',
  'users.edit': 'تعديل بيانات الموظف',
  'users.update': 'تحديث بيانات الموظف',
  'users.manage_roles': 'تغيير وتعيين أدوار الموظفين',
  'users.delete': 'إيقاف/حذف موظف',

  // roles
  'roles.view': 'عرض الأدوار والصلاحيات',
  'roles.create': 'إنشاء دور وظيفي جديد',
  'roles.update': 'تعديل الأدوار الوظيفية',
  'roles.delete': 'حذف الأدوار الوظيفية',
  'roles.manage': 'إدارة الأدوار وتعديل صلاحيات النظام',

  // settings & operational dictionaries
  'settings.view': 'عرض بيانات الموانئ والتوكيلات والمقاولين',
  'settings.edit': 'إضافة وتعديل بيانات الموانئ والإعدادات',
  'settings.manage': 'إدارة إعدادات التشغيل العامة',
  'ports.create': 'إضافة ميناء بحري أو جوي',
  'ports.update': 'تعديل بيانات الموانئ',
  'ports.delete': 'حذف ميناء',
  'agencies.create': 'إضافة توكيل ملاحي جديد',
  'agencies.update': 'تعديل بيانات التوكيلات الملاحية',
  'agencies.delete': 'حذف توكيل ملاحي',
  'contractors.create': 'إضافة مقاول أو مورد خدمات',
  'contractors.update': 'تعديل بيانات المقاولين',
  'contractors.delete': 'حذف مقاول',
  'statuses.create': 'إضافة حالة تتبع جمركي جديدة',
  'statuses.update': 'تعديل حالات التتبع',
  'statuses.delete': 'حذف حالات التتبع',

  // reports
  'reports.view': 'عرض التقارير والإحصائيات',
  'reports.export': 'تصدير التقارير',
};

export function getPermissionDisplayLabel(code: string, fallbackDesc?: string): string {
  const ar = PERMISSION_LABELS[code] || fallbackDesc;
  if (ar) {
    return `${code} (${ar})`;
  }
  return code;
}

export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  // 1. العملاء
  { code: 'clients.view', module: 'clients', moduleLabelAr: 'إدارة العملاء والأسعار', labelAr: 'عرض قائمة العملاء وتفاصيلهم' },
  { code: 'clients.create', module: 'clients', moduleLabelAr: 'إدارة العملاء والأسعار', labelAr: 'إضافة عميل جديد' },
  { code: 'clients.edit', module: 'clients', moduleLabelAr: 'إدارة العملاء والأسعار', labelAr: 'تعديل بيانات العملاء وقوائم الأسعار' },
  { code: 'clients.delete', module: 'clients', moduleLabelAr: 'إدارة العملاء والأسعار', labelAr: 'حذف العملاء' },

  // 2. الشحنات
  { code: 'shipments.view', module: 'shipments', moduleLabelAr: 'إدارة الشحنات والتخليص', labelAr: 'عرض الشحنات والشهادات الجمركية' },
  { code: 'shipments.create', module: 'shipments', moduleLabelAr: 'إدارة الشحنات والتخليص', labelAr: 'تسجيل شحنة وبوليصة جديدة' },
  { code: 'shipments.edit', module: 'shipments', moduleLabelAr: 'إدارة الشحنات والتخليص', labelAr: 'تحديث بيانات ومراحل الشحنات' },
  { code: 'shipments.delete', module: 'shipments', moduleLabelAr: 'إدارة الشحنات والتخليص', labelAr: 'حذف الشحنات' },

  // 3. الخزينة
  { code: 'treasury.view', module: 'treasury', moduleLabelAr: 'الخزينة والمعاملات المالية', labelAr: 'عرض أرصدة وحركات الخزينة' },
  { code: 'treasury.create', module: 'treasury', moduleLabelAr: 'الخزينة والمعاملات المالية', labelAr: 'تسجيل سندات إيداع أو سحب مباشر' },
  { code: 'treasury.manage_safes', module: 'treasury', moduleLabelAr: 'الخزينة والمعاملات المالية', labelAr: 'إضافة وإدارة الخزن والحسابات البنكية' },
  { code: 'treasury.edit', module: 'treasury', moduleLabelAr: 'الخزينة والمعاملات المالية', labelAr: 'تعديل بيانات الخزنة والحساب البنكي' },
  { code: 'treasury.delete', module: 'treasury', moduleLabelAr: 'الخزينة والمعاملات المالية', labelAr: 'حذف الخزنة (بشرط تصفية الرصيد)' },
  { code: 'treasury.adjust', module: 'treasury', moduleLabelAr: 'الخزينة والمعاملات المالية', labelAr: 'تسوية رصيد الخزنة (عجز / زيادة)' },
  { code: 'treasury.transfer', module: 'treasury', moduleLabelAr: 'الخزينة والمعاملات المالية', labelAr: 'إجراء تحويلات مالية بين الخزن وسعر الصرف' },
  { code: 'treasury.reverse', module: 'treasury', moduleLabelAr: 'الخزينة والمعاملات المالية', labelAr: 'عكس وإلغاء حركات الخزينة' },

  // 4. كشوف الحسابات
  { code: 'statements.view', module: 'statements', moduleLabelAr: 'كشوف الحسابات والتسويات', labelAr: 'عرض كشوف الحسابات والمصروفات' },
  { code: 'statements.create', module: 'statements', moduleLabelAr: 'كشوف الحسابات والتسويات', labelAr: 'إنشاء كشف حساب وتوليد بنود' },
  { code: 'statements.edit', module: 'statements', moduleLabelAr: 'كشوف الحسابات والتسويات', labelAr: 'تعديل مبالغ ومصروفات كشف الحساب' },
  { code: 'statements.print', module: 'statements', moduleLabelAr: 'كشوف الحسابات والتسويات', labelAr: 'طباعة وتصدير كشف الحساب إلى Excel' },

  // 5. الأمانات والودائع
  { code: 'deposits.view', module: 'deposits', moduleLabelAr: 'أمانات وودائع العملاء', labelAr: 'عرض سجل ودائع وأمانات العملاء' },
  { code: 'deposits.create', module: 'deposits', moduleLabelAr: 'أمانات وودائع العملاء', labelAr: 'تسجيل أمانة/وديعة جديدة للعميل' },

  // 6. عهد الموظفين
  { code: 'custody.view', module: 'custody', moduleLabelAr: 'عهد الموظفين وتصفيتها', labelAr: 'عرض عهد الموظفين وسجل التصفية' },
  { code: 'custody.create', module: 'custody', moduleLabelAr: 'عهد الموظفين وتصفيتها', labelAr: 'صرف عهدة نقدية جديدة لموظف' },
  { code: 'custody.expense', module: 'custody', moduleLabelAr: 'عهد الموظفين وتصفيتها', labelAr: 'تسجيل مصروف من العهدة' },
  { code: 'custody.settle', module: 'custody', moduleLabelAr: 'عهد الموظفين وتصفيتها', labelAr: 'استرداد المتبقي وتسوية العهدة' },
  { code: 'custody.manage', module: 'custody', moduleLabelAr: 'عهد الموظفين وتصفيتها', labelAr: 'إدارة ومتابعة العهد وتصفيتها' },

  // 7. الموظفين
  { code: 'users.view', module: 'users', moduleLabelAr: 'الموظفون وفريق العمل', labelAr: 'عرض قائمة موظفي النظام' },
  { code: 'users.invite', module: 'users', moduleLabelAr: 'الموظفون وفريق العمل', labelAr: 'إرسال دعوات انضمام لموظفين جدد' },
  { code: 'users.manage_roles', module: 'users', moduleLabelAr: 'الموظفون وفريق العمل', labelAr: 'تغيير وتعيين أدوار الموظفين' },

  // 8. إدارة الأدوار
  { code: 'roles.manage', module: 'roles', moduleLabelAr: 'إدارة الأدوار والصلاحيات', labelAr: 'إدارة الأدوار وتعديل صلاحيات النظام' },

  // 9. الإعدادات
  { code: 'settings.view', module: 'settings', moduleLabelAr: 'إعدادات التشغيل العامة', labelAr: 'عرض بيانات الموانئ والتوكيلات والمقاولين' },
  { code: 'settings.edit', module: 'settings', moduleLabelAr: 'إعدادات التشغيل العامة', labelAr: 'إضافة وتعديل بيانات الموانئ والإعدادات' },

  // 10. التدقيق
  { code: 'audit.view', module: 'audit', moduleLabelAr: 'سجل التدقيق والرقابة', labelAr: 'عرض سجل الحركات وعمليات النظام (Audit Logs)' },
];

export const DEFAULT_ROLES = [
  {
    key: 'admin',
    name: 'مدير النظام (Admin)',
    description: 'كامل الصلاحيات الإدارية والمالية وإدارة الأدوار والمستخدمين',
    isSystem: true,
    permissions: SYSTEM_PERMISSIONS.map((p) => p.code),
  },
  {
    key: 'accountant',
    name: 'محاسب مالي (Accountant)',
    description: 'إدارة الخزينة، تسجيل المصروفات، كشوف الحسابات والأمانات والعهد',
    isSystem: true,
    permissions: [
      'treasury.view',
      'treasury.create',
      'treasury.manage_safes',
      'treasury.transfer',
      'treasury.reverse',
      'custody.view',
      'custody.create',
      'custody.expense',
      'custody.settle',
      'statements.view',
      'statements.create',
      'statements.edit',
      'statements.print',
      'deposits.view',
      'deposits.create',
      'clients.view',
      'shipments.view',
    ],
  },
  {
    key: 'clearance_officer',
    name: 'مخلص جمركي (Clearance Officer)',
    description: 'متابعة الشحنات الميدانية، البوالص، الإفراج الجمركي والموانئ',
    isSystem: true,
    permissions: [
      'shipments.view',
      'shipments.create',
      'shipments.edit',
      'clients.view',
      'settings.view',
    ],
  },
  {
    key: 'data_entry',
    name: 'مدخل بيانات (Data Entry)',
    description: 'تسجيل بيانات العملاء الأولية والشحنات الجديدة',
    isSystem: true,
    permissions: [
      'clients.view',
      'clients.create',
      'clients.edit',
      'shipments.view',
      'shipments.create',
    ],
  },
];
