'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Tailwind max-width class; default max-w-lg */
  widthClass?: string;
  className?: string;
}

/**
 * Side panel from the left (avoids colliding with the RTL right sidebar).
 * Text content remains RTL via document dir.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  widthClass = 'max-w-lg',
  className,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="إغلاق"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] border-0 cursor-default"
        onClick={onClose}
      />

      <div
        className={cn(
          'absolute inset-y-0 left-0 z-[61] h-full w-full bg-white shadow-2xl border-r border-slate-200',
          'flex flex-col animate-in slide-in-from-left duration-200',
          widthClass,
          className
        )}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-900 truncate">{title}</h2>
            {description ? (
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="إغلاق اللوحة"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <div className="shrink-0 border-t border-slate-100 px-5 py-3 bg-slate-50/80">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
