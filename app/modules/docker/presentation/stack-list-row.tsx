import { Container, ChevronRight } from 'lucide-react'
import { cn } from '#/shared/lib/cn'
import type { GlobalStackSummary } from '#/modules/docker/server/list-all-stacks'
import type { EnvironmentMapEntry } from '#/modules/docker/server/list-environments-map'

interface StackListRowProps {
  stack: GlobalStackSummary
  environmentMap: Map<string, EnvironmentMapEntry>
  onClick: () => void
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

export function StackListRow({ stack, environmentMap, onClick }: StackListRowProps) {
  const env = environmentMap.get(stack.environmentId)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] px-4 py-3 text-left backdrop-blur-[var(--glass-blur)] transition-colors hover:border-[var(--glass-border-strong)]',
        !stack.isActive && 'opacity-60',
      )}
    >
      <span
        className={cn(
          'size-2 shrink-0 rounded-full',
          stack.isActive ? 'bg-emerald-400' : 'bg-white/40',
        )}
      />
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-white">{stack.name}</span>
            <span className="shrink-0 text-xs text-white/40">
              {env?.projectName ?? 'Unknown'} / {env?.environmentName ?? 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 text-xs text-white/50">
        <span className="flex items-center gap-1 tabular-nums">
          <Container className="size-3.5" />
          {stack.containerCount}
        </span>
        <span className="text-white/30">{formatRelativeTime(stack.lastSeenAt)}</span>
      </div>

      <ChevronRight className="size-4 shrink-0 text-white/40" />
    </button>
  )
}
