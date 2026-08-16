import { UserCheck, Filter } from 'lucide-react'

import { cn } from '#/shared/lib/cn'

interface MyContainersToggleProps {
  active: boolean
  onToggle: (active: boolean) => void
}

/** Toggle button to filter containers by "assigned to me". */
export function MyContainersToggle({ active, onToggle }: MyContainersToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!active)}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all',
        active
          ? 'border-[var(--glass-border-strong)] bg-white/10 text-white'
          : 'border-[var(--glass-border)] bg-transparent text-white/50 hover:bg-white/5 hover:text-white/70',
      )}
      aria-pressed={active}
    >
      {active ? <UserCheck className="size-4" /> : <Filter className="size-4" />}
      <span>Assigned to me</span>
    </button>
  )
}
