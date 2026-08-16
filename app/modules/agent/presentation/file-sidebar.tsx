import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, PanelLeftClose } from 'lucide-react'
import { Button } from '#/shared/ui/button'
import { listWorkspaceFilesFn } from '#/modules/agent/server/list-workspace-files'
import type { FileEntry } from '#/modules/agent/tools/list-files'

interface FileSidebarProps {
  workspaceId: string
  onCollapse: () => void
  onFileSelect?: (path: string) => void
}

export function FileSidebar({ workspaceId, onCollapse, onFileSelect }: FileSidebarProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['.']))

  const toggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  return (
    <div className="flex h-full flex-col border-r border-[var(--glass-border)] bg-black/30 backdrop-blur-xl">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-white/50">Files</span>
        <Button variant="ghost" size="icon" className="size-6" onClick={onCollapse}>
          <PanelLeftClose className="size-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto px-1 py-1">
        <DirTree
          workspaceId={workspaceId}
          dirPath="."
          depth={0}
          expandedDirs={expandedDirs}
          toggleDir={toggleDir}
          onFileSelect={onFileSelect}
        />
      </div>
    </div>
  )
}

interface DirTreeProps {
  workspaceId: string
  dirPath: string
  depth: number
  expandedDirs: Set<string>
  toggleDir: (path: string) => void
  onFileSelect?: (path: string) => void
}

function DirTree({ workspaceId, dirPath, depth, expandedDirs, toggleDir, onFileSelect }: DirTreeProps) {
  const isExpanded = expandedDirs.has(dirPath)
  const { data, isLoading } = useQuery({
    queryKey: ['workspace-files', workspaceId, dirPath],
    queryFn: () => listWorkspaceFilesFn({ data: { workspaceId, dirPath } }),
    enabled: isExpanded,
  })

  if (!isExpanded) return null

  return (
    <div>
      {isLoading && (
        <div className="px-2 py-1 text-xs text-white/30" style={{ paddingLeft: depth * 12 + 8 }}>
          Loading...
        </div>
      )}
      {data?.files.map((entry: FileEntry) => (
        <div key={entry.path}>
          <button
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-white/5"
            style={{ paddingLeft: depth * 12 + 8 }}
            onClick={() => entry.isDirectory ? toggleDir(entry.path) : onFileSelect?.(entry.path)}
          >
            {entry.isDirectory ? (
              <>
                {expandedDirs.has(entry.path) ? (
                  <ChevronDown className="size-3 shrink-0 text-white/40" />
                ) : (
                  <ChevronRight className="size-3 shrink-0 text-white/40" />
                )}
                {expandedDirs.has(entry.path) ? (
                  <FolderOpen className="size-4 shrink-0 text-blue-400/70" />
                ) : (
                  <Folder className="size-4 shrink-0 text-blue-400/70" />
                )}
              </>
            ) : (
              <>
                <span className="w-3" />
                <File className="size-4 shrink-0 text-white/40" />
              </>
            )}
            <span className="truncate">{entry.name}</span>
          </button>
          {entry.isDirectory && expandedDirs.has(entry.path) && (
            <DirTree
              workspaceId={workspaceId}
              dirPath={entry.path}
              depth={depth + 1}
              expandedDirs={expandedDirs}
              toggleDir={toggleDir}
              onFileSelect={onFileSelect}
            />
          )}
        </div>
      ))}
    </div>
  )
}
