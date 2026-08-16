import { Layers, Sparkles, Container } from 'lucide-react'
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
  const isCustom = stack.type === 'custom'
  const TypeIcon = isCustom ? Sparkles : Layers

  return (
    <GlassPanel
      className={cn(
        'group relative overflow-hidden transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]',
        'hover:border-[var(--glass-border-strong)]',
        'focus-within:ring-2 focus-within:ring-white/20',
        !stack.isActive && 'opacity-60',
      )}
    >
      {/* Top accent bar */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          background: isCustom && stack.color
            ? `linear-gradient(90deg, transparent, ${stack.color}80, transparent)`
            : stack.isActive
              ? 'linear-gradient(90deg, transparent, rgba(52,211,153,0.5), transparent)'
              : 'transparent',
        }}
      />

      <button
        type="button"
        onClick={onClick}
        className="flex w-full flex-col gap-2.5 p-4 text-left"
      >
        {/* Name + type */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                'size-2 shrink-0 rounded-full transition-shadow',
                stack.isActive
                  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]'
                  : 'bg-white/40',
              )}
            />
            <span className="truncate text-sm font-medium text-white">{stack.name}</span>
            {isCustom && (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: stack.color ? `${stack.color}20` : 'rgba(255,255,255,0.1)',
                  color: stack.color ?? 'rgba(255,255,255,0.6)',
                }}
              >
                <Sparkles className="size-2.5" />
                Custom
              </span>
            )}
          </div>
          <TypeIcon className="size-4 shrink-0 text-white/30 transition-colors group-hover:text-white/50" />
        </div>

        {/* Description */}
        {stack.description && (
          <p className="truncate text-xs text-white/50 leading-relaxed">
            {stack.description}
          </p>
        )}

        {/* Project / Environment */}
        <div className="flex items-center gap-1.5 text-xs text-white/40">
          <span className="truncate">{projectName}</span>
          <span className="text-white/20">/</span>
          <span className="truncate">{environmentName}</span>
        </div>

        {/* Footer: containers + time */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-1.5 text-xs text-white/50">
            <Container className="size-3.5" />
            <span className="tabular-nums">{stack.containerCount} containers</span>
          </div>
          <span className="text-[10px] text-white/30">
            {formatRelativeTime(stack.lastSeenAt)}
          </span>
        </div>
      </button>
    </GlassPanel>
  )
}
