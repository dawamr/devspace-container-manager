import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "#/shared/lib/cn.ts"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-white/15 text-white [a&]:hover:bg-white/25",
        secondary:
          "bg-white/10 text-white/80 [a&]:hover:bg-white/15",
        destructive:
          "bg-red-500/20 text-red-300 border-red-500/30 [a&]:hover:bg-red-500/30",
        outline:
          "border-[var(--glass-border-strong)] text-white/80 [a&]:hover:bg-white/10",
        glass:
          "border-[var(--glass-border)] bg-[var(--glass-surface-subtle)] text-white/80 backdrop-blur-[var(--glass-blur-sm)] [a&]:hover:bg-[var(--glass-surface)]",
        ghost: "text-white/60 [a&]:hover:bg-white/10 [a&]:hover:text-white",
        link: "text-white underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
