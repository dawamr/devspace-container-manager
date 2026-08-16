import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, X, Loader2, Info } from 'lucide-react'

import { listContainerAssigneesFn } from '#/modules/docker/server/list-container-assignees'
import { assignContainerFn } from '#/modules/docker/server/assign-container'
import { unassignContainerFn } from '#/modules/docker/server/unassign-container'
import { listUsersFn } from '#/modules/users/server/list-users'
import { Button } from '#/shared/ui/button'
import { Checkbox } from '#/shared/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/shared/ui/dialog'
import { Input } from '#/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/shared/ui/select'
import { Avatar, AvatarFallback } from '#/shared/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '#/shared/ui/tooltip'
import { cn } from '#/shared/lib/cn'

interface ContainerAssignDialogProps {
  containerRegistryId: string
  containerName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

type AssignRole = 'owner' | 'operator' | 'observer'

const ROLE_OPTIONS: { value: AssignRole; label: string; description: string }[] = [
  { value: 'owner', label: 'Owner', description: 'Responsible for the container. Final say on changes.' },
  { value: 'operator', label: 'Operator', description: 'Day-to-day operations. Start/stop/restart.' },
  { value: 'observer', label: 'Observer', description: 'Read-only visibility. No action authority.' },
]

const ROLE_COLORS: Record<AssignRole, string> = {
  owner: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  operator: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  observer: 'bg-white/10 text-white/50 border-white/10',
}

/** Dialog for assigning/unassigning users to a container. */
export function ContainerAssignDialog({
  containerRegistryId,
  containerName,
  open,
  onOpenChange,
}: ContainerAssignDialogProps) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [roleOverrides, setRoleOverrides] = useState<Map<string, AssignRole>>(new Map())
  const [error, setError] = useState<string | null>(null)

  // Fetch current assignees
  const { data: assignees = [] } = useQuery({
    queryKey: ['container-assignees', containerRegistryId],
    queryFn: () => listContainerAssigneesFn({ data: { containerRegistryId } }),
    enabled: open && !!containerRegistryId,
  })

  // Fetch all active users
  const { data: users = [] } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: () => listUsersFn(),
    enabled: open,
  })

  // Filtered users for search
  const filteredUsers = useMemo(() => {
    if (!search) return users.filter((u) => u.isActive)
    const q = search.toLowerCase()
    return users.filter(
      (u) =>
        u.isActive &&
        (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
    )
  }, [users, search])

  // Current assignee IDs for marking
  const assigneeMap = useMemo(
    () => new Map(assignees.map((a) => [a.userId, a])),
    [assignees],
  )

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['container-assignees', containerRegistryId] })
    queryClient.invalidateQueries({ queryKey: ['containers'] })
  }

  const assignMutation = useMutation({
    mutationFn: async (params: { assignments: Array<{ userId: string; role: AssignRole }> }) =>
      assignContainerFn({
        data: {
          containerRegistryId,
          assignments: params.assignments,
        },
      }),
    onSuccess: () => {
      setError(null)
      setSelectedIds(new Set())
      setRoleOverrides(new Map())
      invalidate()
    },
    onError: (err) => setError(err instanceof Error ? err.message : String(err)),
  })

  const unassignMutation = useMutation({
    mutationFn: async (userId: string) =>
      unassignContainerFn({ data: { containerRegistryId, userId } }),
    onSuccess: () => {
      setError(null)
      invalidate()
    },
    onError: (err) => setError(err instanceof Error ? err.message : String(err)),
  })

  // Re-assign with a different role (upsert handles update)
  const changeRoleMutation = useMutation({
    mutationFn: async (params: { userId: string; role: AssignRole }) =>
      assignContainerFn({
        data: {
          containerRegistryId,
          assignments: [{ userId: params.userId, role: params.role }],
        },
      }),
    onSuccess: () => {
      setError(null)
      invalidate()
    },
    onError: (err) => setError(err instanceof Error ? err.message : String(err)),
  })

  const toggleUser = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  // Fix: send per-user roles, not a single role for all
  const handleAssign = () => {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    const assignments = ids.map((userId) => ({
      userId,
      role: roleOverrides.get(userId) ?? ('operator' as AssignRole),
    }))
    assignMutation.mutate({ assignments })
  }

  const isPending =
    assignMutation.isPending || unassignMutation.isPending || changeRoleMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Assign Users</DialogTitle>
          <DialogDescription>
            Assign users to <span className="font-medium text-white/80">{containerName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Role info banner */}
        <div className="flex items-start gap-2 rounded-md border border-[var(--glass-border)] bg-white/5 px-3 py-2">
          <Info className="mt-0.5 size-3.5 shrink-0 text-white/40" />
          <p className="text-xs leading-relaxed text-white/50">
            Roles are <span className="font-medium text-white/70">metadata</span> for ops tracking,
            not access control. Access is managed by project membership &amp; RBAC.
          </p>
        </div>

        {/* Current assignees */}
        {assignees.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-white/40">
              Current Assignees
            </p>
            <div className="space-y-1.5">
              {assignees.map((a) => (
                <div
                  key={a.userId}
                  className="flex items-center justify-between rounded-md border border-[var(--glass-border)] bg-white/5 px-3 py-2"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar size="sm">
                      <AvatarFallback>{getInitials(a.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-white/40">{a.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Inline role change for existing assignees */}
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <Select
                          value={a.role}
                          disabled={isPending}
                          onValueChange={(v) =>
                            changeRoleMutation.mutate({
                              userId: a.userId,
                              role: v as AssignRole,
                            })
                          }
                        >
                          <TooltipTrigger asChild>
                            <SelectTrigger size="sm" className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                          </TooltipTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p className="text-xs">
                            {ROLE_OPTIONS.find((r) => r.value === a.role)?.description ?? a.role}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <button
                      type="button"
                      onClick={() => unassignMutation.mutate(a.userId)}
                      disabled={isPending}
                      className="rounded p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
                      aria-label={`Unassign ${a.name}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search and select new users */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-white/40">
            Add Users
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {filteredUsers.map((u) => {
              const isAssignee = assigneeMap.has(u.id)
              const isSelected = selectedIds.has(u.id)
              const selectedRole = roleOverrides.get(u.id) ?? 'operator'

              return (
                <div
                  key={u.id}
                  className={cn(
                    'flex items-center gap-3 rounded-md border px-3 py-2 transition-colors',
                    isAssignee
                      ? 'border-[var(--glass-border-strong)] bg-white/10 opacity-60'
                      : isSelected
                        ? 'border-[var(--glass-border-strong)] bg-white/10'
                        : 'border-[var(--glass-border)] hover:bg-white/5',
                  )}
                >
                  <Checkbox
                    checked={isSelected || isAssignee}
                    disabled={isAssignee || isPending}
                    onCheckedChange={() => toggleUser(u.id)}
                  />
                  <Avatar size="sm">
                    <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-white/40">{u.email}</p>
                  </div>
                  {isAssignee && (
                    <span className="text-xs text-white/30">Already assigned</span>
                  )}
                  {!isAssignee && isSelected && (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <Select
                          value={selectedRole}
                          onValueChange={(v) => {
                            setRoleOverrides((prev) => new Map(prev).set(u.id, v as AssignRole))
                          }}
                        >
                          <TooltipTrigger asChild>
                            <SelectTrigger size="sm" className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                          </TooltipTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p className="text-xs">
                            {ROLE_OPTIONS.find((r) => r.value === selectedRole)?.description}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              )
            })}
            {filteredUsers.length === 0 && (
              <p className="py-4 text-center text-sm text-white/30">
                No users found
              </p>
            )}
          </div>
        </div>

        {/* Role legend */}
        <div className="flex flex-wrap gap-3 rounded-md border border-[var(--glass-border)] bg-white/5 px-3 py-2">
          {ROLE_OPTIONS.map((r) => (
            <div key={r.value} className="flex items-center gap-1.5">
              <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium', ROLE_COLORS[r.value])}>
                {r.label}
              </span>
              <span className="text-[11px] text-white/40">{r.description.split('.')[0]}.</span>
            </div>
          ))}
        </div>

        {error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-white/30">
            {selectedIds.size > 0 && `${selectedIds.size} selected`}
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={selectedIds.size === 0 || isPending}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Assign {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
