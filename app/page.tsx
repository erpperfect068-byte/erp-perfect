'use client';

import React, { useEffect, useState } from 'react';
import SidebarLayout from '../components/SidebarLayout';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import {
  Users,
  Ship,
  Wallet,
  PiggyBank,
  PlusCircle,
  FileSpreadsheet,
  ArrowRightLeft,
  Activity,
  ChevronLeft,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  clientsCount: number;
  shipmentsCount: number;
  treasury: Record<string, number>;
  deposits: Record<string, number>;
}

export default function DashboardPage() {
  const { dbUser, getAuthToken } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const token = await getAuthToken();
        const res = await fetch('/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [getAuthToken]);

  const cards = [
    {
      title: 'إجمالي العملاء المسجلين',
      value: stats?.clientsCount ?? 0,
      subtext: 'عملاء نشطين باتفاقيات تسعير',
      icon: Users,
      color: 'bg-indigo-600',
      textColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-100',
      link: '/clients'
    },
    {
      title: 'إجمالي الشحنات والمشاريع',
      value: stats?.shipmentsCount ?? 0,
      subtext: 'شحنات نشطة تحت التخليص',
      icon: Ship,
      color: 'bg-emerald-600',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
      link: '/shipments'
    }
  ];

  const quickLinks = [
    { name: 'إضافة عميل جديد', desc: 'إدخال بيانات عميل جديد واتفاقيات تسعير خدماته المخصصة', path: '/clients', color: 'border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50/10' },
    { name: 'إنشاء ملف شحنة جمركية', desc: 'تسجيل بوليصة شحنة جديدة وتفاصيل مصلحة الجمارك ورقم الـ ACID', path: '/shipments', color: 'border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50/10' },
    { name: 'تسجيل أمانة/وديعة عميل', desc: 'استلام وديعة مالية للجمارك من عميل وربطها بكشوف الحساب', path: '/deposits', color: 'border-amber-100 hover:border-amber-300 hover:bg-amber-50/10' },
    { name: 'معاملة خزينة جديدة', desc: 'تسجيل إيداع أو سحب نقدي مباشر في خزينة المكتب الموحدة', path: '/treasury', color: 'border-purple-100 hover:border-purple-300 hover:bg-purple-50/10' }
  ];

  return (
    <SidebarLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-l from-slate-900 to-indigo-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl shadow-slate-900/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#4f46e5,transparent_60%)] opacity-20"></div>
          <div className="relative z-10 space-y-2">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/20 px-3 py-1 rounded-full text-xs font-semibold">
              نظام التخليص الجمركي الذكي
            </span>
            <h1 className="text-2xl sm:text-3xl font-black">أهلاً بك يا {dbUser?.name} 👋</h1>
            <p className="text-slate-300 text-sm max-w-xl font-light">
              هذه هي لوحة التحكم والعمليات الموحدة لمكتب التخليص الجمركي. تابع المعاملات المالية والمستندات بمرونة كاملة وحسب صلاحياتك الممنوحة.
            </p>
          </div>
          <div className="relative z-10 shrink-0">
            <div className="text-xs text-right text-indigo-200">الفرع الرئيسي:</div>
            <div className="text-lg font-bold bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 mt-1">
              مكتب جمهورية مصر العربية 🇪🇬
            </div>
          </div>
        </div>

        {stats?.shipmentsCount === 0 && stats?.clientsCount === 0 ? (
          <div className="bg-emerald-500/10 border border-emerald-200 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  النظام الآن في الوضع الحي (Live Mode) وجاهز بنسبة 100%
                </h3>
                <p className="text-xs text-slate-600 font-light mt-0.5">
                  النظام نظيف تماماً ومفرغ من أي بيانات وهمية. ابدأ الآن بإضافة أول عميل لمكتبك أو أول شحنة جمركية.
                </p>
              </div>
            </div>
            <Link
              href="/settings?tab=demo"
              className="text-xs text-slate-500 hover:text-indigo-600 underline font-medium shrink-0"
            >
              إعادة تعبئة بيانات تجريبية للتجربة
            </Link>
          </div>
        ) : null}

        {/* Counts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-6 bg-white border ${card.borderColor} rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 block">{card.title}</span>
                  {loading ? (
                    <div className="h-8 w-16 bg-slate-100 animate-pulse rounded-lg mt-1"></div>
                  ) : (
                    <span className="text-3xl font-black text-slate-900 block mt-1">{card.value}</span>
                  )}
                </div>
                <div className={`h-12 w-12 rounded-xl ${card.bgColor} ${card.textColor} flex items-center justify-center`}>
                  <card.icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-xs font-medium">
                <span className="text-slate-400">{card.subtext}</span>
                <Link href={card.link} className={`flex items-center gap-1 ${card.textColor} hover:underline`}>
                  استعراض التفاصيل <ChevronLeft className="h-3 w-3" />
                </Link>
              </div>
            </motion.div>
          ))}

          {/* Treasury Balances Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between lg:col-span-1"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">رصيد خزينة المكتب المتاح</span>
                <div className="space-y-1.5 mt-2">
                  {loading ? (
                    <div className="space-y-1.5 w-24">
                      <div className="h-4 bg-slate-100 animate-pulse rounded"></div>
                      <div className="h-4 bg-slate-100 animate-pulse rounded"></div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between gap-4 text-sm font-black text-slate-800">
                        <span>{stats?.treasury?.EGP?.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) || '0.00'}</span>
                        <span className="text-xs text-slate-400 font-medium">جنيه مصري</span>
                      </div>
                      <div className="flex justify-between gap-4 text-sm font-black text-indigo-600">
                        <span>${stats?.treasury?.USD?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</span>
                        <span className="text-xs text-slate-400 font-medium">دولار أمريكي</span>
                      </div>
                      <div className="flex justify-between gap-4 text-sm font-black text-emerald-600">
                        <span>€{stats?.treasury?.EUR?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</span>
                        <span className="text-xs text-slate-400 font-medium">يورو</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Wallet className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs font-medium">
              <span className="text-slate-400">السيولة النقدية والبنكية</span>
              <Link href="/treasury" className="text-purple-600 hover:underline flex items-center gap-1">
                الدفتر اليومي <ChevronLeft className="h-3 w-3" />
              </Link>
            </div>
          </motion.div>

          {/* Client Custody Deposits Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between lg:col-span-1"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">إجمالي أمانات العملاء والودائع</span>
                <div className="space-y-1.5 mt-2">
                  {loading ? (
                    <div className="space-y-1.5 w-24">
                      <div className="h-4 bg-slate-100 animate-pulse rounded"></div>
                      <div className="h-4 bg-slate-100 animate-pulse rounded"></div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between gap-4 text-sm font-black text-slate-800">
                        <span>{stats?.deposits?.EGP?.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) || '0.00'}</span>
                        <span className="text-xs text-slate-400 font-medium">جنيه مصري</span>
                      </div>
                      <div className="flex justify-between gap-4 text-sm font-black text-indigo-600">
                        <span>${stats?.deposits?.USD?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</span>
                        <span className="text-xs text-slate-400 font-medium">دولار أمريكي</span>
                      </div>
                      <div className="flex justify-between gap-4 text-sm font-black text-emerald-600">
                        <span>€{stats?.deposits?.EUR?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</span>
                        <span className="text-xs text-slate-400 font-medium">يورو</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <PiggyBank className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs font-medium">
              <span className="text-slate-400">إجمالي الودائع تحت تصرف الجمرك</span>
              <Link href="/deposits" className="text-amber-600 hover:underline flex items-center gap-1">
                صرف وحفظ الأمانات <ChevronLeft className="h-3 w-3" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Quick Operations panel */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <Activity className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900">اختصارات العمليات السريعة</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {quickLinks.map((link, idx) => (
              <Link
                key={idx}
                href={link.path}
                className={`p-5 rounded-2xl border text-right transition-all duration-200 hover:shadow-md flex flex-col justify-between group h-40 ${link.color}`}
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {link.name}
                  </h4>
                  <p className="text-xs text-slate-400 font-light leading-relaxed mt-2">
                    {link.desc}
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-500 group-hover:translate-x-[-4px] transition-transform flex items-center gap-1 mt-4">
                  ابدأ العملية الآن <ChevronLeft className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Additional information on exchange rate standard */}
        <div className="p-5 rounded-2xl bg-indigo-50/40 border border-indigo-100 flex items-start gap-4">
          <PlusCircle className="h-6 w-6 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-indigo-900">تعليمات المعاملات المالية الموحدة</h4>
            <p className="text-xs text-indigo-800 leading-relaxed font-light">
              يتم تسجيل جميع الأرصدة والمعاملات بعملتها الأصلية دون خلط أو جمع بين العملات. يتم حساب رصيد كل عميل حسب كل عملة على حدة لتفادي فروق أسعار الصرف غير المدرجة محاسبياً. تذكر استخدام بنود التعديل والعكس والبنود المحاسبية للتسويات بدلاً من تعديل القيم المسجلة مباشرة لتوفير سجل تدقيق متكامل.
            </p>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
