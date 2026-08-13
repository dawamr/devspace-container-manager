import { createFileRoute } from '@tanstack/react-router'
import { createRouteGuard } from '#/modules/rbac/server/route-guard'
import { RolesTable } from '#/modules/roles/presentation/roles-table'
import { PageHeader } from '#/shared/ui/glass-card'

export const Route = createFileRoute('/_dashboard/administration/roles')({
  beforeLoad: createRouteGuard('users', 'read'),
  staticData: { title: 'Roles' },
  component: RolesPage,
})

function RolesPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Roles" description="Kelola role dan permission untuk setiap user." />
      <RolesTable />
    </div>
  )
}
