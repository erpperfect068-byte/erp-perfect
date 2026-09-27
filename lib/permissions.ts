export interface PermissionDefinition {
  code: string;
  module: string;
  moduleLabelAr: string;
  labelAr: string;
  descriptionAr?: string;
}

export const MODULE_LABELS: Record<string, string> = {
  clients: 'إدارة العملاء',
  shipments: 'الشحنات والتخليص',
  treasury: 'الخزينة والمقبوضات',
  statements: 'كشوف الحسابات',
  deposits: 'الأمانات والودائع',
  users: 'الموظفين وفريق العمل',
  roles: 'إدارة الصلاحيات والأدوار',
  settings: 'الإعدادات التشغيلية',
  audit: 'سجل التدقيق والمراجعة',
};

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
