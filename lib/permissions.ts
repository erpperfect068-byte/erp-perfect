export interface PermissionDefinition {
  code: string;
  module: string;
  moduleLabelAr: string;
  labelAr: string;
  descriptionAr?: string;
}

export const MODULE_LABELS: Record<string, string> = {
  client_items: 'أصناف وبنود العملاء',
  client_pricing: 'تسعير اتفاقيات العملاء',
  statuses: 'الحالات الجمركية وتتبع الشحنات',
  agencies: 'التوكيلات الملاحية',
  contractors: 'مقاولو النقل والتفريغ',
  ports: 'الموانئ والمنافذ الجمركية',
  statements: 'كشوف الحسابات والتسويات',
  statement_items: 'بنود كشوف الحسابات',
  deposits: 'أمانات وودائع العملاء',
  treasury: 'الخزينة والمعاملات المالية',
  custody: 'عهد الموظفين وتصفيتها',
  users: 'الموظفون وفريق العمل',
  roles: 'الأدوار والصلاحيات',
  audit: 'سجل التدقيق والرقابة',
  settings: 'إعدادات التشغيل العامة',
  shipments: 'إدارة الشحنات والبوالص',
  clients: 'إدارة العملاء',
  reports: 'التقارير والإحصائيات',
};

export const PERMISSION_LABELS: Record<string, string> = {
  // audit
  'audit.read': 'عرض سجل التدقيق',
  'audit.export': 'تصدير سجل التدقيق',
  'audit.view': 'عرض سجل التدقيق والمراجعة',

  // client_items
  'client_items.read': 'استعراض أصناف العميل',
  'client_items.create': 'إضافة أصناف جديدة',
  'client_items.update': 'تعديل أصناف العميل',
  'client_items.delete': 'حذف صنف',

  // client_pricing
  'client_pricing.read': 'عرض أسعار الخدمات',
  'client_pricing.create': 'إضافة تسعير خدمة',
  'client_pricing.update': 'تعديل التسعير',
  'client_pricing.delete': 'حذف اتفاقية تسعير',

  // clients
  'clients.read': 'عرض قائمة العملاء',
  'clients.view': 'عرض قائمة العملاء وتفاصيلهم',
  'clients.create': 'إضافة عميل جديد',
  'clients.update': 'تعديل بيانات عميل',
  'clients.edit': 'تعديل بيانات العملاء وقوائم الأسعار',
  'clients.delete': 'حذف عميل',

  // shipments
  'shipments.read': 'عرض الشحنات',
  'shipments.view': 'عرض الشحنات والشهادات الجمركية',
  'shipments.create': 'فتح ملف شحنة',
  'shipments.update': 'تعديل بيانات الشحنة',
  'shipments.edit': 'تحديث بيانات ومراحل الشحنات',
  'shipments.delete': 'حذف الشحنات',

  // treasury
  'treasury.read': 'عرض حركات الخزينة',
  'treasury.view': 'عرض أرصدة وحركات الخزينة',
  'treasury.create': 'تسجيل إيداع أو سحب',
  'treasury.delete': 'حذف حركة خزينة',
  'treasury.reverse': 'عكس وإلغاء حركات الخزينة',

  // custody
  'custody.read': 'عرض عهد الموظفين',
  'custody.create': 'صرف عهدة نقدية',
  'custody.issue': 'صرف وتسليم عهدة جديدة لموظف',
  'custody.expense': 'تسجيل مصروف من العهدة',
  'custody.settle': 'استرداد المتبقي وإقفال العهدة',
  'custody.close': 'تسوية وقفل العهدة نهائياً',
  'custody.reverse': 'إبطال/عكس بند مصروف عهدة',

  // deposits
  'deposits.read': 'عرض الأمانات والودائع',
  'deposits.view': 'عرض سجل ودائع وأمانات العملاء',
  'deposits.create': 'تسجيل أمانة/وديعة جديدة',
  'deposits.update': 'تعديل عهد وأمانات',
  'deposits.delete': 'حذف عهد وأمانات',
  'deposits.refund': 'استرداد وديعة/أمانة',

  // statements
  'statements.read': 'عرض كشوف الحسابات',
  'statements.view': 'عرض كشوف الحسابات والمصروفات',
  'statements.create': 'إنشاء كشف حساب',
  'statements.update': 'تعديل كشف حساب',
  'statements.edit': 'تعديل مبالغ ومصروفات كشف الحساب',
  'statements.delete': 'حذف كشوف حسابات',
  'statements.print': 'طباعة وتصدير كشف الحساب إلى Excel',

  // statement_items
  'statement_items.read': 'استعراض بنود كشوف الحسابات',
  'statement_items.create': 'إضافة بنود لكشف الحساب',
  'statement_items.update': 'تعديل بنود كشف الحساب',
  'statement_items.delete': 'حذف بند من كشف الحساب',

  // users
  'users.read': 'عرض قائمة الموظفين',
  'users.view': 'عرض قائمة موظفي النظام',
  'users.create': 'إضافة موظف جديد',
  'users.invite': 'دعوة موظف جديد',
  'users.update': 'تعديل بيانات الموظف',
  'users.manage_roles': 'تغيير وتعيين أدوار الموظفين',
  'users.delete': 'إيقاف/حذف مستخدمين',

  // roles
  'roles.read': 'عرض الأدوار والصلاحيات',
  'roles.create': 'إضافة دور وظيفي جديد',
  'roles.update': 'تعديل صلاحيات الدور',
  'roles.delete': 'حذف دور وظيفي',
  'roles.manage': 'إدارة الأدوار والتعديل عليها',

  // agencies
  'agencies.read': 'عرض التوكيلات الملاحية',
  'agencies.create': 'إضافة توكيل ملاحي',
  'agencies.update': 'تعديل توكيل ملاحي',
  'agencies.delete': 'حذف توكيل ملاحي',

  // contractors
  'contractors.read': 'عرض مقاولي النقل',
  'contractors.create': 'إضافة مقاول نقل',
  'contractors.update': 'تعديل مقاول نقل',
  'contractors.delete': 'حذف مقاول نقل',

  // ports
  'ports.read': 'عرض الموانئ والمنافذ',
  'ports.create': 'إضافة منفذ جمركي/ميناء',
  'ports.update': 'تعديل بيانات ميناء/منفذ',
  'ports.delete': 'حذف ميناء/منفذ',

  // statuses
  'statuses.read': 'عرض الحالات الجمركية',
  'statuses.create': 'إضافة حالة جمركية',
  'statuses.update': 'تعديل حالة جمركية',
  'statuses.delete': 'حذف حالة جمركية',

  // settings
  'settings.read': 'عرض إعدادات النظام',
  'settings.view': 'عرض بيانات الموانئ والتوكيلات والمقاولين',
  'settings.update': 'تعديل إعدادات النظام',
  'settings.edit': 'إضافة وتعديل بيانات الموانئ والإعدادات',
  'settings.manage': 'إدارة إعدادات التشغيل العامة',

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
  { code: 'clients.view', module: 'clients', moduleLabelAr: 'إدارة العملاء', labelAr: 'عرض قائمة العملاء وتفاصيلهم' },
  { code: 'clients.create', module: 'clients', moduleLabelAr: 'إدارة العملاء', labelAr: 'إضافة عميل جديد' },
  { code: 'clients.edit', module: 'clients', moduleLabelAr: 'إدارة العملاء', labelAr: 'تعديل بيانات العملاء وقوائم الأسعار' },
  { code: 'clients.delete', module: 'clients', moduleLabelAr: 'إدارة العملاء', labelAr: 'حذف العملاء' },

  // 2. الشحنات
  { code: 'shipments.view', module: 'shipments', moduleLabelAr: 'الشحنات والتخليص', labelAr: 'عرض الشحنات والشهادات الجمركية' },
  { code: 'shipments.create', module: 'shipments', moduleLabelAr: 'الشحنات والتخليص', labelAr: 'تسجيل شحنة وبوليصة جديدة' },
  { code: 'shipments.edit', module: 'shipments', moduleLabelAr: 'الشحنات والتخليص', labelAr: 'تحديث بيانات ومراحل الشحنات' },
  { code: 'shipments.delete', module: 'shipments', moduleLabelAr: 'الشحنات والتخليص', labelAr: 'حذف الشحنات' },

  // 3. الخزينة
  { code: 'treasury.view', module: 'treasury', moduleLabelAr: 'الخزينة والمقبوضات', labelAr: 'عرض أرصدة وحركات الخزينة' },
  { code: 'treasury.create', module: 'treasury', moduleLabelAr: 'الخزينة والمقبوضات', labelAr: 'تسجيل سندات قبض وصرف' },
  { code: 'treasury.reverse', module: 'treasury', moduleLabelAr: 'الخزينة والمقبوضات', labelAr: 'عكس وإلغاء حركات الخزينة' },

  // 4. كشوف الحسابات
  { code: 'statements.view', module: 'statements', moduleLabelAr: 'كشوف الحسابات', labelAr: 'عرض كشوف الحسابات والمصروفات' },
  { code: 'statements.create', module: 'statements', moduleLabelAr: 'كشوف الحسابات', labelAr: 'إنشاء كشف حساب وتوليد بنود' },
  { code: 'statements.edit', module: 'statements', moduleLabelAr: 'كشوف الحسابات', labelAr: 'تعديل مبالغ ومصروفات كشف الحساب' },
  { code: 'statements.print', module: 'statements', moduleLabelAr: 'كشوف الحسابات', labelAr: 'طباعة وتصدير كشف الحساب إلى Excel' },

  // 5. الأمانات والودائع
  { code: 'deposits.view', module: 'deposits', moduleLabelAr: 'الأمانات والودائع', labelAr: 'عرض سجل ودائع وأمانات العملاء' },
  { code: 'deposits.create', module: 'deposits', moduleLabelAr: 'الأمانات والودائع', labelAr: 'إيداع أو تسوية أمانة للعميل' },

  // 6. الموظفين
  { code: 'users.view', module: 'users', moduleLabelAr: 'الموظفين وفريق العمل', labelAr: 'عرض قائمة موظفي النظام' },
  { code: 'users.invite', module: 'users', moduleLabelAr: 'الموظفين وفريق العمل', labelAr: 'إرسال دعوات انضمام لموظفين جدد' },
  { code: 'users.manage_roles', module: 'users', moduleLabelAr: 'الموظفين وفريق العمل', labelAr: 'تغيير وتعيين أدوار الموظفين' },

  // 7. إدارة الأدوار
  { code: 'roles.manage', module: 'roles', moduleLabelAr: 'إدارة الصلاحيات والأدوار', labelAr: 'إدارة الأدوار وتعديل صلاحيات النظام' },

  // 8. الإعدادات
  { code: 'settings.view', module: 'settings', moduleLabelAr: 'الإعدادات التشغيلية', labelAr: 'عرض بيانات الموانئ والتوكيلات والمقاولين' },
  { code: 'settings.edit', module: 'settings', moduleLabelAr: 'الإعدادات التشغيلية', labelAr: 'إضافة وتعديل بيانات الموانئ والإعدادات' },

  // 9. التدقيق
  { code: 'audit.view', module: 'audit', moduleLabelAr: 'سجل التدقيق والمراجعة', labelAr: 'عرض سجل الحركات وعمليات النظام (Audit Logs)' },
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
    description: 'إدارة الخزينة، تسجيل المصروفات، كشوف الحسابات والأمانات',
    isSystem: true,
    permissions: [
      'treasury.view',
      'treasury.create',
      'treasury.reverse',
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
