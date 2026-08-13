import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '#/shared/ui/glass-card'

export const Route = createFileRoute('/_dashboard/infrastructure')({
  staticData: { title: 'Infrastructure' },
  component: InfrastructurePage,
})

function InfrastructurePage() {
  return (
    <div className="flex flex-col gap-2">
      <PageHeader title="Infrastructure" description="Daftar environment Portainer akan tersedia pada implementasi Sprint 2." />
    </div>
  )
}
