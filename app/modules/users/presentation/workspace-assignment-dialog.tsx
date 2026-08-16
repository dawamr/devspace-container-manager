import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Search, Save, CheckCircle2 } from 'lucide-react'
import { Button } from '#/shared/ui/button'
import { Input } from '#/shared/ui/input'
import { Badge } from '#/shared/ui/badge'
import { Checkbox } from '#/shared/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/shared/ui/dialog'
import { listAllWorkspacesFn, type WorkspaceListItem } from '#/modules/agent/server/list-all-workspaces'
import { listUserWorkspaceAssignmentsFn } from '#/modules/agent/server/list-user-workspace-assignments'
import { updateUserWorkspacesFn } from '#/modules/agent/server/update-user-workspaces'

interface WorkspaceAssignmentDialogProps {
  userId: string
  userName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WorkspaceAssignmentDialog({
  userId,
  userName,
  open,
  onOpenChange,
}: WorkspaceAssignmentDialogProps) {
  const queryClient = useQueryClient()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [saved, setSaved] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Fetch all workspaces
  const { data: allWorkspacesData, isLoading: isLoadingWorkspaces } = useQuery({
    queryKey: ['all-workspaces'],
    queryFn: () => listAllWorkspacesFn({ data: {} }),
    enabled: open,
  })

  // Fetch user's current assignments
  const { data: assignmentsData, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['user-workspace-assignments', userId],
    queryFn: () => listUserWorkspaceAssignmentsFn({ data: { userId } }),
    enabled: open,
  })

  // Initialize selectedIds from server data (once per open)
  useEffect(() => {
    if (assignmentsData && !initialized) {
      setSelectedIds(new Set(assignmentsData.workspaceIds))
      setInitialized(true)
    }
  }, [assignmentsData, initialized])

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set())
      setSearch('')
      setSaved(false)
      setInitialized(false)
    }
  }, [open])

  const mutation = useMutation({
    mutationFn: (ids: string[]) =>
      updateUserWorkspacesFn({ data: { userId, workspaceIds: ids } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-workspace-assignments', userId] })
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        onOpenChange(false)
      }, 1500)
    },
  })

  const filteredWorkspaces = useMemo(() => {
    const list = allWorkspacesData?.workspaces ?? []
    if (!search) return list
    return list.filter((w) =>
      w.name.toLowerCase().includes(search.toLowerCase()),
    )
  }, [allWorkspacesData, search])

  const handleToggle = (workspaceId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(workspaceId)) {
        next.delete(workspaceId)
      } else {
        next.add(workspaceId)
      }
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(Array.from(selectedIds))
  }

  const isLoading = isLoadingWorkspaces || isLoadingAssignments

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Workspaces — {userName}</DialogTitle>
          <DialogDescription>
            Pilih workspace yang dapat diakses oleh user ini.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-white/40" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
              <Input
                placeholder="Cari workspace..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                variant="glass"
                className="pl-9"
              />
            </div>

            {/* Workspace list */}
            <div className="max-h-[400px] overflow-y-auto rounded-[var(--glass-radius-sm)] border border-[var(--glass-border)]">
              {filteredWorkspaces.length === 0 ? (
                <div className="p-6 text-center text-sm text-white/60">
                  Tidak ada workspace
                </div>
              ) : (
                filteredWorkspaces.map((ws: WorkspaceListItem) => (
                  <label
                    key={ws.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-[var(--glass-border)] px-4 py-3 last:border-b-0 transition-colors hover:bg-white/5"
                  >
                    <Checkbox
                      checked={selectedIds.has(ws.id)}
                      onCheckedChange={() => handleToggle(ws.id)}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{ws.name}</span>
                        {!ws.isActive && (
                          <Badge variant="outline" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <span>{ws.projectName}</span>
                        <span>·</span>
                        <span>{ws.environmentName}</span>
                        {ws.containerName && (
                          <>
                            <span>·</span>
                            <span className="truncate">{ws.containerName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>

            {/* Error */}
            {mutation.isError && (
              <p className="text-sm text-red-400">
                Error: {mutation.error instanceof Error ? mutation.error.message : 'Unknown error'}
              </p>
            )}

            {/* Footer */}
            <DialogFooter>
              {saved && (
                <span className="flex items-center gap-1.5 text-sm text-green-400">
                  <CheckCircle2 className="size-4" />
                  Assignments saved
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save Assignments
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
