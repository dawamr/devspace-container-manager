import { Boxes, CirclePlay, CircleStop, TriangleAlert } from 'lucide-react'
import type { ContainerSummary } from '#/modules/docker/domain/docker-types'
import { cn } from '#/shared/lib/cn'

interface ContainerSummaryBarProps {
  containers: ContainerSummary[]
  /** Current active filter value: 'all' | 'running' | 'exited' | 'unhealthy'. */
  active: string
  onChange: (value: string) => void
}

type PillKey = 'all' | 'running' | 'exited' | 'unhealthy'

interface PillDef {
  key: PillKey
  label: string
  icon: typeof Boxes
  count: (c: ContainerSummary[]) => number
  /** Accent classes for the active state of this pill. */
  activeClass: string
  /** Optional pulse dot for live indicators. */
  pulse?: boolean
}

const PILLS: PillDef[] = [
  {
    key: 'all',
    label: 'Total',
    icon: Boxes,
    activeClass: 'border-[var(--glass-border-strong)] bg-white/10 text-white',
    count: (c) => c.length,
  },
  {
    key: 'running',
    label: 'Running',
    icon: CirclePlay,
    activeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    pulse: true,
    count: (c) => c.filter((x) => x.state === 'running').length,
  },
  {
    key: 'exited',
    label: 'Stopped',
    icon: CircleStop,
    activeClass: 'border-white/30 bg-white/10 text-white/70',
    count: (c) => c.filter((x) => x.state === 'exited').length,
  },
  {
    key: 'unhealthy',
    label: 'Unhealthy',
    icon: TriangleAlert,
    activeClass: 'border-red-500/40 bg-red-500/15 text-red-300',
    count: (c) =>
      c.filter(
        (x) => x.health !== 'healthy' || x.state === 'dead' || x.state === 'restarting',
      ).length,
  },
]

export function ContainerSummaryBar({ containers, active, onChange }: ContainerSummaryBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PILLS.map((pill) => {
        const Icon = pill.icon
        const isActive = active === pill.key
        const count = pill.count(containers)
        return (
          <button
            key={pill.key}
            type="button"
            onClick={() => onChange(pill.key)}
            aria-pressed={isActive}
            className={cn(
              'group inline-flex items-center gap-2 rounded-[var(--glass-radius)] border px-3 py-1.5 text-sm transition-colors',
              'border-[var(--glass-border)] bg-[var(--glass-surface)] backdrop-blur-[var(--glass-blur)]',
              'hover:border-[var(--glass-border-strong)] hover:text-white',
              isActive ? pill.activeClass : 'text-white/60',
            )}
          >
            <Icon className="size-4" />
            <span className="font-medium tabular-nums">{count}</span>
            <span className="hidden sm:inline">{pill.label}</span>
            {pill.pulse && count > 0 && (
              <span
                className={cn(
                  'size-1.5 rounded-full bg-emerald-400',
                  isActive && 'animate-pulse',
                )}
                aria-hidden
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
