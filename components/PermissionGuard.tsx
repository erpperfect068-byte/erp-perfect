"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { ShieldAlert, Home } from "lucide-react";
import SidebarLayout from "./SidebarLayout";

export interface PermissionGuardProps {
  /**
   * Required permission code(s). Can also use `permission` prop.
   */
  requiredPermission?: string | string[];
  /**
   * Alias for requiredPermission to match common naming.
   */
  permission?: string | string[];
  children: React.ReactNode;
  /**
   * Title of page for full-page unauthorized screens.
   * If omitted, component acts as an inline guard and returns fallback (or null).
   */
  pageTitle?: string;
  /**
   * Optional custom fallback component when permission is missing (defaults to null for inline guards).
   */
  fallback?: React.ReactNode;
  /**
   * If true, suppresses full-page error and behaves as an inline UI element guard.
   */
  inline?: boolean;
}

export default function PermissionGuard({
  requiredPermission,
  permission,
  children,
  pageTitle,
  fallback = null,
  inline = false,
}: PermissionGuardProps) {
  const { dbUser, hasPermission, loading } = useAuth();

  const perms = requiredPermission || permission;

  if (loading) {
    if (inline || !pageTitle) {
      return null;
    }
    return (
      <SidebarLayout>
        <div className="p-8 space-y-4 max-w-4xl mx-auto">
          <div className="h-8 bg-slate-200 animate-pulse rounded-xl w-1/3"></div>
          <div className="h-4 bg-slate-100 animate-pulse rounded-lg w-1/2"></div>
          <div className="h-64 bg-slate-100 animate-pulse rounded-2xl mt-6"></div>
        </div>
      </SidebarLayout>
    );
  }

  // Admin bypasses all permission checks
  const isAdmin = dbUser?.role === "admin";

  let hasAccess = false;
  if (isAdmin) {
    hasAccess = true;
  } else if (!perms) {
    hasAccess = true;
  } else if (Array.isArray(perms)) {
    hasAccess = perms.some((p) => hasPermission(p));
  } else {
    hasAccess = hasPermission(perms);
  }

  if (!hasAccess) {
    // If used as an inline component (e.g. wrapping a button) or without pageTitle, render fallback (null)
    if (inline || !pageTitle) {
      return <>{fallback}</>;
    }

    // Full-page guard fallback
    return (
      <SidebarLayout>
        <div className="min-h-[70vh] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 max-w-md w-full text-center shadow-xl space-y-6">
            <div className="h-20 w-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="h-10 w-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900">
                عفواً، الدخول غير مصرح به
              </h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                حسابك الحالي لا يمتلك الصلاحية الكافية للوصول إلى ({pageTitle}). يرجى التواصل مع مدير النظام لتعديل صلاحيات حسابك.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-3 px-6 rounded-2xl text-xs w-full shadow-lg transition-colors"
              >
                <Home className="h-4 w-4" />
                العودة إلى الصفحة الرئيسية
              </Link>
            </div>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return <>{children}</>;
}
