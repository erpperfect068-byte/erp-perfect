'use client';

import React, { useEffect, useState } from 'react';
import SidebarLayout from '../../components/SidebarLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import {
  Anchor,
  Compass,
  Briefcase,
  Layers,
  Plus,
  Search,
  Settings,
  Trash2,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Database,
  ArrowLeft,
  X,
  ShieldCheck,
  Shield,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SettingItem {
  id: string;
  name: string;
  color?: string;
}

export default function SettingsPage() {
  const { getAuthToken, isDemoMode, exitDemoMode } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ports' | 'agencies' | 'contractors' | 'statuses' | 'demo'>('ports');
  const [loading, setLoading] = useState(true);

  // States for lists
  const [ports, setPorts] = useState<SettingItem[]>([]);
  const [agencies, setAgencies] = useState<SettingItem[]>([]);
  const [contractors, setContractors] = useState<SettingItem[]>([]);
  const [statuses, setStatuses] = useState<SettingItem[]>([]);

  // Form states
  const [nameInput, setNameInput] = useState('');
  const [colorInput, setColorInput] = useState('#4f46e5');

  // Demo management states
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Read URL query params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'demo') {
        setActiveTab('demo');
      }
    }
  }, []);

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
  }, [getAuthToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      showToast('الاسم مطلوب', 'warning');
      return;
    }

    try {
      const token = await getAuthToken();
      const type = {
        ports: 'port',
        agencies: 'agency',
        contractors: 'contractor',
        statuses: 'status',
        demo: ''
      }[activeTab];

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type,
          name: nameInput.trim(),
          color: activeTab === 'statuses' ? colorInput : undefined
        })
      });

      if (res.ok) {
        showToast('تم تسجيل البند الجديد بنجاح', 'success');
        setNameInput('');
        loadSettings();
      } else {
        const err = await res.json();
        showToast(err.error || 'فشل حفظ البند', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ بالخادم', 'error');
    }
  };

  // Reset demo data and start clean slate
  const handleResetDemoData = async () => {
    setIsActionLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/demo/reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        await exitDemoMode();
        showToast(data.message || 'تم تصفير النظام بنجاح والتحول إلى الوضع الحي! يمكنك الآن بدء إدخال بياناتك الحقيقية.', 'success');
        setIsResetConfirmOpen(false);
        loadSettings();
        // Redirect to dashboard to see fresh clean slate
        setTimeout(() => {
          router.push('/');
        }, 1200);
      } else {
        const err = await res.json();
        showToast(err.error || 'فشل تصفير البيانات', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Re-seed demo data
  const handleSeedDemoData = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch('/api/demo/seed', {
        method: 'POST'
      });

      if (res.ok) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('customs_auth_mode', 'demo');
        }
        showToast('تمت تعبئة وتحديث البيانات التجريبية بنجاح!', 'success');
        loadSettings();
        setTimeout(() => {
          router.push('/');
        }, 800);
      } else {
        showToast('فشل تعبئة البيانات التجريبية', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء تعبئة البيانات', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const getActiveList = () => {
    return {
      ports: ports,
      agencies: agencies,
      contractors: contractors,
      statuses: statuses,
      demo: []
    }[activeTab];
  };

  const tabs = [
    { id: 'ports', label: 'الموانئ والمنافذ', icon: Anchor },
    { id: 'agencies', label: 'الخطوط الملاحية والتوكيلات', icon: Compass },
    { id: 'contractors', label: 'المقاولين ومزودي الخدمة', icon: Briefcase },
    { id: 'statuses', label: 'حالات التخليص', icon: Layers },
    { id: 'demo', label: 'وضع الديمو والتشغيل الحي', icon: Sparkles }
  ] as const;

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">إعدادات التشغيل العامة</h1>
            <p className="text-sm text-slate-500 font-light mt-1">
              خصص محددات النظام من الموانئ والتوكيلات والمقاولين، أو تحكّم في وضع البيانات التجريبية والبدء ببياناتك الحقيقية.
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

        {/* Prominent Demo vs Live Status Controller Banner */}
        <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                isDemoMode ? 'bg-amber-500 text-white shadow-amber-500/30' : 'bg-emerald-500 text-white shadow-emerald-500/30'
              }`}
            >
              {isDemoMode ? <Sparkles className="h-6 w-6 animate-pulse" /> : <ShieldCheck className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black">
                  حالة النظام: {isDemoMode ? 'وضع الديمو (بيانات تجريبية نشطة)' : 'الوضع الحي (Live Mode - بيانات حقيقية)'}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    isDemoMode
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {isDemoMode ? '⚡ Demo Active' : '🟢 Live Ready'}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-light mt-1 max-w-xl leading-relaxed">
                {isDemoMode
                  ? 'النظام محمل حالياً ببيانات تجريبية كاملة (شحنات، كشوف حساب، أمانات وخزينة). عندما تنتهي من المعاينة وتريد البدء بإدخال بيانات مكتبك الحقيقية، اضغط الزر الأحمر لتفريغ السيستم.'
                  : 'النظام في الوضع الحي ونظيف وجاهز لإدخال أول عميل وشحنة. يمكنك في أي وقت تعبئة بيانات تجريبية للتجربة أو التدريب.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto shrink-0">
            {isDemoMode ? (
              <button
                onClick={() => setIsResetConfirmOpen(true)}
                disabled={isActionLoading}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>الخروج من وضع الديمو وتفريغ السيستم (Go Live)</span>
              </button>
            ) : (
              <button
                onClick={handleSeedDemoData}
                disabled={isActionLoading}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isActionLoading ? 'animate-spin' : ''}`} />
                <span>تعبئة بيانات تجريبية (Demo Data)</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isDemoTab = tab.id === 'demo';
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setNameInput('');
                }}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                  isActive
                    ? isDemoTab
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                    : isDemoTab
                      ? 'text-amber-700 hover:bg-amber-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <tab.icon className={`h-4 w-4 ${isActive ? 'text-white' : isDemoTab ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content: Demo & Clean Slate Panel */}
        {activeTab === 'demo' ? (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 rounded-3xl p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900">التحكم في وضع الديمو وتصفير السيستم</h3>
                  <p className="text-sm text-slate-600 leading-relaxed max-w-2xl font-light">
                    يتيح لك هذا القسم اختبار جميع شاشات النظام بكافة العمليات (بوالص الشحن، كشوف الحسابات، الأمانات والخزينة) باستخدام بيانات تجريبية جاهزة، ثم <span className="font-bold text-slate-900">مسحها بنقرة واحدة</span> لتفريغ النظام تماماً وبدء إدخال بيانات مكتبك الحقيقية.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Clean Slate Card */}
              <div className="bg-white border-2 border-red-100 hover:border-red-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">مسح البيانات التجريبية والبدء ببيانات حقيقية (Go Live)</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-light">
                    يقوم هذا الزر بحذف جميع الشحنات الوهمية، كشوف الحسابات، سندات الأمانات، حركات الخزينة وقائمة العملاء التجريبيين. ويبقى النظام فارغاً وجاهزاً بنسبة 100% لإدخال أول عميل وأول شحنة حقيقية لمكتبك.
                  </p>
                </div>

                <button
                  onClick={() => setIsResetConfirmOpen(true)}
                  disabled={isActionLoading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>مسح كافة الـ Dummy Data والبدء لايف</span>
                </button>
              </div>

              {/* Re-seed Demo Data Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">إعادة تعبئة البيانات التجريبية (Re-seed Demo Data)</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-light">
                    إذا أردت في أي وقت تجربة ميزة جديدة أو تدريب أحد الموظفين، يمكنك الضغط هنا لإعادة ملء النظام بنماذج واقعية للشحنات والفواتير والأمانات.
                  </p>
                </div>

                <button
                  onClick={handleSeedDemoData}
                  disabled={isActionLoading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isActionLoading ? 'animate-spin' : ''}`} />
                  <span>إعادة تعبئة بيانات الديمو</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
            {/* New Item Form Panel */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-fit space-y-4">
              <h3 className="text-sm font-bold text-slate-900">إضافة عنصر جديد للقائمة</h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">الاسم أو البيان *</label>
                  <input
                    type="text"
                    required
                    placeholder={`مثال: ${
                      activeTab === 'ports'
                        ? 'ميناء سفاجا البحري'
                        : activeTab === 'agencies'
                        ? 'توكيل إيفرجرين مصر'
                        : activeTab === 'contractors'
                        ? 'شركة الأمل لسيارات النقل'
                        : 'جاهز للاستلام والتعتيق'
                    }`}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {activeTab === 'statuses' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">لون العلامة التعريفية</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={colorInput}
                        onChange={(e) => setColorInput(e.target.value)}
                        className="h-10 w-16 p-0 border border-slate-200 rounded-xl cursor-pointer bg-white"
                      />
                      <span className="text-xs font-mono text-slate-500 uppercase">{colorInput}</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="h-4 w-4" />
                  <span>حفظ البند في النظام</span>
                </button>
              </form>
            </div>

            {/* List Display Panel */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  العناصر المسجلة ({getActiveList().length})
                </h3>
                <span className="text-xs text-slate-400 font-light">تظهر هذه الخيارات في القوائم المنسدلة للشحنات</span>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mx-auto"></div>
                  <p className="text-xs text-slate-400 mt-2">جاري جلب القوائم...</p>
                </div>
              ) : getActiveList().length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl">
                  <p className="text-xs text-slate-400">لا توجد بنود مسجلة بعد. أضف أول بند من النموذج الجانبي.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {getActiveList().map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 hover:bg-slate-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {activeTab === 'statuses' && item.color && (
                          <span
                            className="h-3.5 w-3.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: item.color }}
                          ></span>
                        )}
                        <span className="text-sm font-semibold text-slate-800 truncate">{item.name}</span>
                      </div>

                      {activeTab === 'statuses' && item.color && (
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0"
                          style={{
                            backgroundColor: `${item.color}10`,
                            borderColor: `${item.color}30`,
                            color: item.color
                          }}
                        >
                          معاينة التذكرة
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Clean Slate Confirmation Modal */}
        {isResetConfirmOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-6 w-6" />
                  <h3 className="text-lg font-bold text-slate-900">تأكيد مسح البيانات التجريبية</h3>
                </div>
                <button
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="py-4 space-y-3">
                <p className="text-sm text-slate-700 leading-relaxed font-medium">
                  هل أنت متأكد من رغبتك في إفراغ النظام من جميع بيانات الديمو التجريبية؟
                </p>
                <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 space-y-1">
                  <p className="font-bold">سيتم مسح الآتي:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-600">
                    <li>كافة الشحنات وبوالص التخليص المسجلة</li>
                    <li>جميع فواتير وكشوف الحساب وحركاتها</li>
                    <li>أمانات وودائع العملاء في الخزينة</li>
                    <li>حسابات العملاء وأصناف بضائعهم التجريبية</li>
                  </ul>
                </div>
                <p className="text-xs text-slate-500 font-light">
                  ستظل الموانئ والتوكيلات الملاحية وحالات التخليص محفوظة لتسهيل الاستخدام الفوري.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(false)}
                  disabled={isActionLoading}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={handleResetDemoData}
                  disabled={isActionLoading}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg shadow-red-600/20 flex items-center gap-1.5"
                >
                  {isActionLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>نعم، أفرغ السيستم وابدأ لايف</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
