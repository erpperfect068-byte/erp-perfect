import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`}
      {...props}
    />
  );
}

/**
 * Metric Card Skeleton (Top stats bar)
 */
export function MetricCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-3 w-24 rounded-md" />
        <Skeleton className="h-7 w-16 rounded-lg" />
      </div>
      <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
    </div>
  );
}

/**
 * Contractor / Resource Card Skeleton (Grid cards)
 */
export function CardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-3/4 rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </div>
          <Skeleton className="h-6 w-20 rounded-lg shrink-0" />
        </div>

        {/* Contact info rows */}
        <div className="space-y-2 mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 rounded-full" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 rounded-full" />
            <Skeleton className="h-3 w-48 rounded-md" />
          </div>
        </div>

        {/* Highlight box (e.g. Bank Account / Status) */}
        <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
          <div className="flex justify-between items-center">
            <Skeleton className="h-3.5 w-28 rounded-md" />
            <Skeleton className="h-3 w-12 rounded-md" />
          </div>
          <Skeleton className="h-3 w-40 rounded-md" />
        </div>

        {/* Secondary line */}
        <div className="mt-2.5 flex justify-between items-center px-1">
          <Skeleton className="h-3 w-28 rounded-md" />
          <Skeleton className="h-3 w-14 rounded-md" />
        </div>
      </div>

      {/* Footer action buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-20 rounded-lg" />
          <Skeleton className="h-7 w-20 rounded-lg" />
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Table Skeleton (For data tables like invoices and transactions)
 */
export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200">
      <table className="w-full text-right text-xs">
        <thead className="bg-slate-50/80 border-b border-slate-100">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="p-4">
                <Skeleton className="h-3.5 w-20 rounded-md" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="p-4">
                  <Skeleton
                    className={`h-4 rounded-md ${
                      c === 0 ? 'w-28 font-bold' : c === cols - 1 ? 'w-16' : 'w-24'
                    }`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Debt Banner Skeleton
 */
export function AlertBannerSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-2xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-48 rounded-md" />
            <Skeleton className="h-3 w-64 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-6 w-32 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    </div>
  );
}
