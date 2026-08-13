import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "#/shared/lib/cn.ts"

/**
 * Input dengan smooth border — konsisten dengan glass design tokens.
 * Semua variant memakai --glass-radius-sm dan focus state yang sama.
 */
const inputVariants = cva(
  "h-9 w-full min-w-0 rounded-[var(--glass-radius-sm)] border px-3 py-1 text-base shadow-xs transition-[color,border-color,box-shadow] outline-none selection:bg-white/20 selection:text-white file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      variant: {
        default:
          "border-[var(--glass-border)] bg-[var(--glass-surface-subtle)] text-white placeholder:text-white/40 focus-visible:border-white/40 focus-visible:ring-[3px] focus-visible:ring-white/20",
        glass:
          "border-[var(--glass-border)] bg-[var(--glass-surface-subtle)] text-white placeholder:text-white/40 focus-visible:border-white/40 focus-visible:ring-[3px] focus-visible:ring-white/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Input({
  className,
  type,
  variant,
  ...props
}: React.ComponentProps<"input"> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Input }
