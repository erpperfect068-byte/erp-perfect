'use client';

import React, { useEffect, useState } from 'react';
import SidebarLayout from '../../../components/SidebarLayout';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/Toast';
import RoleModal, { PermissionGroup, RoleData } from '../../../components/RoleModal';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Users,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Info,
} from 'lucide-react';
import Link from 'next/link';

interface RoleRecord extends RoleData {
  id: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  userCount: number;
}

export default function RolesSettingsPage() {
  const { getAuthToken, hasPermission, dbUser, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [totalPermCount, setTotalPermCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<RoleRecord | null>(null);

  // Delete State
  const [roleToDelete, setRoleToDelete] = useState<RoleRecord | null>(null);

  const canManageRoles = hasPermission('roles.manage');

  async function loadData() {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Load permissions
      const permsRes = await fetch('/api/permissions', { headers });
      if (permsRes.ok) {
        const permsData = await permsRes.json();
        setPermissionGroups(permsData.grouped || []);
        setTotalPermCount(permsData.permissions?.length || 0);
      }

      // Load roles
      const rolesRes = await fetch('/api/roles', { headers });
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData.roles || []);
      } else {
        const err = await rolesRes.json();
        showToast(err.error || 'فشل في تحميل قائمة الأدوار', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && canManageRoles) {
      loadData();
    } else if (!authLoading && !canManageRoles) {
      setLoading(false);
    }
  }, [authLoading, canManageRoles]);

  const handleOpenAddModal = () => {
    setRoleToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (role: RoleRecord) => {
    setRoleToEdit(role);
    setIsModalOpen(true);
  };

  const handleSaveRole = async (formData: { name: string; description: string; permissionCodes: string[] }) => {
    setActionLoading(true);
    try {
      const token = await getAuthToken();
      if (roleToEdit) {
        const res = await fetch(`/api/roles/${roleToEdit.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'فشل تحديث الدور');
        showToast('تم تحديث الدور والصلاحيات بنجاح', 'success');
      } else {
        const res = await fetch('/api/roles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'فشل إنشاء الدور');
        showToast('تم إنشاء الدور الجديد بنجاح', 'success');
      }
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء الحفظ', 'error');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    setActionLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/roles/${roleToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف الدور');
      showToast('تم حذف الدور بنجاح', 'success');
      setRoleToDelete(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء الحذف', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (!authLoading && !canManageRoles) {
    return (
      <SidebarLayout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">غير مصرح لك بالوصول</h2>
          <p className="text-sm text-slate-500 max-w-md mb-6">
            صفحة إدارة الأدوار والصلاحيات تتطلب امتلاك صلاحية <code className="bg-slate-100 px-2 py-0.5 rounded text-indigo-600 font-mono text-xs">roles.manage</code>. يرجى التواصل مع مدير النظام.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لصفحة الإعدادات</span>
          </Link>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        {/* Header Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Link href="/settings" className="hover:text-indigo-600 transition">
                إعدادات النظام
              </Link>
              <span>/</span>
              <span className="text-slate-700 font-medium">الأدوار والصلاحيات</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">إدارة الأدوار والصلاحيات</h1>
                <p className="text-xs text-slate-500">
                  التحكم في مستويات الوصول، مجموعات الصلاحيات، وتعيين المسؤوليات للموظفين
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-200 flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة دور وظيفي جديد</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 block mb-1">الأدوار المعرّفة</span>
              <span className="text-2xl font-black text-slate-900">{roles.length}</span>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Shield className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 block mb-1">إجمالي الصلاحيات بالنظام</span>
              <span className="text-2xl font-black text-slate-900">{totalPermCount}</span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 block mb-1">الموظفين المربوطين بالأدوار</span>
              <span className="text-2xl font-black text-slate-900">
                {roles.reduce((acc, curr) => acc + (curr.userCount || 0), 0)}
              </span>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Roles List */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
            <div>
              <h2 className="text-base font-bold text-slate-900">قائمة الأدوار والصلاحيات الممنوحة</h2>
              <p className="text-xs text-slate-400">انقر على زر &quot;تعديل الصلاحيات&quot; لضبط الأذونات المتاحة لكل دور</p>
            </div>
            <Link
              href="/users"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 transition"
            >
              <Users className="w-4 h-4" />
              <span>إدارة وتعيين الموظفين</span>
            </Link>
          </div>

          {loading ? (
            <div className="p-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs text-slate-400">جاري تحميل الأدوار والصلاحيات من قاعدة البيانات...</p>
            </div>
          ) : roles.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                <Shield className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">لا توجد أي أدوار مسجلة حالياً</p>
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
              >
                إنشاء أول دور وظيفي
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {roles.map((role) => {
                const permPercentage = totalPermCount > 0 ? Math.round((role.permissionCodes.length / totalPermCount) * 100) : 0;

                return (
                  <div
                    key={role.id}
                    className="p-6 hover:bg-slate-50/60 transition flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                          <Shield className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-sm">{role.name}</h3>
                            {role.isSystem && (
                              <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                دور أساسي
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{role.description || 'لا يوجد وصف مدخل'}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {role.permissionCodes.length} من {totalPermCount} صلاحية ({permPercentage}%)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{role.userCount} موظف معين</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => handleOpenEditModal(role)}
                        className="px-3.5 py-2 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-indigo-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>تعديل الصلاحيات</span>
                      </button>

                      {!role.isSystem && (
                        <button
                          onClick={() => setRoleToDelete(role)}
                          className="p-2 border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition shadow-sm"
                          title="حذف الدور"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Audit Note */}
        <div className="p-4 bg-indigo-50/60 border border-indigo-100/80 rounded-2xl flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-900 leading-relaxed">
            <strong>ملاحظة أمان وتدقيق:</strong> جميع عمليات إنشاء وتعديل وحذف الأدوار أو تعديل صلاحيات الموظفين تخضع للتحقق الأمني عبر خادم التطبيق وتُسجّل تلقائياً في سجل التدقيق والمراجعة (<Link href="/audit" className="underline font-bold">Audit Logs</Link>) موثقة بهوية المنفّذ وتاريخ التنفيذ.
          </p>
        </div>
      </div>

      <RoleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveRole}
        roleToEdit={roleToEdit}
        groups={permissionGroups}
        loading={actionLoading}
      />

      {roleToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-100 shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">تأكيد حذف الدور الوظيفي</h3>
              <p className="text-xs text-slate-500">
                هل أنت متأكد من رغبتك في حذف الدور <strong className="text-slate-800">&quot;{roleToDelete.name}&quot;</strong>؟
              </p>
              {roleToDelete.userCount > 0 && (
                <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100 font-bold mt-2">
                  تنبيه: يوجد {roleToDelete.userCount} موظف مرتبطين بهذا الدور. سيمنع النظام الحذف حتى يتم نقلهم لدور آخر.
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRoleToDelete(null)}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteRole}
                disabled={actionLoading || roleToDelete.userCount > 0}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
              >
                {actionLoading ? 'جاري الحذف...' : 'نعم، حذف الدور'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
