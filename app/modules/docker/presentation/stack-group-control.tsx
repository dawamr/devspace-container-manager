import { useState } from 'react'
import { Layers, ChevronDown } from 'lucide-react'
import { cn } from '#/shared/lib/cn'

export type StackGroupBy = 'none' | 'environment' | 'project'

interface StackGroupControlProps {
  value: StackGroupBy
  onChange: (value: StackGroupBy) => void
}

const OPTIONS: { key: StackGroupBy; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'environment', label: 'Environment' },
  { key: 'project', label: 'Project' },
]

export function StackGroupControl({ value, onChange }: StackGroupControlProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur-[var(--glass-blur)] transition-colors hover:border-[var(--glass-border-strong)] hover:text-white"
      >
        <Layers className="size-3.5" />
        <span className="hidden sm:inline">Group:</span>
        <span className="text-white">{OPTIONS.find((o) => o.key === value)?.label ?? 'None'}</span>
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] p-1 backdrop-blur-[var(--glass-blur)] shadow-xl">
            {OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  onChange(opt.key)
                  setOpen(false)
                }}
                className={cn(
                  'block w-full rounded-[calc(var(--glass-radius)-2px)] px-3 py-1.5 text-left text-xs transition-colors',
                  value === opt.key
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:bg-white/5 hover:text-white',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
