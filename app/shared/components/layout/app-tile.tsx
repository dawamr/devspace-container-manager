import type { LucideIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { cn } from '#/shared/lib/cn'
import type { RoutePath } from '#/shared/lib/route-path'
import { GlassPanel } from '#/shared/ui/glass-card'

import { ACCENT_STYLES, type Accent } from './accent'

export interface AppTileConfig {
  title: string
  description: string
  href: RoutePath
  icon: LucideIcon
  accent: Accent
}

export function AppTile({ title, description, href, icon: Icon, accent }: AppTileConfig) {
  const styles = ACCENT_STYLES[accent]

  return (
    <GlassPanel
      className={cn(
        'group p-5 transition-all hover:-translate-y-0.5 hover:shadow-md',
        'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring',
      )}
    >
      <Link
        to={href}
        className="flex flex-col gap-4 focus-visible:outline-none"
      >
        <span className={cn('flex size-11 items-center justify-center rounded-lg', styles.surface, styles.icon)}>
          <Icon className="size-6" />
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-base font-semibold text-card-foreground">{title}</span>
          <span className="text-sm text-white/60">{description}</span>
        </span>
      </Link>
    </GlassPanel>
  )
}
