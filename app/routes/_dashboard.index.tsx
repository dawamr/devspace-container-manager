import { createFileRoute } from '@tanstack/react-router'
import { Bot, Box, Layers, Settings, ShieldCheck } from 'lucide-react'

import { AppGrid, type AppGridTileBase } from '#/shared/components/layout/app-grid'
import {
  ClockWidget,
  GaugeWidget,
  GlassAppTile,
  NetworkWidget,
  StorageWidget,
} from '#/shared/components/layout/casa-widgets'
import { ROLE_NAMES } from '#/modules/rbac/domain/constants'

export const Route = createFileRoute('/_dashboard/')({
  component: DashboardHome,
})

const APP_TILES: AppGridTileBase[] = [
  {
    title: 'Konfigurasi',
    description: 'Project, environment & Docker host',
    href: '/configuration',
    icon: Settings,
  },
  {
    title: 'RBAC Admin',
    description: 'Users, roles, audit log',
    href: '/administration',
    icon: ShieldCheck,
  },
  {
    title: 'Stacks',
    description: 'Docker Compose stacks',
    href: '/stacks',
    icon: Layers,
  },
  {
    title: 'Containers',
    description: 'Semua container lintas project',
    href: '/containers',
    icon: Box,
  },
  {
    title: 'Agent',
    description: 'AI agentic workspace',
    href: '/agent',
    icon: Bot,
  },
]

// Placeholder sampai telemetri Docker Engine tersambung.
const NETWORK_HISTORY = [0.2, 0.35, 0.3, 0.55, 0.42, 0.6, 0.5, 0.72, 0.58, 0.66, 0.48, 0.62]

function DashboardHome() {
  const { user } = Route.useRouteContext()
  const isAdmin = user.roleName === ROLE_NAMES.ADMIN

  const tiles = isAdmin ? APP_TILES : APP_TILES.filter(
    (t) => t.href !== '/administration',
  )

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
        <AppGrid groups={[{ label: '', tiles }]} renderTile={GlassAppTile} />
      </section>
    </div>
  )
}
