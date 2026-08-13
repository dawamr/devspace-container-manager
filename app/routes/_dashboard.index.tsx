import { createFileRoute } from '@tanstack/react-router'
import { Folder, Server, ShieldCheck } from 'lucide-react'

import {
  ClockWidget,
  GaugeWidget,
  GlassAppTile,
  NetworkWidget,
  StorageWidget,
  type GlassAppTileConfig,
} from '#/shared/components/layout/casa-widgets'

export const Route = createFileRoute('/_dashboard/')({
  component: DashboardHome,
})

const APP_TILES: GlassAppTileConfig[] = [
  {
    title: 'Projects',
    description: 'Project & environment tim',
    href: '/projects',
    icon: Folder,
  },
  {
    title: 'Infrastructure',
    description: 'Portainer environments',
    href: '/infrastructure',
    icon: Server,
  },
  {
    title: 'Administration',
    description: 'Users, roles, audit log',
    href: '/administration',
    icon: ShieldCheck,
  },
]

// Placeholder sampai telemetri Portainer tersambung (Sprint 2).
const NETWORK_HISTORY = [0.2, 0.35, 0.3, 0.55, 0.42, 0.6, 0.5, 0.72, 0.58, 0.66, 0.48, 0.62]

function DashboardHome() {
  return (
    <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
      {/* Kolom kiri: clock + system status, ala widget stack CasaOS */}
      <div className="flex flex-col gap-4">
        <ClockWidget />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <GaugeWidget label="CPU" value={32} detail="4 core" />
          <GaugeWidget label="RAM" value={58} detail="9.3 / 16 GB" />
        </div>
        <StorageWidget label="Storage" usedLabel="212 GB" totalLabel="476 GB" percent={45} />
        <NetworkWidget
          label="Network"
          downLabel="24.6 MB/s"
          upLabel="6.1 MB/s"
          history={NETWORK_HISTORY}
        />
      </div>

      {/* Area utama: app grid ala home screen CasaOS */}
      <section aria-label="Aplikasi" className="lg:col-span-2">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {APP_TILES.map((tile) => (
            <GlassAppTile key={tile.href} {...tile} />
          ))}
        </div>
      </section>
    </div>
  )
}
