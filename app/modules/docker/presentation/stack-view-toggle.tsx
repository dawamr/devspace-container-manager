import { Table, LayoutGrid, List } from 'lucide-react'
import { cn } from '#/shared/lib/cn'

export type StackViewMode = 'table' | 'grid' | 'list'

interface StackViewToggleProps {
  value: StackViewMode
  onChange: (mode: StackViewMode) => void
}

const MODES: { key: StackViewMode; label: string; icon: typeof Table }[] = [
  { key: 'table', label: 'Table', icon: Table },
  { key: 'grid', label: 'Grid', icon: LayoutGrid },
  { key: 'list', label: 'List', icon: List },
]

export function StackViewToggle({ value, onChange }: StackViewToggleProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] p-0.5 backdrop-blur-[var(--glass-blur)]">
      {MODES.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          title={`${label} view`}
          className={cn(
            'flex items-center gap-1.5 rounded-[calc(var(--glass-radius)-2px)] px-2.5 py-1.5 text-xs font-medium transition-colors',
            value === key
              ? 'bg-white/10 text-white border border-[var(--glass-border-strong)]'
              : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent',
          )}
        >
          <Icon className="size-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}
