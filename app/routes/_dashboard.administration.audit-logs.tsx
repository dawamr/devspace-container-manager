import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '#/shared/ui/glass-card'

export const Route = createFileRoute('/_dashboard/administration/audit-logs')({
  staticData: { title: 'Audit Logs' },
  component: AuditLogsPage,
})

function AuditLogsPage() {
  return (
    <div className="flex flex-col gap-2">
      <PageHeader title="Audit Logs" description="Log aktivitas akan tersedia setelah modul Audit Log dibangun." />
    </div>
  )
}
