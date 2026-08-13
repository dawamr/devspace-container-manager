import * as React from "react"

import { cn } from "#/shared/lib/cn.ts"

/**
 * Textarea dengan smooth border — konsisten dengan glass design tokens.
 * Radius dan focus state sama dengan Input.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-[var(--glass-radius-sm)] border border-[var(--glass-border)] bg-[var(--glass-surface-subtle)] px-3 py-2 text-base text-white shadow-xs transition-[color,border-color,box-shadow] outline-none placeholder:text-white/40 focus-visible:border-white/40 focus-visible:ring-[3px] focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
