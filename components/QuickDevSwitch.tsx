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
import { Shield, Calculator, Ship, FileEdit, RefreshCw, Zap } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://evxeqsfuyvisfkqxdaqv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2eGVxc2Z1eXZpc2ZrcXhkYXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNTI0NjMsImV4cCI6MjEwNTgyODQ2M30.aXcDykVvTjH6Wnxd0b9BDJXLZWGt0CkF_oe5NYoYVJE';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function QuickDevSwitch() {
  const isEnabled = process.env.NEXT_PUBLIC_ENABLE_QUICK_SWITCH === 'true';
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

      // Hard reload to fully re-initialize AuthContext with the new session
      window.location.href = '/';
    } catch (err: any) {
      console.error('Quick dev switch error:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء التبديل');
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
    <div className="mx-3 mb-2 p-3 rounded-xl bg-slate-950 border border-indigo-500/20 space-y-2" dir="rtl">
      <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-800">
        <Zap className="h-3 w-3 text-indigo-400" />
        <span className="text-[10px] font-bold text-indigo-400">تبديل سريع — Dev Only</span>
      </div>

      {errorMsg && (
        <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 p-1.5 rounded-lg leading-relaxed">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        {rolesList.map((r) => {
          const Icon = r.icon;
          const isLoading = loadingRole === r.key;

          return (
            <button
              key={r.key}
              onClick={() => handleQuickSwitch(r.key)}
              disabled={loadingRole !== null}
              className={`flex items-center gap-1.5 p-2 rounded-lg border bg-slate-900 transition-all text-[10px] font-bold ${r.color} disabled:opacity-40`}
            >
              {isLoading ? (
                <RefreshCw className="h-3 w-3 animate-spin shrink-0" />
              ) : (
                <Icon className="h-3 w-3 shrink-0" />
              )}
              <span className="truncate">{r.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
