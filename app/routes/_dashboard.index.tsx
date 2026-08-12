import { createFileRoute } from '@tanstack/react-router'
import { Activity, Folder, Package, Server, ShieldCheck } from 'lucide-react'

import { AppGrid } from '#/shared/components/layout/app-grid'
import type { AppTileConfig } from '#/shared/components/layout/app-tile'
import { StatWidget } from '#/shared/components/layout/stat-widget'

export const Route = createFileRoute('/_dashboard/')({
  component: DashboardHome,
})

const MODULE_TILES: AppTileConfig[] = [
  {
    title: 'Projects',
    description: 'Kelola project dan environment tim',
    href: '/projects',
    icon: Folder,
    accent: 'primary',
  },
  {
    title: 'Infrastructure',
    description: 'Environment Portainer yang terhubung',
    href: '/infrastructure',
    icon: Server,
    accent: 'info',
  },
  {
    title: 'Administration',
    description: 'Users, roles, dan audit log',
    href: '/administration',
    icon: ShieldCheck,
    accent: 'secondary',
  },
]

function DashboardHome() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Selamat datang kembali</h1>
        <p className="text-sm text-muted-foreground">Ringkasan singkat aktivitas DevSpace Anda.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatWidget label="Total Projects" value={6} icon={Folder} accent="primary" />
        <StatWidget label="Environments Aktif" value={3} icon={Server} accent="info" />
        <StatWidget label="Running Containers" value={18} icon={Activity} accent="success" helpText="dari 22 total" />
        <StatWidget label="Stacks" value={9} icon={Package} accent="warning" />
      </div>

      <AppGrid items={MODULE_TILES} />
    </div>
  )
}
