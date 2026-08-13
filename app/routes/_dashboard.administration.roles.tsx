import { createFileRoute } from '@tanstack/react-router'
import { createRouteGuard } from '#/modules/rbac/server/route-guard'
import { RolesTable } from '#/modules/roles/presentation/roles-table'

export const Route = createFileRoute('/_dashboard/administration/roles')({
  beforeLoad: createRouteGuard('users', 'read'),
  staticData: { title: 'Roles' },
  component: RolesPage,
})

function RolesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground">Roles</h1>
        <p className="text-sm text-muted-foreground">
          Kelola role dan permission untuk setiap user.
        </p>
      </div>
      <RolesTable />
    </div>
  )
}
