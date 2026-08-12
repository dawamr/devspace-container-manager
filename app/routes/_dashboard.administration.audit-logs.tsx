import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/administration/audit-logs')({
  staticData: { title: 'Audit Logs' },
  component: AuditLogsPage,
})

function AuditLogsPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold text-foreground">Audit Logs</h1>
      <p className="text-sm text-muted-foreground">Log aktivitas akan tersedia setelah modul Audit Log dibangun.</p>
    </div>
  )
}
