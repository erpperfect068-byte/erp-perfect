'use client';

import React, { useEffect, useState } from 'react';
import { useAuth, DEMO_ACCOUNTS, DemoRole } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Globe, CheckCircle2, Sparkles, UserCheck, Shield, Calculator, Ship, FileEdit, RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const { dbUser, loginWithGoogle, loginAsDemo, resetDemoData, loading, error } = useAuth();
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (dbUser) {
      router.push('/');
    }
  }, [dbUser, router]);

  const handleSeedData = async () => {
    setSeeding(true);
    setSeedSuccess(null);
    try {
      const ok = await resetDemoData();
      if (ok) {
        setSeedSuccess('تم بنجاح توليد وتهيئة بيانات التخليص الجمركي التجريبية بالكامل!');
      } else {
        setSeedSuccess('فشل توليد البيانات، يرجى المحاولة لاحقاً');
      }
    } finally {
      setSeeding(false);
    }
  };

  const roleIcons: Record<DemoRole, any> = {
    admin: Shield,
    accountant: Calculator,
    clearance_officer: Ship,
    data_entry: FileEdit,
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-900" dir="rtl">
      {/* Brand Side (Visible on larger screens) */}
      <div className="hidden md:flex md:w-1/2 bg-slate-950 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#312e81,transparent_70%)] opacity-40"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(2,6,23,0.8))]"></div>

        {/* Top Logo */}
        <div className="flex items-center gap-3 z-10">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-wide">مكتب التخليص الجمركي الموحد</span>
        </div>

        {/* Hero Copy */}
        <div className="my-auto z-10 max-w-lg">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              نسخة المكتب المالي المحاسبي
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> نظام البيانات التجريبية مفعّل
            </span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight mt-6">
            النظام المتكامل لإدارة <span className="text-indigo-400">التخليص الجمركي</span> والمحاسبة المالية
          </h1>
          <p className="text-slate-400 text-lg mt-4 leading-relaxed font-light">
            منصة مخصصة لتتبع دورة الشحنة الكاملة، تسوية كشوف الحساب، إدارة أمانات وودائع العملاء بدقة محاسبية متناهية وخوارزميات تدقيق تفصيلية.
          </p>

          <div className="grid grid-cols-2 gap-6 mt-10 border-t border-slate-800/60 pt-8">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white">متعدد العملات بالكامل</h4>
                <p className="text-xs text-slate-400 mt-1">USD, EUR, EGP بحسابات منفصلة</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white">سجل تدقيق كامل</h4>
                <p className="text-xs text-slate-400 mt-1">تتبع دقيق لكل حركة وتعديل</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footnote */}
        <p className="text-xs text-slate-500 z-10">
          &copy; ٢٠٢٦ مكتب التخليص الجمركي الموحد. جميع الحقوق محفوظة.
        </p>
      </div>

      {/* Login & Demo System Card Side */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-slate-900 overflow-y-auto">
        <div className="w-full max-w-lg bg-slate-950/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="text-center">
            {/* Mobile Logo Display */}
            <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto md:hidden shadow-lg shadow-indigo-600/20">
              <Globe className="h-6 w-6 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-white mt-4">تسجيل الدخول للنظام</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              اختر الدخول السريع بأحد الأدوار التجريبية، أو سجل الدخول بحساب عمل Google
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3 text-sm">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                {error.includes('user_banned') || error.toLowerCase().includes('banned')
                  ? 'تم إيقاف هذا الحساب، يرجى التواصل مع مدير النظام.'
                  : error}
              </div>
            </div>
          )}

          {seedSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start gap-3 text-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
              <div>{seedSuccess}</div>
            </div>
          )}

          {/* Quick Demo Access System */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> نظام الدخول التجريبي السريع (Dummy Accounts)
              </span>
              <button
                onClick={handleSeedData}
                disabled={seeding}
                className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 transition-colors underline"
                title="إعادة ملء قاعدة البيانات بكامل الشحنات والعملاء والقيود التجريبية"
              >
                <RefreshCw className={`h-3 w-3 ${seeding ? 'animate-spin' : ''}`} />
                {seeding ? 'جاري التهيئة...' : 'توليد بيانات تجريبية'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.keys(DEMO_ACCOUNTS) as DemoRole[]).map((roleKey) => {
                const acc = DEMO_ACCOUNTS[roleKey];
                const IconComponent = roleIcons[roleKey] || UserCheck;

                return (
                  <button
                    key={roleKey}
                    onClick={() => loginAsDemo(roleKey)}
                    disabled={loading}
                    className="flex flex-col text-right p-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/50 transition-all duration-200 group relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {acc.name.split('(')[0].trim()}
                      </span>
                      <div className="h-6 w-6 rounded-lg bg-slate-800 group-hover:bg-indigo-600/30 flex items-center justify-center text-slate-300 group-hover:text-indigo-300 transition-colors">
                        <IconComponent className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-400 mt-1">
                      {roleKey === 'admin' && 'مدير النظام (Admin)'}
                      {roleKey === 'accountant' && 'محاسب مالي (Accountant)'}
                      {roleKey === 'clearance_officer' && 'مخلص جمركي (Clearance)'}
                      {roleKey === 'data_entry' && 'مدخل بيانات (Data Entry)'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 line-clamp-1 font-light">
                      {acc.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-950 px-3 text-slate-500">أو عبر حساب Google الحقيقي</span>
            </div>
          </div>

          {/* Google Login Button */}
          <div>
            <button
              onClick={loginWithGoogle}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-900 font-bold transition-all duration-200 flex items-center justify-center gap-3 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 text-xs sm:text-sm"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
              ) : (
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              <span>تسجيل الدخول باستخدام Google</span>
            </button>
          </div>

          {/* Privacy Disclaimer */}
          <div className="text-center pt-2">
            <span className="text-[11px] text-slate-500 block">
              نظام إدارة التخليص الجمركي والمحاسبة المالية - إصدار المعاينة والتدقيق
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
