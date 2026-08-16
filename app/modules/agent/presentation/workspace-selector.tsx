import { useState } from 'react'
import { ChevronDown, Folder } from 'lucide-react'
import { Button } from '#/shared/ui/button'
import { cn } from '#/shared/lib/cn'
import type { WorkspaceSummary } from '#/modules/agent/server/list-workspaces'

interface WorkspaceSelectorProps {
  workspaces: WorkspaceSummary[]
  selectedId: string | null
  onSelect: (workspace: WorkspaceSummary) => void
}

export function WorkspaceSelector({ workspaces, selectedId, onSelect }: WorkspaceSelectorProps) {
  const [open, setOpen] = useState(false)
  const selected = workspaces.find((w) => w.id === selectedId)

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(!open)}
      >
        <Folder className="size-4" />
        {selected?.name ?? 'Select workspace'}
        <ChevronDown className="size-3" />
      </Button>
      {open && (
        <div
          className="absolute top-full left-0 z-50 mt-1 w-64 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-black/80 p-1 backdrop-blur-xl"
          onMouseLeave={() => setOpen(false)}
        >
          {workspaces.length === 0 && (
            <div className="px-3 py-2 text-sm text-white/50">No workspaces assigned</div>
          )}
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-white/10',
                ws.id === selectedId && 'bg-white/10',
              )}
              onClick={() => {
                onSelect(ws)
                setOpen(false)
              }}
            >
              <Folder className="size-4 shrink-0 text-white/50" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{ws.name}</div>
                <div className="truncate text-xs text-white/40">{ws.rootPath}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
