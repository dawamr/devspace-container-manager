import { useState } from 'react'
import { Settings2, ChevronDown } from 'lucide-react'
import { Checkbox } from '#/shared/ui/checkbox'
import { cn } from '#/shared/lib/cn'

export interface ColumnDef {
  key: string
  label: string
}

interface ContainerColumnToggleProps {
  columns: ColumnDef[]
  visibility: Record<string, boolean>
  onChange: (visibility: Record<string, boolean>) => void
}

export function ContainerColumnToggle({ columns, visibility, onChange }: ContainerColumnToggleProps) {
  const [open, setOpen] = useState(false)

  const toggleColumn = (key: string) => {
    onChange({ ...visibility, [key]: !visibility[key] })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur-[var(--glass-blur)] transition-colors hover:border-[var(--glass-border-strong)] hover:text-white"
      >
        <Settings2 className="size-3.5" />
        <span className="hidden sm:inline">Columns</span>
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] p-2 backdrop-blur-[var(--glass-blur)] shadow-xl">
            <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-white/40">
              Toggle Columns
            </div>
            {columns.map((col) => (
              <label
                key={col.key}
                className="flex cursor-pointer items-center gap-2 rounded-[calc(var(--glass-radius)-2px)] px-2 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/5"
              >
                <Checkbox
                  checked={visibility[col.key] !== false}
                  onCheckedChange={() => toggleColumn(col.key)}
                />
                {col.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
