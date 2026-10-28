'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Ship,
  FileText,
  PiggyBank,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Globe,
  UserCog,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { QuickDevSwitch } from './QuickDevSwitch';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const { dbUser, logout, loading, hasPermission } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-xs font-semibold text-slate-500">جاري التحقق من الجلسة والصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (!dbUser) {
    return null;
  }

  const isAdmin = dbUser.role === 'admin';

  /**
   * Navigation items with permission-based visibility.
   *
   * Rules:
   *  - Admin sees ALL items unconditionally (isAdmin shortcircuits all checks).
   *  - Every other role sees an item if their permissions[] array includes any of the required permission codes.
   */
  const navigation = [
    {
      name: 'لوحة التحكم',
      href: '/',
      icon: LayoutDashboard,
      checkVisible: () => true,
    },
    {
      name: 'قائمة العملاء',
      href: '/clients',
      icon: Users,
      checkVisible: (has: (code: string) => boolean) => has('clients.view') || has('clients.create'),
    },
    {
      name: 'إدارة الشحنات والبوالص',
      href: '/shipments',
      icon: Ship,
      checkVisible: (has: (code: string) => boolean) => has('shipments.view') || has('shipments.create'),
    },
    {
      name: 'مقـاولو النقل والتفريغ',
      href: '/contractors',
      icon: Truck,
      checkVisible: (has: (code: string) => boolean) =>
        has('contractors.view') || has('contractors.create') || has('contractors.invoices_view'),
    },
    {
      name: 'كشوف الحسابات والتسويات',
      href: '/statements',
      icon: FileText,
      checkVisible: (has: (code: string) => boolean) => has('statements.view') || has('statements.create'),
    },
    {
      name: 'أمانات وودائع العملاء',
      href: '/deposits',
      icon: PiggyBank,
      checkVisible: (has: (code: string) => boolean) => has('deposits.view') || has('deposits.create'),
    },
    {
      name: 'الخزينة والمقبوضات',
      href: '/treasury',
      icon: Wallet,
      checkVisible: (has: (code: string) => boolean) => has('treasury.view') || has('treasury.create'),
    },
    {
      name: 'عهد الموظفين',
      href: '/custody',
      icon: Wallet,
      checkVisible: (has: (code: string) => boolean) => has('custody.view') || has('custody.create'),
    },
    {
      name: 'إعدادات التشغيل',
      href: '/settings',
      icon: Settings,
      checkVisible: (has: (code: string) => boolean) =>
        has('settings.view') || has('settings.manage') || has('settings.edit'),
    },
    {
      name: 'إدارة الموظفين والأدوار',
      href: '/users',
      icon: UserCog,
      checkVisible: (has: (code: string) => boolean) => has('users.view') || has('roles.manage'),
    },
    {
      name: 'سجل الرقابة والتدقيق',
      href: '/audit',
      icon: ShieldCheck,
      checkVisible: (has: (code: string) => boolean) => has('audit.view'),
    },
  ];

  // Determine visibility for each nav item
  const visibleNav = navigation.filter((item) => {
    if (isAdmin) return true;
    return item.checkVisible(hasPermission);
  });

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden" dir="rtl">
      {/* Mobile Top Navbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Globe className="h-6 w-6 text-indigo-400" />
          <span className="font-bold text-sm">التخليص الجمركي</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:text-white"
        >
          {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar Desktop & Mobile Overlay */}
      <aside
        className={`fixed md:static inset-y-0 right-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="p-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base leading-tight">التخليص الجمركي</h2>
              <span className="text-[11px] text-indigo-400 font-semibold">المحاسبة والخدمات الجمركية</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <item.icon
                  className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`}
                />
                {item.name}
              </Link>
            );
          })}

          {/* Role badge — shows current role + permissions count for debugging */}
          {dbUser && (
            <div className="mt-4 px-4 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">الدور الحالي</p>
              <p className="text-xs font-bold text-indigo-400">{dbUser.role}</p>
              {!isAdmin && dbUser.permissions && (
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {dbUser.permissions.length} صلاحية نشطة
                </p>
              )}
            </div>
          )}
        </nav>

        {/* Dev Quick Switch — Sidebar bottom slot */}
        <QuickDevSwitch />

        {/* User Card */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <User className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white truncate">{dbUser.name || 'مستخدم'}</h4>
              <p className="text-[11px] text-slate-400 truncate">{dbUser.email}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30 text-xs font-bold transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 mt-14 md:mt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
