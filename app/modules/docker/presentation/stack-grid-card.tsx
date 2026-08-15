import { Layers, Container } from 'lucide-react'
import { cn } from '#/shared/lib/cn'
import { GlassPanel } from '#/shared/ui/glass-card'
import type { GlobalStackSummary } from '#/modules/docker/server/list-all-stacks'
import type { EnvironmentMapEntry } from '#/modules/docker/server/list-environments-map'

interface StackGridCardProps {
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

export function StackGridCard({ stack, environmentMap, onClick }: StackGridCardProps) {
  const env = environmentMap.get(stack.environmentId)
  const projectName = env?.projectName ?? 'Unknown'
  const environmentName = env?.environmentName ?? 'Unknown'

  return (
    <GlassPanel
      className={cn(
        'group cursor-pointer transition-all hover:border-[var(--glass-border-strong)]',
        !stack.isActive && 'opacity-60',
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full flex-col gap-3 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                'size-2 shrink-0 rounded-full',
                stack.isActive ? 'bg-emerald-400' : 'bg-white/40',
              )}
            />
            <span className="truncate text-sm font-medium text-white">{stack.name}</span>
          </div>
          <Layers className="size-4 shrink-0 text-white/40" />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-white/50">
          <span className="truncate">{projectName}</span>
          <span className="text-white/30">/</span>
          <span className="truncate">{environmentName}</span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <Container className="size-3.5" />
            <span className="tabular-nums">{stack.containerCount} containers</span>
          </div>
          <span className="text-[10px] text-white/40">
            {formatRelativeTime(stack.lastSeenAt)}
          </span>
        </div>
      </button>
    </GlassPanel>
  )
}
