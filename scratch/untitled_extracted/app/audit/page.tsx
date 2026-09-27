'use client';

import React, { useEffect, useState } from 'react';
import SidebarLayout from '../../components/SidebarLayout';
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
  AlertCircle
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

export default function AuditPage() {
  const { getAuthToken } = useAuth();
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  async function loadLogs() {
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
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [getAuthToken]);

  const filteredLogs = logs.filter((log) =>
    (log.tableName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.changedByEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.action || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getActionBadge = (action: string) => {
    const config: Record<string, string> = {
      INSERT: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      UPDATE: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      DELETE: 'bg-red-50 text-red-700 border-red-100'
    };
    return config[action] || 'bg-slate-50 text-slate-700 border-slate-100';
  };

  const getTableNameArabic = (name: string) => {
    const mapping: Record<string, string> = {
      clients: 'العملاء المستوردين',
      client_items: 'أصناف بضائع المستورد',
      client_pricing: 'اتفاقيات التسعير',
      ports: 'الموانئ والمنافذ جمركياً',
      agencies: 'الخطوط والتوكيلات الملاحية',
      contractors: 'مقاولين النقل والعتالة',
      statuses: 'الحالات الجمركية للبضائع',
      shipments: 'ملفات بوالص الشحن',
      statements: 'كشوف الحساب والفواتير الكلية',
      statement_items: 'حركات فواتير الشحن والتسويات',
      client_deposits: 'سندات الأمانات والعهد المالية',
      treasury_transactions: 'المعاملات المالية ودفاتر اليومية للخزانة',
      user_invitations: 'دعوات وتراخيص الموظفين الجدد'
    };
    return mapping[name] || name;
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Header Block */}
        <div>
          <h1 className="text-2xl font-black text-slate-900">سجل عمليات التدقيق والرقابة (Audit Trail)</h1>
          <p className="text-sm text-slate-500 font-light mt-1">
            سجل تتبع شامل لجميع التعديلات، الإضافات وعمليات العكس المالي المسجلة في قاعدة البيانات لضمان أعلى مستويات الدقة والنزاهة المحاسبية.
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="البحث بالموظف، اسم الجدول أو الإجراء..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            />
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-xl"></div>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-12">سجل التدقيق نظيف وخالٍ من العمليات حالياً.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-4">نوع الحركة</th>
                    <th className="p-4">البيانات المعدلة</th>
                    <th className="p-4">منفذ العملية</th>
                    <th className="p-4">عنوان الـ IP والموقع</th>
                    <th className="p-4">تاريخ ووقت الحركة</th>
                    <th className="p-4">تفاصيل الفروق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-0.5 border text-[10px] font-bold rounded-lg ${getActionBadge(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-800">
                        {getTableNameArabic(log.tableName)}
                      </td>
                      <td className="p-4 text-slate-500 font-medium">
                        {log.changedByEmail}
                      </td>
                      <td className="p-4 font-mono text-slate-400">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="p-4 text-slate-400">
                        {new Date(log.createdAt).toLocaleString('ar-EG')}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" /> استعراض التغيرات
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Audit Details Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 md:p-8 border border-slate-100 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-slate-900">
                    مقارنة الفروقات والتغيرات لقيد: {getTableNameArabic(selectedLog.tableName)}
                  </h3>
                </div>
                <button onClick={() => setSelectedLog(null)} className="p-1 rounded-lg text-slate-400">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mt-6 space-y-6 text-xs">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-500">
                  <div>
                    <span className="block font-light">منفذ الحركة:</span>
                    <span className="font-bold text-slate-800">{selectedLog.changedByEmail}</span>
                  </div>
                  <div>
                    <span className="block font-light">وقت الحركة التفصيلي:</span>
                    <span className="font-bold text-slate-800">{new Date(selectedLog.createdAt).toLocaleString('ar-EG')}</span>
                  </div>
                </div>

                {/* Diff Viewer */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Before */}
                  <div className="space-y-1.5">
                    <span className="font-bold text-red-600 block bg-red-50 p-2 rounded-xl border border-red-100">
                      الحالة السابقة للبيانات (قبل التعديل)
                    </span>
                    <pre className="p-4 bg-slate-950 text-slate-200 rounded-xl font-mono text-[10px] overflow-auto max-h-56 select-all">
                      {selectedLog.oldData ? JSON.stringify(selectedLog.oldData, null, 2) : '// لا توجد بيانات سابقة أو قيد إدخال جديد'}
                    </pre>
                  </div>

                  {/* After */}
                  <div className="space-y-1.5">
                    <span className="font-bold text-emerald-600 block bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                      الحالة المحدثة للبيانات (بعد التعديل)
                    </span>
                    <pre className="p-4 bg-slate-950 text-slate-200 rounded-xl font-mono text-[10px] overflow-auto max-h-56 select-all">
                      {selectedLog.newData ? JSON.stringify(selectedLog.newData, null, 2) : '// تم حذف السجل بالكامل'}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-4 mt-6">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold"
                >
                  إغلاق النافذة
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
