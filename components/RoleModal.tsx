'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Shield, Layers, AlertCircle, Save } from 'lucide-react';

export interface PermissionItem {
  id: string;
  code: string;
  module: string;
  labelAr: string;
  descriptionAr?: string;
}

export interface PermissionGroup {
  module: string;
  moduleLabel: string;
  permissions: PermissionItem[];
}

export interface RoleData {
  id?: string;
  name: string;
  description?: string | null;
  isSystem?: boolean;
  permissionCodes: string[];
}

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (roleData: { name: string; description: string; permissionCodes: string[] }) => Promise<void>;
  roleToEdit?: RoleData | null;
  groups: PermissionGroup[];
  loading?: boolean;
}

export default function RoleModal({
  isOpen,
  onClose,
  onSave,
  roleToEdit,
  groups,
  loading = false,
}: RoleModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (roleToEdit) {
      setName(roleToEdit.name || '');
      setDescription(roleToEdit.description || '');
      setSelectedCodes(roleToEdit.permissionCodes || []);
    } else {
      setName('');
      setDescription('');
      setSelectedCodes([]);
    }
    setError(null);
  }, [roleToEdit, isOpen]);

  if (!isOpen) return null;

  const togglePermission = (code: string) => {
    if (selectedCodes.includes(code)) {
      setSelectedCodes(selectedCodes.filter((c) => c !== code));
    } else {
      setSelectedCodes([...selectedCodes, code]);
    }
  };

  const toggleGroup = (groupPerms: PermissionItem[]) => {
    const groupCodes = groupPerms.map((p) => p.code);
    const allSelected = groupCodes.every((c) => selectedCodes.includes(c));

    if (allSelected) {
      setSelectedCodes(selectedCodes.filter((c) => !groupCodes.includes(c)));
    } else {
      const newSelected = new Set([...selectedCodes, ...groupCodes]);
      setSelectedCodes(Array.from(newSelected));
    }
  };

  const selectAll = () => {
    const allCodes = groups.flatMap((g) => g.permissions.map((p) => p.code));
    setSelectedCodes(allCodes);
  };

  const deselectAll = () => {
    setSelectedCodes([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى إدخال اسم الدور الوظيفي');
      return;
    }

    try {
      setError(null);
      await onSave({
        name: name.trim(),
        description: description.trim(),
        permissionCodes: selectedCodes,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ الدور');
    }
  };

  const isEditing = !!roleToEdit;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-100 shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {isEditing ? `تعديل الدور: ${roleToEdit.name}` : 'إضافة دور وظيفي جديد'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تحديد الصلاحيات الممنوحة لهذا الدور عبر أقسام النظام المختلفة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Basic Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                اسم الدور الوظيفي <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="مثال: محاسب رئيسي، مشرف ميناء..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={roleToEdit?.isSystem}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-70 disabled:bg-slate-100"
              />
              {roleToEdit?.isSystem && (
                <span className="text-[11px] text-amber-600">اسم أدوار النظام الأساسية ثابت لا يمكن تغييره</span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">وصف الدور والمسؤوليات</label>
              <input
                type="text"
                placeholder="وصف مختصر للمهام المنوطة بهذا الدور"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Permissions Selection Header */}
          <div className="border-t border-slate-100 pt-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-sm">صلاحيات النظام المقترنة بالدور</h4>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                  {selectedCodes.length} محددة
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                >
                  تحديد الكل
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition"
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>

            {/* Modules List */}
            <div className="space-y-4">
              {groups.map((group) => {
                const groupCodes = group.permissions.map((p) => p.code);
                const allSelected = groupCodes.every((c) => selectedCodes.includes(c));
                const someSelected = groupCodes.some((c) => selectedCodes.includes(c));

                return (
                  <div
                    key={group.module}
                    className="border border-slate-200 rounded-2xl p-4 bg-slate-50/40 hover:bg-slate-50/80 transition"
                  >
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-xs">{group.moduleLabel}</span>
                        <span className="text-[11px] text-slate-400">({group.permissions.length} صلاحيات)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.permissions)}
                        className={`text-xs px-2.5 py-0.5 rounded-lg border font-medium transition ${
                          allSelected
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : someSelected
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {allSelected ? 'إلغاء الموديول' : 'تحديد الموديول بالكامل'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {group.permissions.map((perm) => {
                        const isChecked = selectedCodes.includes(perm.code);
                        return (
                          <label
                            key={perm.code}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition ${
                              isChecked
                                ? 'bg-indigo-50/50 border-indigo-200 text-slate-900'
                                : 'bg-white border-slate-200/80 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(perm.code)}
                              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-semibold block leading-tight">{perm.labelAr}</span>
                              <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate">
                                {perm.code}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-200 flex items-center gap-2 transition disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'جاري الحفظ...' : isEditing ? 'حفظ التعديلات' : 'إنشاء الدور'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
