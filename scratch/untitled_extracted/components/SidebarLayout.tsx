'use client';

import React, { useState } from 'react';
import { useAuth, DEMO_ACCOUNTS, DemoRole } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Ship,
  FileText,
  PiggyBank,
  Wallet,
  Settings,
  UserCheck,
  ShieldAlert,
  Shield,
  LogOut,
  Menu,
  X,
  User,
  Globe,
  Sparkles,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const { dbUser, logout, loading, isDemoMode, demoRole, loginAsDemo, resetDemoData, hasPermission } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);
  const pathname = usePathname();

  const handleResetData = async () => {
    setSeeding(true);
    setSeedNotice(null);
    try {
      const ok = await resetDemoData();
      if (ok) {
        setSeedNotice('تم تحديث وتوليد البيانات التجريبية بنجاح!');
        setTimeout(() => {
          setSeedNotice(null);
          window.location.reload();
        }, 1200);
      }
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium">جاري تحميل النظام...</p>
        </div>
      </div>
    );
  }

  if (!dbUser) {
    return null; // AuthContext handles redirect to /login
  }

  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: 'مدير النظام', color: 'bg-red-50 text-red-700 border-red-200' },
    accountant: { label: 'محاسب مالي', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    clearance_officer: { label: 'مخلص جمركي', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    data_entry: { label: 'مدخل بيانات', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  };

  const menuItems = [
    { name: 'الرئيسية', icon: LayoutDashboard, path: '/' },
    { name: 'العملاء والأسعار', icon: Users, path: '/clients', roles: ['admin', 'accountant', 'data_entry'] },
    { name: 'متابعة الشحنات', icon: Ship, path: '/shipments' },
    { name: 'كشوف الحساب والفواتير', icon: FileText, path: '/statements', roles: ['admin', 'accountant'] },
    { name: 'الودائع والأمانات', icon: PiggyBank, path: '/deposits', roles: ['admin', 'accountant'] },
    { name: 'الخزينة والمعاملات', icon: Wallet, path: '/treasury', roles: ['admin', 'accountant'] },
    { name: 'إعدادات النظام', icon: Settings, path: '/settings', roles: ['admin'] },
    { name: 'الموظفين والدعوات', icon: UserCheck, path: '/users', roles: ['admin'] },
    { name: 'الأدوار والصلاحيات', icon: Shield, path: '/settings/roles', permission: 'roles.manage' },
    { name: 'سجل العمليات والتدقيق', icon: ShieldAlert, path: '/audit', roles: ['admin'] },
  ];

  const allowedMenuItems = menuItems.filter((item) => {
    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.roles && !item.roles.includes(dbUser.role) && dbUser.role !== 'admin') return false;
    return true;
  });

  const getPageTitle = () => {
    const item = menuItems.find((i) => i.path === pathname);
    return item ? item.name : 'لوحة التحكم';
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" dir="rtl">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-slate-900 text-slate-100 border-l border-slate-800">
        <div className="flex items-center justify-between h-16 px-6 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Globe className="h-6 w-6 text-indigo-400" />
            <span className="text-lg font-bold tracking-wider text-white">التخليص الجمركي الموحد</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          {allowedMenuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <item.icon
                  className={`ml-3 h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-2">
          {isDemoMode && (
            <div className="mb-1 flex items-center justify-between px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300">
              <span className="flex items-center gap-1 font-semibold">
                <Sparkles className="h-3 w-3 text-indigo-400" /> وضع تجريبي (Demo)
              </span>
              <button
                onClick={handleResetData}
                disabled={seeding}
                className="text-slate-400 hover:text-white"
                title="إعادة تعبئة البيانات التجريبية"
              >
                <RefreshCw className={`h-3 w-3 ${seeding ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-inner">
              {dbUser.name ? dbUser.name.charAt(0).toUpperCase() : <User />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{dbUser.name}</p>
              <p className="text-xs text-slate-400 truncate">{dbUser.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800">
            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${roleLabels[dbUser.role]?.color || 'bg-slate-100 text-slate-800'}`}>
              {roleLabels[dbUser.role]?.label || dbUser.role}
            </span>
            <button
              onClick={logout}
              className="text-slate-400 hover:text-red-400 p-1 rounded-lg hover:bg-slate-800 transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
          <div className="relative flex w-full max-w-xs flex-col bg-slate-900 text-slate-100 shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between h-16 px-6 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Globe className="h-6 w-6 text-indigo-400" />
                <span className="text-lg font-bold text-white">التخليص الجمركي</span>
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
              {allowedMenuItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <item.icon className={`ml-3 h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white">
                  {dbUser.name ? dbUser.name.charAt(0).toUpperCase() : <User />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{dbUser.name}</p>
                  <p className="text-xs text-slate-400 truncate">{dbUser.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800">
                <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${roleLabels[dbUser.role]?.color || 'bg-slate-100 text-slate-800'}`}>
                  {roleLabels[dbUser.role]?.label || dbUser.role}
                </span>
                <button
                  onClick={logout}
                  className="text-slate-400 hover:text-red-400 p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Pane */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Demo Bar for Instant Role Switching */}
        <div className="bg-slate-900 text-slate-200 text-xs px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
              <Sparkles className="h-3 w-3" /> نظام البيانات التجريبية
            </span>
            <span className="hidden sm:inline text-slate-400">بدّل الصلاحيات فوراً لتجربة النظام:</span>
          </div>

          <div className="flex items-center gap-1.5">
            {(['admin', 'accountant', 'clearance_officer', 'data_entry'] as DemoRole[]).map((r) => {
              const isCurrent = dbUser.role === r;
              const labels: Record<DemoRole, string> = {
                admin: 'مدير نظام',
                accountant: 'محاسب',
                clearance_officer: 'مخلص',
                data_entry: 'مدخل بيانات',
              };

              return (
                <button
                  key={r}
                  onClick={() => loginAsDemo(r)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {labels[r]}
                </button>
              );
            })}

            <div className="h-4 w-px bg-slate-700 mx-1"></div>

            <button
              onClick={handleResetData}
              disabled={seeding}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold transition-colors"
              title="إعادة تعبئة شحنات وعملاء وخزينة تجريبية"
            >
              <RefreshCw className={`h-3 w-3 ${seeding ? 'animate-spin' : ''}`} />
              <span>{seeding ? 'جاري التوليد...' : 'تعبئة بيانات'}</span>
            </button>
          </div>
        </div>

        {seedNotice && (
          <div className="bg-emerald-50 text-emerald-800 text-xs px-4 py-2 border-b border-emerald-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {seedNotice}
            </span>
          </div>
        )}

        {/* Top Header */}
        <header className="flex items-center justify-between h-14 px-6 bg-white border-b border-slate-200">
          <div className="flex items-center">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none md:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="hidden md:flex items-center space-x-1.5 space-x-reverse text-sm font-semibold text-slate-800">
              <span className="text-indigo-600 font-bold">نظام التخليص الجمركي</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-500 font-medium">{getPageTitle()}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Status Info */}
            <div className="hidden lg:flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                قاعدة البيانات متصلة وجاهزة
              </span>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

            {/* Profile Info */}
            <div className="flex items-center gap-3">
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-slate-900 text-right">{dbUser.name}</p>
                <p className="text-[10px] text-slate-400 font-medium text-right">{roleLabels[dbUser.role]?.label}</p>
              </div>
              <div className="h-8 w-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
                {dbUser.name ? dbUser.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Workspace */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
