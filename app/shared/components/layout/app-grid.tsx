import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AppTile } from './app-tile'
import type { RoutePath } from '#/shared/lib/route-path'

export interface AppGridTileBase {
  title: string
  description: string
  href: RoutePath
  icon: LucideIcon
}

export interface AppGridGroup {
  label: string
  tiles: AppGridTileBase[]
}

interface AppGridProps {
  groups: AppGridGroup[]
  /** Optional custom tile renderer. Defaults to AppTile. */
  renderTile?: ComponentType<AppGridTileBase>
}

export function AppGrid({ groups, renderTile: Tile = AppTile }: AppGridProps) {
  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.label || 'default'}>
          {group.label ? (
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
              {group.label}
            </h2>
          ) : null}
          <nav
            aria-label={group.label ? `Navigasi ${group.label}` : 'Navigasi Aplikasi'}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {group.tiles.map((tile) => (
              <Tile key={tile.href} {...tile} />
            ))}
          </nav>
        </section>
      ))}
    </div>
  )
}
