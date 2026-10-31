'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type DataTableColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Clickable cell that triggers onPrimaryClick (e.g. name → details drawer) */
  isPrimary?: boolean;
};

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  onPrimaryClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  actionsHeader?: string;
  emptyState?: React.ReactNode;
  loading?: boolean;
  dense?: boolean;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  onPrimaryClick,
  actions,
  actionsHeader = 'إجراءات',
  emptyState,
  loading = false,
  dense = true,
  className,
}: DataTableProps<T>) {
  const cellPad = dense ? 'px-3 py-2.5' : 'px-4 py-3.5';

  if (loading) {
    return (
      <div className={cn('bg-white border border-slate-200 rounded-2xl overflow-hidden', className)}>
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={cn('animate-pulse flex gap-4', cellPad)}>
              <div className="h-4 bg-slate-100 rounded w-1/3" />
              <div className="h-4 bg-slate-100 rounded w-1/4" />
              <div className="h-4 bg-slate-100 rounded w-1/5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={cn('bg-white border border-slate-200 rounded-2xl', className)}>
        {emptyState ?? (
          <div className="py-12 text-center text-sm text-slate-400">لا توجد سجلات للعرض</div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right border-collapse min-w-[640px]">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200">
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={cn(
                    cellPad,
                    'text-[11px] font-bold text-slate-500 whitespace-nowrap',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
              {actions ? (
                <th
                  scope="col"
                  className={cn(cellPad, 'text-[11px] font-bold text-slate-500 whitespace-nowrap w-24')}
                >
                  {actionsHeader}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const id = getRowId(row);
              return (
                <tr
                  key={id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors"
                >
                  {columns.map((col) => {
                    const content = col.cell(row);
                    const isPrimary = Boolean(col.isPrimary && onPrimaryClick);

                    return (
                      <td key={col.id} className={cn(cellPad, 'align-middle', col.className)}>
                        {isPrimary ? (
                          <button
                            type="button"
                            onClick={() => onPrimaryClick?.(row)}
                            className="text-start font-bold text-indigo-700 hover:text-indigo-900 hover:underline underline-offset-2 max-w-full truncate"
                          >
                            {content}
                          </button>
                        ) : (
                          content
                        )}
                      </td>
                    );
                  })}
                  {actions ? (
                    <td className={cn(cellPad, 'align-middle')}>
                      <div className="flex items-center justify-end gap-0.5">{actions(row)}</div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
