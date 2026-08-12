import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/administration/roles')({
  staticData: { title: 'Roles' },
  component: RolesPage,
})

function RolesPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold text-foreground">Roles</h1>
      <p className="text-sm text-muted-foreground">Pengaturan role & permission akan tersedia setelah modul RBAC dibangun.</p>
    </div>
  )
}
