import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listPermissionsFn } from '../server/list-permissions'
import { updateRolePermissionsFn } from '../server/update-role-permissions'
import { getRolePermissionsFn } from '../server/get-role-permissions'
import { captureEvent } from '#/shared/lib/posthog'
import { Button } from '#/shared/ui/button'
import { Checkbox } from '#/shared/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/shared/ui/dialog'

type PermissionMatrixProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: {
    id: string
    name: string
    isSystem: boolean
  } | null
}

const RESOURCES = ['users', 'projects', 'environments', 'stacks', 'containers', 'logs'] as const
const ACTIONS = ['create', 'read', 'update', 'delete'] as const

export function PermissionMatrix({ open, onOpenChange, role }: PermissionMatrixProps) {
  const { data: permissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => listPermissionsFn(),
    enabled: open,
  })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (role && open) {
      getRolePermissionsFn({ data: { roleId: role.id } }).then((ids) => {
        setSelectedIds(new Set(ids))
      })
    }
  }, [role, open])

  const mutation = useMutation({
    mutationFn: () =>
      updateRolePermissionsFn({
        data: { roleId: role!.id, permissionIds: Array.from(selectedIds) },
      }),
    onSuccess: () => {
      captureEvent('admin_permissions_updated', { roleId: role!.id, permissionCount: selectedIds.size })
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      onOpenChange(false)
    },
    onError: (e: Error) => setError(e.message),
  })

  if (!role || !permissions) return null

  const permissionsByResource = new Map<string, { id: string; action: string }[]>()
  for (const perm of permissions) {
    if (!permissionsByResource.has(perm.resource)) {
      permissionsByResource.set(perm.resource, [])
    }
    permissionsByResource.get(perm.resource)!.push({ id: perm.id, action: perm.action })
  }

  const togglePermission = (permId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(permId)) {
        next.delete(permId)
      } else {
        next.add(permId)
      }
      return next
    })
  }

  const toggleResource = (_resource: string, allPerms: { id: string }[]) => {
    const allSelected = allPerms.every((p) => selectedIds.has(p.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const p of allPerms) {
        if (allSelected) {
          next.delete(p.id)
        } else {
          next.add(p.id)
        }
      }
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Permission Matrix — {role.name}</DialogTitle>
          <DialogDescription>
            Centang permission yang ingin diberikan ke role ini.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--glass-border)]">
                <th className="py-2 pr-4 text-left font-medium">Resource</th>
                {ACTIONS.map((action) => (
                  <th key={action} className="px-3 py-2 text-center font-medium capitalize">
                    {action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RESOURCES.map((resource) => {
                const perms = permissionsByResource.get(resource) ?? []
                const allSelected = perms.length > 0 && perms.every((p) => selectedIds.has(p.id))
                return (
                  <tr key={resource} className="border-b border-[var(--glass-border)] last:border-0">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={() => toggleResource(resource, perms)}
                        />
                        <span className="capitalize">{resource}</span>
                      </div>
                    </td>
                    {ACTIONS.map((action) => {
                      const perm = perms.find((p) => p.action === action)
                      return (
                        <td key={action} className="px-3 py-2 text-center">
                          {perm ? (
                            <Checkbox
                              checked={selectedIds.has(perm.id)}
                              onCheckedChange={() => togglePermission(perm.id)}
                            />
                          ) : (
                            <span className="text-white/60">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Menyimpan...' : 'Simpan Permission'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
