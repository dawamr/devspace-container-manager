import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listRolesFn } from '../server/list-roles'
import { deleteRoleFn } from '../server/delete-role'
import { RoleFormDialog } from './role-form-dialog'
import { PermissionMatrix } from './permission-matrix'
import { Button } from '#/shared/ui/button'
import { Badge } from '#/shared/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/shared/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/shared/ui/dialog'
import { Plus, Pencil, Trash2, Settings2 } from 'lucide-react'
import { captureEvent } from '#/shared/lib/posthog'

type Role = Awaited<ReturnType<typeof listRolesFn>>[number]

export function RolesTable() {
  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => listRolesFn(),
  })
  const [formOpen, setFormOpen] = useState(false)
  const [editRole, setEditRole] = useState<Role | null>(null)
  const [permRole, setPermRole] = useState<Role | null>(null)
  const [deleteRole, setDeleteRole] = useState<Role | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    captureEvent('admin_roles_viewed')
  }, [])

  const deleteMutation = useMutation({
    mutationFn: () => deleteRoleFn({ data: { id: deleteRole!.id } }),
    onSuccess: () => {
      captureEvent('admin_role_deleted', { roleId: deleteRole!.id })
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setDeleteRole(null)
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button
          onClick={() => {
            setEditRole(null)
            setFormOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Tambah Role
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Users</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Memuat...
                </TableCell>
              </TableRow>
            ) : roles?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Tidak ada role
                </TableCell>
              </TableRow>
            ) : (
              roles?.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {role.name}
                      {role.isSystem && <Badge variant="secondary">System</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {role.description ?? '—'}
                  </TableCell>
                  <TableCell>{role.permissionCount}</TableCell>
                  <TableCell>{role.userCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPermRole(role)}
                        title="Edit Permissions"
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditRole(role)
                          setFormOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteRole(role)}
                        className="text-destructive"
                        disabled={role.isSystem}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <RoleFormDialog open={formOpen} onOpenChange={setFormOpen} role={editRole} />
      <PermissionMatrix open={!!permRole} onOpenChange={() => setPermRole(null)} role={permRole} />

      {deleteRole && (
        <Dialog open onOpenChange={() => setDeleteRole(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Hapus Role?</DialogTitle>
              <DialogDescription>
                Role <strong>{deleteRole.name}</strong> akan dihapus permanen.
              </DialogDescription>
            </DialogHeader>
            {deleteMutation.error && (
              <p className="text-sm text-destructive">{deleteMutation.error.message}</p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteRole(null)}>
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
