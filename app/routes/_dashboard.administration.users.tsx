import { createFileRoute } from '@tanstack/react-router'
import { createRouteGuard } from '#/modules/rbac/server/route-guard'
import { UsersTable } from '#/modules/users/presentation/users-table'
import { PageHeader } from '#/shared/ui/glass-card'

export const Route = createFileRoute('/_dashboard/administration/users')({
  beforeLoad: createRouteGuard('users', 'read'),
  staticData: { title: 'Users' },
  component: UsersPage,
})

function UsersPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Users" description="Kelola user dan role access untuk DevSpace." />
      <UsersTable />
    </div>
  )
}
