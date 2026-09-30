'use client';

import React, { useEffect, useState } from 'react';
import { useAuth, supabase } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Globe, CheckCircle2, Sparkles, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { QuickDevSwitch } from '@/components/QuickDevSwitch';

export default function LoginPage() {
  const { dbUser, loading: authLoading, error: authError } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (dbUser) {
      router.push('/');
    }
  }, [dbUser, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('يرجى إدخال البريد الإلكتروني وكلمة السر');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        console.error('Login error:', error);
        if (error.message?.toLowerCase().includes('banned') || error.code === 'user_banned') {
          throw new Error('تم إيقاف هذا الحساب، يرجى التواصل مع مدير النظام.');
        }
        if (error.message?.includes('Invalid login credentials')) {
          throw new Error('بيانات الدخول غير صحيحة (البريد الإلكتروني أو كلمة السر)');
        }
        throw new Error(error.message || 'فشل تسجيل الدخول');
      }

      if (data.session) {
        router.push('/');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-900" dir="rtl">
      {/* Brand Side */}
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
              منظومة ERP جمركية متكاملة
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> مفعّل مع Supabase Auth & RLS
            </span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight mt-6">
            النظام المتكامل لإدارة <span className="text-indigo-400">التخليص الجمركي</span> والمحاسبة المالية
          </h1>
          <p className="text-slate-400 text-lg mt-4 leading-relaxed font-light">
            منصة مخصصة لتتبع دورة الشحنة الكاملة، تسوية كشوف الحساب، إدارة أمانات العملاء وعهد الموظفين بدقة محاسبية تفصيلية.
          </p>

          <div className="grid grid-cols-2 gap-6 mt-10 border-t border-slate-800/60 pt-8">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white">حماية RLS صارمة</h4>
                <p className="text-xs text-slate-400 mt-1">تحقق مباشر من الصلاحيات بالداتابيز</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white">عهد ومصروفات الموظفين</h4>
                <p className="text-xs text-slate-400 mt-1">إداراة الخزينة والتسويات المالية</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footnote */}
        <p className="text-xs text-slate-500 z-10">
          &copy; ٢٠٢٦ مكتب التخليص الجمركي الموحد. جميع الحقوق محفوظة.
        </p>
      </div>

      {/* Login Card Side */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 bg-slate-900 overflow-y-auto">
        <div className="w-full max-w-md bg-slate-950/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="text-center">
            {/* Mobile Logo */}
            <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto md:hidden shadow-lg shadow-indigo-600/20">
              <Globe className="h-6 w-6 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-white mt-4">تسجيل الدخول للنظام</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              أدخل البريد الإلكتروني وكلمة السر المعتمدة للحساب
            </p>
          </div>

          {(errorMessage || authError) && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3 text-sm">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div>{errorMessage || authError}</div>
            </div>
          )}

          {/* Real Supabase Auth Form */}
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  dir="ltr"
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                كلمة السر
              </label>
              <div className="relative">
                <Lock className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  dir="ltr"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || authLoading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 text-sm disabled:opacity-50 mt-6"
            >
              {loading || authLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>تسجيل الدخول</span>
                </>
              )}
            </button>
          </form>

          {/* Optional Quick Dev Switch Panel (Renders ONLY if NEXT_PUBLIC_ENABLE_QUICK_SWITCH=true) */}
          <QuickDevSwitch />

          <div className="text-center pt-2">
            <span className="text-[11px] text-slate-500 block">
              نظام إدارة التخليص الجمركي والمحاسبة المالية - إصدار Supabase RLS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
