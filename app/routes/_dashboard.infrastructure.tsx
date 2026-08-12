import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/infrastructure')({
  staticData: { title: 'Infrastructure' },
  component: InfrastructurePage,
})

function InfrastructurePage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold text-foreground">Infrastructure</h1>
      <p className="text-sm text-muted-foreground">Daftar environment Portainer akan tersedia pada implementasi Sprint 2.</p>
    </div>
  )
}
