import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export const buttonVariants = cva(
  "inline-flex items-center justify-center font-bold transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98] disabled:active:scale-100",
  {
    variants: {
      variant: {
        default:
          "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-indigo-500/20",
        destructive:
          "bg-rose-600 text-white hover:bg-rose-700 shadow-md hover:shadow-rose-500/20",
        outline:
          "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm",
        secondary:
          "bg-slate-100 text-slate-800 hover:bg-slate-200",
        ghost:
          "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        link:
          "text-indigo-600 underline-offset-4 hover:underline p-0 h-auto font-semibold",
        success:
          "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-emerald-500/20",
      },
      size: {
        default: "h-10 px-4 py-2 text-sm rounded-xl gap-2",
        sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
        lg: "h-12 px-6 text-base rounded-2xl gap-2.5",
        icon: "h-10 w-10 p-0 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * If true, displays a spinning loader and disables the button.
   */
  isLoading?: boolean
  /**
   * Optional custom text or node to display when in the loading state.
   */
  loadingText?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      isLoading = false,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={isLoading}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {isLoading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
        )}
        {isLoading && loadingText ? loadingText : children}
      </button>
    )
  }
)

Button.displayName = "Button"
