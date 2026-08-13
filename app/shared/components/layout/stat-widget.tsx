import type { LucideIcon } from 'lucide-react'

import { cn } from '#/shared/lib/cn'
import { GlassPanel } from '#/shared/ui/glass-card'

import { ACCENT_STYLES, type Accent } from './accent'

export interface StatWidgetProps {
  label: string
  value: string | number
  icon: LucideIcon
  accent: Accent
  helpText?: string
}

export function StatWidget({ label, value, icon: Icon, accent, helpText }: StatWidgetProps) {
  const styles = ACCENT_STYLES[accent]

  return (
    <GlassPanel className="flex items-center gap-4 p-4">
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', styles.surface, styles.icon)}>
        <Icon className="size-5" />
      </span>
      <div className="flex flex-col">
        <span className="text-sm text-white/60">{label}</span>
        <span className="text-2xl font-semibold text-card-foreground">{value}</span>
        {helpText ? <span className="text-xs text-white/60">{helpText}</span> : null}
      </div>
    </GlassPanel>
  )
}
