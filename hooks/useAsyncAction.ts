'use client'

import { useState, useTransition, useCallback } from 'react'

export interface UseAsyncActionOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

/**
 * Hook to execute async actions (API calls, mutations) using React 19's useTransition.
 * Automatically manages `isLoading` state, prevents race conditions, and exposes error handling.
 *
 * Example:
 * ```tsx
 * const { execute, isLoading } = useAsyncAction(async () => {
 *   await fetch('/api/custody', { method: 'POST', body: ... })
 * });
 *
 * <LoadingButton isLoading={isLoading} onClick={execute}>
 *   حفظ البيانات
 * </LoadingButton>
 * ```
 */
export function useAsyncAction<T = any>(
  asyncFn: (...args: any[]) => Promise<T>,
  options?: UseAsyncActionOptions<T>
) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(
    (...args: any[]) => {
      return new Promise<T | undefined>((resolve, reject) => {
        startTransition(async () => {
          try {
            setError(null)
            const result = await asyncFn(...args)
            options?.onSuccess?.(result)
            resolve(result)
          } catch (err: any) {
            const errorObj = err instanceof Error ? err : new Error(String(err))
            setError(errorObj)
            options?.onError?.(errorObj)
            reject(errorObj)
          }
        })
      })
    },
    [asyncFn, options]
  )

  return {
    execute,
    isLoading: isPending,
    error,
  }
}

export default useAsyncAction
