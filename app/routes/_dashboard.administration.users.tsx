import { createFileRoute } from '@tanstack/react-router'
import { createRouteGuard } from '#/modules/rbac/server/route-guard'
import { UsersTable } from '#/modules/users/presentation/users-table'

export const Route = createFileRoute('/_dashboard/administration/users')({
  beforeLoad: createRouteGuard('users', 'read'),
  staticData: { title: 'Users' },
  component: UsersPage,
})

function UsersPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground">
          Kelola user dan role access untuk DevSpace.
        </p>
      </div>
      <UsersTable />
    </div>
  )
}
