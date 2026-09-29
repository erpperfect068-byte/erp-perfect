'use client';

import React, { useEffect, useState } from 'react';
import SidebarLayout from '../../components/SidebarLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import Link from 'next/link';
import {
  UserCheck,
  Plus,
  Mail,
  Shield,
  Briefcase,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  ShieldAlert,
  Settings,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react';

interface UserRecord {
  id: string;
  name: string | null;
  email: string;
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

interface InvitationRecord {
  id: string;
  email: string;
  role: string;
  status: string;
  invitedByEmail: string | null;
  invitedAt: string;
}

export default function UsersPage() {
  const { getAuthToken, dbUser, hasPermission } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Form states
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState('data_entry');
  const [roleIdInput, setRoleIdInput] = useState('');

  const canManageRoles = hasPermission('users.manage_roles') || hasPermission('roles.manage');
  const canInviteUsers = hasPermission('users.invite') || hasPermission('roles.manage');

  async function loadTeam() {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setInvitations(data.invitations || []);
        if (data.roles && data.roles.length > 0) {
          setRoles(data.roles);
          if (!roleIdInput) {
            setRoleIdInput(data.roles[0].id);
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
  }, [getAuthToken]);

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    setUpdatingUserId(userId);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          roleId: newRoleId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تحديث دور الموظف');
      }

      showToast('تم تحديث دور الموظف وصلاحياته بنجاح', 'success');
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, roleId: newRoleId, role: data.user.role } : u))
      );
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء تغيير الدور', 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentActive: boolean) => {
    setUpdatingUserId(userId);
    const action = currentActive ? 'suspend' : 'restore';
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/users/${userId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشلت عملية تغيير حالة الحساب');
      }

      showToast(data.message || 'تم تحديث حالة الحساب بنجاح', 'success');
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: !currentActive } : u))
      );
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء تغيير حالة الحساب', 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) {
      showToast('البريد الإلكتروني مطلوب لإرسال الدعوة', 'warning');
      return;
    }

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: emailInput.trim(),
          role: roleInput,
          roleId: roleIdInput || undefined,
        }),
      });

      if (res.ok) {
        showToast('تم تسجيل وإرسال دعوة الموظف بنجاح', 'success');
        setIsModalOpen(false);
        setEmailInput('');
        loadTeam();
      } else {
        const err = await res.json();
        showToast(err.error || 'فشل إرسال الدعوة', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ بالخادم', 'error');
    }
  };

  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: 'مدير النظام', color: 'bg-red-50 text-red-700 border-red-200' },
    accountant: { label: 'محاسب مالي', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    clearance_officer: { label: 'مخلص جمركي ميداني', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    data_entry: { label: 'مدخل بيانات شحنات', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">الموظفين وفريق العمل (Users & Roles)</h1>
            <p className="text-sm text-slate-500 font-light mt-1">
              إدارة حسابات الموظفين النشطين، تعيين الأدوار والصلاحيات، وإرسال دعوات الانضمام.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hasPermission('roles.manage') && (
              <Link
                href="/settings/roles"
                className="flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-indigo-600 font-bold py-2.5 px-4 rounded-xl shadow-sm transition text-xs"
              >
                <Shield className="h-4 w-4" />
                <span>إدارة الصلاحيات والأدوار</span>
              </Link>
            )}
            {canInviteUsers && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm shadow-indigo-200 transition text-xs shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>دعوة موظف جديد</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic split view */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Active staff */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-indigo-600" />
                <span>فريق العمل النشط حالياً</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                  {users.length}
                </span>
              </h3>
              {canManageRoles && (
                <span className="text-[11px] text-slate-400">يمكنك تعديل دور أي موظف مباشرة من القائمة</span>
              )}
            </div>

            {loading ? (
              <div className="h-32 bg-slate-50 animate-pulse rounded-xl"></div>
            ) : users.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">لا يوجد موظفون مسجلون حالياً.</p>
            ) : (
              <div className="space-y-3">
                {users.map((user) => {
                  const currentRoleId = user.roleId;

                  return (
                    <div
                      key={user.id}
                      className="p-4 bg-slate-50/60 border border-slate-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-200 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center font-bold shrink-0">
                          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{user.name || 'موظف مجهول المسمى'}</h4>
                            {user.isActive && (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2 py-0.2 text-[9px] font-bold">
                                نشط
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono block">{user.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 justify-between sm:justify-end">
                        {canManageRoles && roles.length > 0 ? (
                          <div className="relative">
                            <select
                              value={currentRoleId || ''}
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              disabled={updatingUserId === user.id}
                              className="appearance-none bg-white border border-slate-200 hover:border-indigo-400 text-slate-800 text-xs font-bold py-1.5 pl-8 pr-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 transition cursor-pointer shadow-sm"
                            >
                              {!currentRoleId && <option value="">اختر الدور الوظيفي...</option>}
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
                              roleLabels[user.role]?.color || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {roleLabels[user.role]?.label || user.role}
                          </span>
                        )}
                        {canManageRoles && user.id !== dbUser?.id && (
                          <button
                            onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                            disabled={updatingUserId === user.id}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition ${
                              user.isActive
                                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {user.isActive ? 'إيقاف الحساب' : 'إعادة التفعيل'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending invites */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              <span>دعوات الموظفين المعلقة</span>
            </h3>

            {loading ? (
              <div className="h-32 bg-slate-50 animate-pulse rounded-xl"></div>
            ) : invitations.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">لا توجد أي دعوات معلقة بانتظار تفعيل الموظف.</p>
            ) : (
              <div className="space-y-3">
                {invitations.map((invite) => (
                  <div key={invite.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-700 truncate">{invite.email}</span>
                      <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-bold px-1.5 py-0.5 rounded">
                        قيد الانتظار
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>الدور: {roleLabels[invite.role]?.label || invite.role}</span>
                      <span>تاريخ الدعوة: {new Date(invite.invitedAt).toLocaleDateString('ar-EG')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Invite User Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 border border-slate-100 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-lg font-bold text-slate-900">دعوة موظف جديد للانضمام</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">البريد الإلكتروني المهني *</label>
                  <input
                    type="email"
                    required
                    placeholder="example@your-office.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">الدور الوظيفي والصلاحيات الممنوحة *</label>
                  {roles.length > 0 ? (
                    <select
                      value={roleIdInput}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        setRoleIdInput(selectedId);
                        const match = roles.find((r) => r.id === selectedId);
                        if (match) {
                          if (match.name.includes('مدير') || match.name.includes('Admin')) setRoleInput('admin');
                          else if (match.name.includes('محاسب')) setRoleInput('accountant');
                          else if (match.name.includes('مخلص')) setRoleInput('clearance_officer');
                          else setRoleInput('data_entry');
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} {r.description ? `(${r.description})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={roleInput}
                      onChange={(e) => setRoleInput(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    >
                      <option value="data_entry">مدخل بيانات (تسجيل ومتابعة الشحنات)</option>
                      <option value="clearance_officer">مخلص جمركي (العمل الميداني والمنافذ)</option>
                      <option value="accountant">محاسب (كامل الصلاحيات المالية وكشوف الحساب)</option>
                      <option value="admin">مدير النظام (جميع الصلاحيات الإدارية والمالية)</option>
                    </select>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Mail className="h-4 w-4" />
                    إرسال الدعوة للموظف
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
