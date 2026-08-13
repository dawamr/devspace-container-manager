// app/routes/_dashboard.forbidden.tsx
import { createFileRoute } from '@tanstack/react-router'
import { ShieldX } from 'lucide-react'

export const Route = createFileRoute('/_dashboard/forbidden')({
  staticData: { title: 'Forbidden' },
  component: ForbiddenPage,
})

function ForbiddenPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
      <ShieldX className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-2xl font-semibold text-foreground">Access Denied</h1>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        You don't have permission to access this page. Contact your administrator if you believe this is an error.
      </p>
    </div>
  )
}
