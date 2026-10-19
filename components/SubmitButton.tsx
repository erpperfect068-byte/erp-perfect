'use client'

import * as React from 'react'
import { useFormStatus } from 'react-dom'
import { Button, ButtonProps } from './ui/button'

export interface SubmitButtonProps extends Omit<ButtonProps, 'type'> {
  /**
   * Optional manual override for loading state.
   * If not provided, will automatically track the enclosing <form>'s pending status via useFormStatus.
   */
  isLoading?: boolean
}

/**
 * SubmitButton for React 19 / Next.js 15 Server Actions and Form Submissions.
 * Automatically tracks whether the parent form is pending and displays the loading spinner.
 */
export const SubmitButton = React.forwardRef<HTMLButtonElement, SubmitButtonProps>(
  ({ isLoading, children, loadingText = "جاري المعالجة...", ...props }, ref) => {
    const { pending } = useFormStatus()
    const loading = isLoading ?? pending

    return (
      <Button
        ref={ref}
        type="submit"
        isLoading={loading}
        loadingText={loadingText}
        {...props}
      >
        {children}
      </Button>
    )
  }
)

SubmitButton.displayName = 'SubmitButton'

export default SubmitButton
