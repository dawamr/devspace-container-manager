import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/administration/users')({
  staticData: { title: 'Users' },
  component: UsersPage,
})

function UsersPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold text-foreground">Users</h1>
      <p className="text-sm text-muted-foreground">Daftar user akan tersedia setelah modul Users dibangun.</p>
    </div>
  )
}
