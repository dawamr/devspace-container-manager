import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/shared/ui/table'
import { cn } from '#/shared/lib/cn'
import type { GlobalStackSummary } from '#/modules/docker/server/list-all-stacks'
import type { EnvironmentMapEntry } from '#/modules/docker/server/list-environments-map'

interface StackTableProps {
  stacks: GlobalStackSummary[]
  environmentMap: Map<string, EnvironmentMapEntry>
  onRowClick: (stack: GlobalStackSummary) => void
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function StackTable({ stacks, environmentMap, onRowClick }: StackTableProps) {
  return (
    <div className="rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] backdrop-blur-[var(--glass-blur)] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
            <TableHead className="text-xs font-medium uppercase tracking-wide text-white/40">
              Stack
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-white/40">
              Project
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-white/40">
              Environment
            </TableHead>
            <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-white/40">
              Containers
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-white/40">
              Status
            </TableHead>
            <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-white/40">
              Last Seen
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stacks.map((stack) => {
            const env = environmentMap.get(stack.environmentId)
            return (
              <TableRow
                key={stack.id}
                className="cursor-pointer border-[var(--glass-border)] transition-colors hover:bg-white/5"
                onClick={() => onRowClick(stack)}
              >
                <TableCell className="text-sm font-medium text-white">
                  {stack.name}
                </TableCell>
                <TableCell className="text-sm text-white/60">
                  {env?.projectName ?? 'Unknown'}
                </TableCell>
                <TableCell className="text-sm text-white/60">
                  {env?.environmentName ?? 'Unknown'}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums text-white/70">
                  {stack.containerCount}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5 text-xs">
                    <span
                      className={cn(
                        'size-2 rounded-full',
                        stack.isActive ? 'bg-emerald-400' : 'bg-white/40',
                      )}
                    />
                    {stack.isActive ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="text-right text-xs text-white/40">
                  {formatRelativeTime(stack.lastSeenAt)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
