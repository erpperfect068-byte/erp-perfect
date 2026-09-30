'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { useRouter } from 'next/navigation';
import {
  Anchor,
  Compass,
  Briefcase,
  Layers,
  Plus,
  Shield,
  Loader2,
} from 'lucide-react';
import SidebarLayout from '../../components/SidebarLayout';
import Link from 'next/link';

interface SettingItem {
  id: string;
  name: string;
  color?: string;
}

export default function SettingsPage() {
  const { getAuthToken } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ports' | 'agencies' | 'contractors' | 'statuses'>('ports');
  const [loading, setLoading] = useState(true);

  // States for lists
  const [ports, setPorts] = useState<SettingItem[]>([]);
  const [agencies, setAgencies] = useState<SettingItem[]>([]);
  const [contractors, setContractors] = useState<SettingItem[]>([]);
  const [statuses, setStatuses] = useState<SettingItem[]>([]);

  // Form states
  const [nameInput, setNameInput] = useState('');
  const [colorInput, setColorInput] = useState('#4f46e5');
  const [isActionLoading, setIsActionLoading] = useState(false);

  async function loadSettings() {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPorts(data.ports || []);
        setAgencies(data.agencies || []);
        setContractors(data.contractors || []);
        setStatuses(data.statuses || []);
      } else {
        showToast('فشل تحميل الإعدادات المخصصة', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('خطأ بالخادم عند جلب الإعدادات', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  const handleAddSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    setIsActionLoading(true);
    try {
      const token = await getAuthToken();
      const typeMap: Record<string, string> = {
        ports: 'port',
        agencies: 'agency',
        contractors: 'contractor',
        statuses: 'status',
      };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: typeMap[activeTab],
          name: nameInput.trim(),
          color: activeTab === 'statuses' ? colorInput : undefined,
        }),
      });

      if (res.ok) {
        const newRecord = await res.json();
        showToast('تمت إضافة السجل بنجاح', 'success');
        setNameInput('');

        if (activeTab === 'ports') setPorts((prev) => [...prev, newRecord]);
        if (activeTab === 'agencies') setAgencies((prev) => [...prev, newRecord]);
        if (activeTab === 'contractors') setContractors((prev) => [...prev, newRecord]);
        if (activeTab === 'statuses') setStatuses((prev) => [...prev, newRecord]);
      } else {
        const err = await res.json();
        showToast(err.error || 'فشل إضافة السجل', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const tabs = [
    { id: 'ports', label: 'الموانئ والمنافذ', icon: Anchor },
    { id: 'agencies', label: 'الخطوط الملاحية والتوكيلات', icon: Compass },
    { id: 'contractors', label: 'المقاولين ومزودي الخدمة', icon: Briefcase },
    { id: 'statuses', label: 'حالات التخليص', icon: Layers },
  ] as const;

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">إعدادات التشغيل العامة</h1>
            <p className="text-sm text-slate-500 font-light mt-1">
              خصص محددات النظام من الموانئ والتوكيلات والمقاولين وحالات التخليص الجمركي.
            </p>
          </div>
          <Link
            href="/settings/roles"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition shadow-sm shrink-0"
          >
            <Shield className="w-4 h-4" />
            <span>إدارة الأدوار والصلاحيات</span>
          </Link>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setNameInput('');
                }}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <tab.icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form and list section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Add form */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 h-fit">
            <h3 className="text-base font-bold text-slate-900">
              إضافة {tabs.find((t) => t.id === activeTab)?.label.slice(0, -1) || 'عنصر جديد'}
            </h3>
            <form onSubmit={handleAddSetting} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="أدخل الاسم..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              {activeTab === 'statuses' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">لون التمييز</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={colorInput}
                      onChange={(e) => setColorInput(e.target.value)}
                      className="h-10 w-16 p-1 rounded-xl border border-slate-200 cursor-pointer"
                    />
                    <span className="text-xs text-slate-500 font-mono">{colorInput}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isActionLoading || !nameInput.trim()}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span>إضافة السجل</span>
              </button>
            </form>
          </div>

          {/* List display */}
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              قائمة {tabs.find((t) => t.id === activeTab)?.label} المسجلة
            </h3>

            {loading ? (
              <div className="py-12 text-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <span className="text-xs">جاري تحميل السجلات...</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {(activeTab === 'ports' ? ports :
                  activeTab === 'agencies' ? agencies :
                  activeTab === 'contractors' ? contractors : statuses).map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {item.color && (
                        <span className="h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      )}
                      <span className="text-sm font-semibold text-slate-800">{item.name}</span>
                    </div>
                  </div>
                ))}
                {(activeTab === 'ports' ? ports :
                  activeTab === 'agencies' ? agencies :
                  activeTab === 'contractors' ? contractors : statuses).length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400">لا توجد سجلات مضافة حتى الآن</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
