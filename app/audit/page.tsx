'use client';

import React, { useEffect, useState } from 'react';
import SidebarLayout from '../../components/SidebarLayout';
import PermissionGuard from '../../components/PermissionGuard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import {
  ShieldAlert,
  Search,
  Activity,
  X,
  User,
  Eye,
  Calendar,
  AlertCircle,
  Download,
  Filter,
  FileSpreadsheet,
  RefreshCw,
  Wallet,
  PiggyBank,
  Ship,
  FileText,
  Building2,
  SlidersHorizontal,
  CheckCircle2,
  Tag,
  ArrowRightLeft,
  Layers
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  tableName: string;
  recordId: string;
  action: string;
  oldData: any;
  newData: any;
  changedByEmail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

const FIELD_LABELS: Record<string, string> = {
  name: 'الاسم',
  email: 'البريد الإلكتروني',
  amount: 'المبلغ والقيمة',
  currency: 'العملة',
  notes: 'البيان والتفاصيل',
  notes_ar: 'البيان',
  description: 'الوصف والبيان',
  status: 'الحالة التشغيلية',
  status_id: 'حالة الشحنة',
  is_active: 'تفعيل الحساب',
  role: 'الدور الوظيفي',
  role_id: 'معرف الدور',
  fingerprint: 'كود البصمة',
  bol_number: 'رقم بوليصة الشحن (BOL)',
  bolNumber: 'رقم بوليصة الشحن (BOL)',
  acid: 'رقم الـ ACID الجمركي',
  declaration_number_46: 'رقم إقرار 46 الجمركي',
  declarationNumber46: 'رقم إقرار 46 الجمركي',
  reference_number: 'رقم المرجع / الشيك',
  referenceNumber: 'رقم المرجع / الشيك',
  transaction_type: 'نوع الحركة المالية',
  transactionType: 'نوع الحركة المالية',
  transaction_date: 'تاريخ الحركة',
  transactionDate: 'تاريخ الحركة',
  is_reversed: 'حالة عكس القيد',
  isReversed: 'حالة عكس القيد',
  reversal_reason: 'سبب عكس القيد',
  reversalReason: 'سبب عكس القيد',
  phone: 'رقم الهاتف',
  address: 'العنوان',
  tax_number: 'الرقم الضريبي',
  taxNumber: 'الرقم الضريبي',
  total_issued: 'إجمالي العهدة الممنوحة',
  totalIssued: 'إجمالي العهدة الممنوحة',
  total_spent: 'إجمالي المصروفات',
  totalSpent: 'إجمالي المصروفات',
  remaining_amount: 'الرصيد المتبقي',
  remainingAmount: 'الرصيد المتبقي',
};

export default function AuditPage() {
  const { getAuthToken } = useAuth();
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  async function loadLogs() {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/audit', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        setLogs(await res.json());
      } else {
        showToast('فشل تحميل سجل تدقيق العمليات', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء تحميل السجلات', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [getAuthToken]);

  // Filter logs based on search, table select, and action select
  const filteredLogs = logs.filter((log) => {
    const tableMatch = selectedTable === 'all' || log.tableName === selectedTable;
    const actionMatch = selectedAction === 'all' || log.action === selectedAction;
    
    const query = searchQuery.toLowerCase().trim();
    const searchMatch =
      !query ||
      (log.tableName || '').toLowerCase().includes(query) ||
      (log.changedByEmail || '').toLowerCase().includes(query) ||
      (log.action || '').toLowerCase().includes(query) ||
      JSON.stringify(log.newData || {}).toLowerCase().includes(query) ||
      JSON.stringify(log.oldData || {}).toLowerCase().includes(query);

    return tableMatch && actionMatch && searchMatch;
  });

  // Calculate top summary metrics
  const totalCount = logs.length;
  const last24hCount = logs.filter((l) => {
    const logTime = new Date(l.createdAt).getTime();
    const now = Date.now();
    return now - logTime <= 24 * 60 * 60 * 1000;
  }).length;

  const shipmentsOpsCount = logs.filter((l) => l.tableName === 'shipments').length;
  const clientDepositsOpsCount = logs.filter(
    (l) => l.tableName === 'deposits' || l.tableName === 'client_deposits'
  ).length;

  // Export filtered logs to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      showToast('لا توجد سجلات معروضة للتصدير', 'warning');
      return;
    }

    const headers = ['تاريخ الحركة', 'نوع الحركة', 'قسم البيانات', 'منفذ العملية', 'تفاصيل التغيرات'];
    const rows = filteredLogs.map((l) => [
      new Date(l.createdAt).toLocaleString('ar-EG'),
      l.action,
      getTableLabelArabic(l.tableName),
      l.changedByEmail || 'غير معروف',
      getHumanSummary(l),
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(','))].join(
        '\n'
      );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sijil_altadqiq_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('تم تصدير سجل التدقيق إلى ملف CSV بنجاح', 'success');
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'INSERT':
        return { label: 'إنشاء', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'UPDATE':
        return { label: 'تعديل', style: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'DELETE':
        return { label: 'حذف', style: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'REVERSAL':
      case 'REVERSE':
        return { label: 'عكس قيد', style: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: action, style: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const getTableBadgeConfig = (tableName: string) => {
    switch (tableName) {
      case 'employee_custodies':
      case 'custody_expenses':
      case 'custodies':
        return { label: 'عهدة موظف', style: 'bg-purple-50 text-purple-700 border-purple-200', icon: Wallet };
      case 'deposits':
      case 'client_deposits':
        return { label: 'أمانة/وديعة عميل', style: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: PiggyBank };
      case 'treasury_transactions':
        return { label: 'حركة خزينة', style: 'bg-blue-50 text-blue-700 border-blue-200', icon: Activity };
      case 'shipments':
        return { label: 'الشحنات والجمرك', style: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Ship };
      case 'statements':
      case 'statement_items':
        return { label: 'كشوف الحسابات', style: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: FileText };
      case 'clients':
      case 'client_items':
      case 'client_pricing':
        return { label: 'إدارة العملاء', style: 'bg-teal-50 text-teal-700 border-teal-200', icon: Building2 };
      case 'users':
      case 'profiles':
        return { label: 'فريق العمل', style: 'bg-amber-50 text-amber-700 border-amber-200', icon: User };
      default:
        return { label: getTableLabelArabic(tableName), style: 'bg-slate-50 text-slate-700 border-slate-200', icon: Layers };
    }
  };

  function getTableLabelArabic(name: string): string {
    const mapping: Record<string, string> = {
      clients: 'بيانات العملاء',
      client_items: 'أصناف بنود العميل',
      client_pricing: 'تسعير اتفاقيات العملاء',
      ports: 'الموانئ والمنافذ الجمركية',
      agencies: 'التوكيلات الملاحية',
      contractors: 'مقاولو النقل والتفريغ',
      statuses: 'الحالات الجمركية',
      shipments: 'الشحنات وبوالص الشحن',
      statements: 'كشوف الحسابات والتسويات',
      statement_items: 'بنود كشوف الحسابات',
      deposits: 'أمانات وودائع العملاء',
      client_deposits: 'أمانات وودائع العملاء',
      employee_custodies: 'عهد الموظفين وتصفيتها',
      custody_expenses: 'مصروفات عهد الموظفين',
      treasury_transactions: 'حركات الخزينة والسيولة',
      profiles: 'بيانات وحسابات الموظفين',
      users: 'الموظفون وفريق العمل',
      roles: 'الأدوار والصلاحيات',
      permissions: 'أذونات النظام',
      settings: 'إعدادات التشغيل العامة',
    };
    return mapping[name] || name;
  }

  function getHumanSummary(log: AuditLogEntry): string {
    const data = log.newData || log.oldData || {};
    const table = log.tableName;

    if (table === 'treasury_transactions') {
      const type = data.transaction_type || data.transactionType || data.type;
      const typeStr =
        type === 'deposit'
          ? 'إيداع / قبض خزينة'
          : type === 'withdraw'
          ? 'سحب / صرف خزينة'
          : type === 'reversal'
          ? 'عكس قيد'
          : 'حركة نقدية';
      const refStr = data.reference_number || data.referenceNumber ? `(مرجع: ${data.reference_number || data.referenceNumber})` : '';
      return `${typeStr} بمبلغ ${parseFloat(data.amount || 0).toLocaleString()} ${data.currency || 'EGP'} ${data.notes ? `(${data.notes})` : refStr}`;
    }

    if (table === 'deposits' || table === 'client_deposits') {
      const type = data.type || data.deposit_type;
      const typeStr = type === 'refund' || type === 'withdraw' ? 'استرداد/صرف أمانة عميل' : 'إيداع/قبض أمانة عميل';
      return `${typeStr} بمبلغ ${parseFloat(data.amount || 0).toLocaleString()} ${data.currency || 'EGP'} ${data.notes ? `(${data.notes})` : ''}`;
    }

    if (table === 'employee_custodies' || table === 'custodies') {
      return `صرف عهدة نقدية للموظف بمبلغ ${parseFloat(data.amount || data.total_issued || data.totalIssued || 0).toLocaleString()} ${data.currency || 'EGP'} ${data.notes ? `(${data.notes})` : ''}`;
    }

    if (table === 'custody_expenses') {
      return `تسجيل مصروف عهدة بمبلغ ${parseFloat(data.amount || 0).toLocaleString()} ${data.currency || 'EGP'} - ${data.description || data.notes || ''}`;
    }

    if (table === 'shipments') {
      const bolStr = data.bol_number || data.bolNumber ? `بوليصة: ${data.bol_number || data.bolNumber}` : data.acid ? `ACID: ${data.acid}` : '';
      return `ملف شحنة جمركية ${bolStr}`;
    }

    if (table === 'clients') {
      return `بيانات العميل: ${data.name || ''}`;
    }

    if (table === 'profiles' || table === 'users') {
      return `حساب الموظف: ${data.name || data.email || ''}`;
    }

    if (table === 'roles') {
      return `الدور الوظيفي: ${data.name || ''}`;
    }

    if (data.name) return `سجل: ${data.name}`;
    if (data.notes) return `البيان: ${data.notes}`;
    if (data.description) return `الوصف: ${data.description}`;

    return `عملية ${log.action === 'INSERT' ? 'إضافة' : log.action === 'UPDATE' ? 'تعديل' : 'حذف'} في ${getTableLabelArabic(table)}`;
  }

  // Format diff rows between oldData and newData
  function renderFieldDiffs(oldData: any, newData: any) {
    const keys = Array.from(new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]));
    const ignoredKeys = [
      'id',
      'created_at',
      'createdAt',
      'updated_at',
      'updatedAt',
      'company_id',
      'companyId',
      'created_by',
      'createdBy',
      'updated_by',
      'updatedBy',
      'client_id',
      'clientId',
      'statement_id',
      'statementId',
      'reversed_transaction_id',
      'reversed_by_transaction_id',
      'reversedTransactionId',
      'reversedByTransactionId',
      'exchange_rate_at_transaction',
      'exchangeRateAtTransaction',
    ];
    
    const diffs = keys.filter((k) => {
      if (ignoredKeys.includes(k)) return false;

      const valOld = oldData?.[k];
      const valNew = newData?.[k];

      // Hide is_reversed if false/null/undefined in both
      if (k === 'is_reversed' || k === 'isReversed') {
        return Boolean(valOld) || Boolean(valNew);
      }

      // Hide reversal_reason if empty/null in both (only show if there's actual reversal reason text)
      if (k === 'reversal_reason' || k === 'reversalReason') {
        return (valOld && String(valOld).trim() !== '') || (valNew && String(valNew).trim() !== '');
      }

      // Skip fields that are empty/null/undefined in both
      const isOldEmpty = valOld === null || valOld === undefined || valOld === '';
      const isNewEmpty = valNew === null || valNew === undefined || valNew === '';
      if (isOldEmpty && isNewEmpty) return false;

      const valOldStr = JSON.stringify(valOld);
      const valNewStr = JSON.stringify(valNew);
      return valOldStr !== valNewStr;
    });

    if (diffs.length === 0) {
      return (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500 font-medium">
          لا توجد تغييرات تفصيلية في الحقول الفرعية لهذا السجل.
        </div>
      );
    }

    return (
      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
            <tr>
              <th className="p-3">الحقل / البيان</th>
              <th className="p-3">القيمة السابقة (قبل)</th>
              <th className="p-3">القيمة المحدثة (بعد)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {diffs.map((key) => {
              const label = FIELD_LABELS[key] || key;
              const oldVal = oldData?.[key];
              const newVal = newData?.[key];

              const formatVal = (v: any, k: string) => {
                if (v === null || v === undefined || v === '') return <span className="text-slate-400 font-light">ـ</span>;
                if (typeof v === 'boolean') {
                  if (k === 'is_reversed' || k === 'isReversed') return v ? 'قيد معكوس' : 'غير معكوس';
                  return v ? 'مفعل / نعم' : 'غير مفعل / لا';
                }
                if (k === 'transaction_type' || k === 'transactionType') {
                  if (v === 'deposit') return 'إيداع / قبض خزينة';
                  if (v === 'withdraw') return 'سحب / صرف خزينة';
                  if (v === 'reversal') return 'عكس قيد';
                }
                if (k === 'deposit_type' || k === 'type') {
                  if (v === 'deposit') return 'إيداع أمانة';
                  if (v === 'refund' || v === 'withdraw') return 'استرداد / صرف أمانة';
                }
                if (typeof v === 'object') return JSON.stringify(v);
                return String(v);
              };

              return (
                <tr key={key} className="hover:bg-slate-50/50 transition">
                  <td className="p-3 font-bold text-slate-800 bg-slate-50/30">{label}</td>
                  <td className="p-3 text-rose-700 bg-rose-50/30 font-medium">{formatVal(oldVal, key)}</td>
                  <td className="p-3 text-emerald-700 bg-emerald-50/30 font-bold">{formatVal(newVal, key)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <PermissionGuard requiredPermission="audit.view" pageTitle="سجل الرقابة والتدقيق">
      <SidebarLayout>
      <div className="space-y-6">
        {/* Header Breadcrumb & Export Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span>إدارة النظام</span>
              <span>/</span>
              <span className="text-slate-700 font-medium">سجل التدقيق والرقابة</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">سجل عمليات التدقيق والرقابة (Audit Log)</h1>
                <p className="text-xs text-slate-500">
                  من فعل ماذا ومتى — سجل إضافي غير قابل للتعديل أو الحذف لضمان أعلى مستويات الشفافية
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadLogs}
              disabled={loading}
              className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span>تصدير السجل (CSV)</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 block mb-1">إجمالي العمليات المسجلة</span>
              <span className="text-2xl font-black text-slate-900">{totalCount}</span>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 block mb-1">عمليات آخر 24 ساعة</span>
              <span className="text-2xl font-black text-slate-900">{last24hCount}</span>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 block mb-1">حركات الشحنات</span>
              <span className="text-2xl font-black text-slate-900">{shipmentsOpsCount}</span>
            </div>
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl">
              <Ship className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 block mb-1">أمانات وودائع العملاء</span>
              <span className="text-2xl font-black text-slate-900">{clientDepositsOpsCount}</span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <PiggyBank className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="البحث بالموظف، البيان، أو المعرّف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Table / Module Select Filter */}
            <div>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
              >
                <option value="all">كل الجداول والأقسام</option>
                <option value="shipments">الشحنات والجمرك</option>
                <option value="treasury_transactions">حركات الخزينة والسيولة</option>
                <option value="deposits">أمانات/ودائع العملاء</option>
                <option value="employee_custodies">عهد الموظفين وتصفيتها</option>
                <option value="custody_expenses">مصروفات عهد الموظفين</option>
                <option value="statements">كشوف الحسابات</option>
                <option value="clients">بيانات العملاء</option>
                <option value="client_items">أصناف العملاء</option>
                <option value="client_pricing">تسعير الخدمات</option>
                <option value="profiles">الموظفون وفريق العمل</option>
                <option value="roles">الأدوار والصلاحيات</option>
              </select>
            </div>

            {/* Action Select Filter */}
            <div>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
              >
                <option value="all">كل نوعيات العمليات</option>
                <option value="INSERT">إنشاء / إضافة جديدة</option>
                <option value="UPDATE">تعديل / تحديث بيانات</option>
                <option value="DELETE">حذف سجل</option>
                <option value="REVERSAL">عكس قيد مالي</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
            <span>
              عرض <strong className="text-slate-800 font-bold">{filteredLogs.length}</strong> من أصل {logs.length} عملية مسجلة
            </span>
            {(selectedTable !== 'all' || selectedAction !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedTable('all');
                  setSelectedAction('all');
                  setSearchQuery('');
                }}
                className="text-indigo-600 hover:underline font-bold"
              >
                إعادة ضبط الفلاتر
              </button>
            )}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs text-slate-400">جاري تحميل سجل التدقيق من قاعدة البيانات...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">سجل التدقيق نظيف وخالٍ من العمليات المطابقة للفلتر حالياً</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-4">نوع الحركة</th>
                    <th className="p-4">قسم البيانات</th>
                    <th className="p-4">ملخص العملية</th>
                    <th className="p-4">منفذ العملية</th>
                    <th className="p-4">تاريخ ووقت الحركة</th>
                    <th className="p-4 text-center">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredLogs.map((log) => {
                    const actionBadge = getActionBadge(log.action);
                    const tableConfig = getTableBadgeConfig(log.tableName);
                    const TableIcon = tableConfig.icon;
                    const summaryText = getHumanSummary(log);

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4">
                          <span className={`inline-flex px-2.5 py-0.5 border text-[10px] font-bold rounded-lg ${actionBadge.style}`}>
                            {actionBadge.label}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-800">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] ${tableConfig.style}`}>
                            <TableIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{tableConfig.label}</span>
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-slate-900 max-w-xs truncate" title={summaryText}>
                          {summaryText}
                        </td>
                        <td className="p-4 text-slate-600 font-medium">
                          {log.changedByEmail || 'ـ'}
                        </td>
                        <td className="p-4 text-slate-400 font-mono">
                          {new Date(log.createdAt).toLocaleString('ar-EG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 mx-auto"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>استعراض</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Human-Readable Audit Details Modal (No Raw JSON) */}
        {selectedLog && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 border border-slate-100 shadow-2xl space-y-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      تفاصيل حركة التدقيق: {getTableLabelArabic(selectedLog.tableName)}
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">معرّف السجل: {selectedLog.recordId}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Action Banner */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">ملخص الحركة المنفذة:</span>
                  <span className={`px-2.5 py-0.5 border text-xs font-bold rounded-lg ${getActionBadge(selectedLog.action).style}`}>
                    {getActionBadge(selectedLog.action).label}
                  </span>
                </div>
                <p className="text-sm font-black text-slate-900 leading-relaxed">
                  {getHumanSummary(selectedLog)}
                </p>
              </div>

              {/* Meta information */}
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block mb-0.5">منفّذ العملية:</span>
                  <strong className="text-slate-800 font-bold">{selectedLog.changedByEmail || 'غير معروف'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">تاريخ ووقت التنفيذ:</span>
                  <strong className="text-slate-800 font-bold">
                    {new Date(selectedLog.createdAt).toLocaleString('ar-EG')}
                  </strong>
                </div>
              </div>

              {/* Clean Human-Readable Diffs */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900">التغيرات والتعديلات التفصيلية في الحقول:</h4>
                {renderFieldDiffs(selectedLog.oldData, selectedLog.newData)}
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end border-t border-slate-100 pt-4">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition shadow-sm"
                >
                  إغلاق النافذة
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
    </PermissionGuard>
  );
}
