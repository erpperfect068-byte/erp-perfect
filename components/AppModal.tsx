'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { LoadingButton, type LoadingButtonProps } from '@/components/LoadingButton';

export type AppModalProps = {
  open: boolean;
  children: React.ReactNode;
  /** Extra classes on the backdrop (e.g. overflow-y-auto) */
  className?: string;
  /** z-index utility class — default z-50 */
  zIndexClass?: string;
};

/**
 * Shared modal backdrop used across the app.
 * Keeps the existing look (dimmed + blur). Pass the white panel as children unchanged.
 */
export function AppModal({
  open,
  children,
  className,
  zIndexClass = 'z-50',
}: AppModalProps) {
  if (!open) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4',
        zIndexClass,
        className
      )}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  );
}

/**
 * Primary modal action button — shows spinner and disables on click via isLoading.
 * Same API as LoadingButton / Button (isLoading, loadingText).
 */
export const ModalSubmitButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (props, ref) => <LoadingButton ref={ref} {...props} />
);
ModalSubmitButton.displayName = 'ModalSubmitButton';

export default AppModal;
