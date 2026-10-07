'use client';

import React, { useEffect, useState } from 'react';
import SidebarLayout from '../../components/SidebarLayout';
import PermissionGuard from '../../components/PermissionGuard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import Link from 'next/link';
import {
  UserCog,
  Plus,
  Shield,
  X,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Settings,
  ChevronDown,
  KeyRound,
  User,
  Mail,
  Eye,
  EyeOff,
  Fingerprint
} from 'lucide-react';

interface UserRecord {
  id: string;
  name: string | null;
  email: string;
  fingerprint?: number | null;
  role: string;
  roleId?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface RoleOption {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
}

export default function UsersPage() {
  const { getAuthToken, dbUser, hasPermission } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states for Direct Admin Creation
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [roleIdInput, setRoleIdInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const canManageUsers = dbUser?.role === 'admin' || hasPermission('users.manage_roles');
  const canCreateUsers = dbUser?.role === 'admin';

  async function loadTeam() {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        if (data.roles && data.roles.length > 0) {
          setRoles(data.roles);
          if (!roleIdInput) {
            setRoleIdInput(data.roles[0]?.id || '');
          }
        }
      } else {
        showToast('فشل تحميل بيانات موظفي النظام', 'error');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    setUpdatingUserId(userId);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, roleId: newRoleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تحديث دور الموظف');
      showToast('تم تحديث دور الموظف وصلاحياته بنجاح', 'success');
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, roleId: newRoleId, role: roles.find((r) => r.id === newRoleId)?.name || u.role }
            : u
        )
      );
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء تغيير الدور', 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentActive: boolean) => {
    setUpdatingUserId(userId);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, isActive: !currentActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشلت عملية تغيير حالة الحساب');
      showToast(data.message || 'تم تحديث حالة الحساب بنجاح', 'success');
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: !currentActive } : u)));
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء تغيير حالة الحساب', 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !emailInput.trim() || !passwordInput) {
      showToast('الاسم والبريد الإلكتروني وكلمة المرور مطلوبة', 'warning');
      return;
    }
    if (passwordInput.length < 6) {
      showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: nameInput.trim(),
          email: emailInput.trim(),
          password: passwordInput,
          roleId: roleIdInput || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إنشاء حساب الموظف');

      showToast(data.message || 'تم إنشاء حساب الموظف وتفعيله بنجاح!', 'success');
      setIsModalOpen(false);
      setNameInput('');
      setEmailInput('');
      setPasswordInput('');
      loadTeam();
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ بالخادم', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: 'مدير النظام', color: 'bg-red-50 text-red-700 border-red-200' },
    accountant: { label: 'محاسب مالي', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    clearance_officer: { label: 'مخلص جمركي', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    data_entry: { label: 'مدخل بيانات', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  };

  const activeUsers = users.filter((u) => u.isActive);
  const inactiveUsers = users.filter((u) => !u.isActive);

  return (
    <PermissionGuard requiredPermission={["users.view", "roles.manage"]} pageTitle="إدارة الموظفين والعمل">
      <SidebarLayout>
      <div className="space-y-6">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">إدارة الموظفين والأدوار</h1>
            <p className="text-sm text-slate-500 font-light mt-1">
              إنشاء حسابات الموظفين مباشرة، وتعيين أكواد البصمة التلقائية والأدوار والصلاحيات.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hasPermission('roles.manage') && (
              <Link
                href="/settings"
                className="flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-indigo-600 font-bold py-2.5 px-4 rounded-xl shadow-sm transition text-xs"
              >
                <Shield className="h-4 w-4" />
                <span>إدارة الأدوار والصلاحيات</span>
              </Link>
            )}
            {canCreateUsers && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm shadow-indigo-200 transition text-xs shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>إنشاء موظف جديد</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <UserCog className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{users.length}</p>
              <p className="text-xs text-slate-500">إجمالي الموظفين</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{activeUsers.length}</p>
              <p className="text-xs text-slate-500">حسابات نشطة</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{inactiveUsers.length}</p>
              <p className="text-xs text-slate-500">حسابات موقوفة</p>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-indigo-600" />
              <span>قائمة الموظفين وصلاحياتهم وأكواد البصمة</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                {users.length}
              </span>
            </h3>
            {canManageUsers && (
              <span className="text-[11px] text-slate-400">يمكنك تعديل دور أي موظف أو إيقاف حسابه مباشرة</span>
            )}
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <UserCog className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-400 font-semibold">لا يوجد موظفون مسجلون حالياً</p>
              <p className="text-xs text-slate-400 mt-1">ابدأ بإنشاء أول حساب موظف من الزر أعلاه</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-sm shadow-indigo-200">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{user.name || 'موظف'}</span>
                          {user.fingerprint && (
                            <span className="text-[11px] font-mono font-black bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1" title="كود البصمة التلقائي">
                              <Fingerprint className="h-3 w-3" />
                              #{user.fingerprint}
                            </span>
                          )}
                        </h4>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                            user.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-red-50 text-red-600 border-red-100'
                          }`}
                        >
                          {user.isActive ? 'نشط' : 'موقوف'}
                        </span>
                        {user.id === dbUser?.id && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                            أنت
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">{user.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 justify-between sm:justify-end">
                    {canManageUsers && roles.length > 0 ? (
                      <div className="relative">
                        <select
                          value={user.roleId || ''}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={updatingUserId === user.id || user.id === dbUser?.id}
                          className="appearance-none bg-white border border-slate-200 hover:border-indigo-400 text-slate-800 text-xs font-bold py-1.5 pl-8 pr-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 transition cursor-pointer shadow-sm"
                        >
                          {!user.roleId && <option value="">اختر الدور...</option>}
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    ) : (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          roleLabels[user.role]?.color || 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {roleLabels[user.role]?.label || user.role}
                      </span>
                    )}

                    {canManageUsers && user.id !== dbUser?.id && (
                      <button
                        onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                        disabled={updatingUserId === user.id}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition disabled:opacity-50 ${
                          user.isActive
                            ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {updatingUserId === user.id ? '...' : user.isActive ? 'إيقاف' : 'تفعيل'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Roles Reference */}
        {roles.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <Settings className="h-5 w-5 text-indigo-600" />
              <span>الأدوار والصلاحيات المتاحة في النظام</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {roles.map((role) => (
                <div key={role.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-4 w-4 text-indigo-500" />
                    <span className="font-bold text-slate-800 text-xs">{role.name}</span>
                  </div>
                  {role.description && (
                    <p className="text-[10px] text-slate-500 leading-relaxed">{role.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 border border-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center">
                  <UserCog className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">إنشاء موظف جديد</h3>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setNameInput(''); setEmailInput(''); setPasswordInput(''); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">الاسم الكامل *</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="مثال: أحمد محمد"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">البريد الإلكتروني *</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="example@company.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">كلمة المرور * (6 أحرف على الأقل)</label>
                <div className="relative">
                  <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full pr-10 pl-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">الدور الوظيفي والصلاحيات *</label>
                {roles.length > 0 ? (
                  <div className="relative">
                    <select
                      value={roleIdInput}
                      onChange={(e) => setRoleIdInput(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} {r.description ? `— ${r.description}` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    لم يتم تحميل الأدوار. يرجى المحاولة مرة أخرى.
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-60"
                >
                  {submitting ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <UserCog className="h-4 w-4" />
                  )}
                  {submitting ? 'جاري الإنشاء...' : 'إنشاء الحساب وتفعيله مباشرة'}
                </button>
              </div>

              <p className="text-[10px] text-slate-400 text-center">
                سيتم تفعيل الحساب وتوليد كود البصمة تلقائياً ويمكن للموظف تسجيل الدخول مباشرة.
              </p>
            </form>
          </div>
        </div>
      )}
    </SidebarLayout>
    </PermissionGuard>
  );
}
