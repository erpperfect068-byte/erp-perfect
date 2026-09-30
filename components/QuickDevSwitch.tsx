/**
 * ⚠️ DEVELOPMENT ONLY COMPONENT ⚠️
 * ----------------------------------------------------------------------------------
 * WARNING: This Quick Switch panel is strictly designed for local development testing.
 * It MUST be disabled (NEXT_PUBLIC_ENABLE_QUICK_SWITCH=false) or removed prior to
 * deploying to production or handing over to client.
 * ----------------------------------------------------------------------------------
 */

'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Shield, Calculator, Ship, FileEdit, Sparkles, RefreshCw } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://evxeqsfuyvisfkqxdaqv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2eGVxc2Z1eXZpc2ZrcXhkYXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNTI0NjMsImV4cCI6MjEwNTgyODQ2M30.aXcDykVvTjH6Wnxd0b9BDJXLZWGt0CkF_oe5NYoYVJE';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function QuickDevSwitch() {
  const isEnabled = process.env.NEXT_PUBLIC_ENABLE_QUICK_SWITCH === 'true';
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  // If feature flag is off, do NOT render anything into the DOM
  if (!isEnabled) {
    return null;
  }

  const handleQuickSwitch = async (role: string) => {
    setLoadingRole(role);
    setErrorMsg(null);
    try {
      // Fetch session token from server-side quick-login route (passwords stay on server)
      const res = await fetch('/api/dev/quick-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      const data = await res.json();
      if (!res.ok || !data.access_token) {
        throw new Error(data.error || 'فشل تسجيل الدخول التجريبي السريع');
      }

      // Establish Supabase Auth Session on client using server-issued tokens
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      if (sessionError) throw sessionError;

      router.push('/');
      router.refresh();
    } catch (err: any) {
      console.error('Quick dev switch error:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء التبديل');
    } finally {
      setLoadingRole(null);
    }
  };

  const rolesList = [
    { key: 'admin', label: 'مدير (Admin)', icon: Shield, color: 'border-red-500/40 text-red-400 hover:bg-red-500/10' },
    { key: 'accountant', label: 'محاسب (Accountant)', icon: Calculator, color: 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10' },
    { key: 'clearance_officer', label: 'مخلص (Clearance)', icon: Ship, color: 'border-blue-500/40 text-blue-400 hover:bg-blue-500/10' },
    { key: 'data_entry', label: 'مدخل (Data Entry)', icon: FileEdit, color: 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10' },
  ];

  return (
    <div className="p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/30 backdrop-blur-md shadow-xl space-y-3" dir="rtl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> تبديل سريع للحسابات (Dev Mode Only)
        </span>
        <span className="text-[10px] text-slate-500">ميزة للتطوير فقط</span>
      </div>

      {errorMsg && (
        <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {rolesList.map((r) => {
          const Icon = r.icon;
          const isLoading = loadingRole === r.key;

          return (
            <button
              key={r.key}
              onClick={() => handleQuickSwitch(r.key)}
              disabled={loadingRole !== null}
              className={`flex items-center gap-2 p-2.5 rounded-xl border bg-slate-950/80 transition-all text-xs font-medium ${r.color} disabled:opacity-50`}
            >
              {isLoading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Icon className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">{r.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
