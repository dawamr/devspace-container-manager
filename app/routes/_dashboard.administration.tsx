import { Outlet, createFileRoute } from '@tanstack/react-router'
import { FileClock, ShieldCheck, Users, Bot } from 'lucide-react'

import { ModuleSidebar, type ModuleNavItem } from '#/shared/components/layout/module-sidebar'

export const Route = createFileRoute('/_dashboard/administration')({
  staticData: { title: 'Administration' },
  component: AdministrationLayout,
})

const ADMIN_NAV_ITEMS: ModuleNavItem[] = [
  { title: 'Users', href: '/administration/users', icon: Users },
  { title: 'Roles', href: '/administration/roles', icon: ShieldCheck },
  { title: 'Agent Settings', href: '/administration/agent-settings', icon: Bot },
  { title: 'Audit Logs', href: '/administration/audit-logs', icon: FileClock },
]

function AdministrationLayout() {
  return (
    <div className="flex flex-1 flex-col gap-4 md:flex-row md:gap-6">
      <ModuleSidebar title="Administration" items={ADMIN_NAV_ITEMS} />
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}
