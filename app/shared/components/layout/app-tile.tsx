import type { LucideIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { cn } from '#/shared/lib/cn'

import { ACCENT_STYLES, type Accent } from './accent'

export interface AppTileConfig {
  title: string
  description: string
  href: string
  icon: LucideIcon
  accent: Accent
}

export function AppTile({ title, description, href, icon: Icon, accent }: AppTileConfig) {
  const styles = ACCENT_STYLES[accent]

  return (
    <Link
      to={href}
      className={cn(
        'group flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-all',
        'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <span className={cn('flex size-11 items-center justify-center rounded-lg', styles.surface, styles.icon)}>
        <Icon className="size-6" />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-base font-semibold text-card-foreground">{title}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </span>
    </Link>
  )
}
