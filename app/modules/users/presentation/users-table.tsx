import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listUsersFn } from '../server/list-users'
import { deleteUserFn } from '../server/delete-user'
import { UserFormDialog } from './user-form-dialog'
import { WorkspaceAssignmentDialog } from './workspace-assignment-dialog'
import { Button } from '#/shared/ui/button'
import { Badge } from '#/shared/ui/badge'
import { Input } from '#/shared/ui/input'
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
import { Plus, Search, Pencil, Trash2, FolderCog } from 'lucide-react'
import { captureEvent } from '#/shared/lib/posthog'

type User = Awaited<ReturnType<typeof listUsersFn>>[number]

export function UsersTable() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => listUsersFn(),
  })
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [assignmentUser, setAssignmentUser] = useState<{ id: string; name: string } | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    captureEvent('admin_users_viewed')
  }, [])

  const deleteMutation = useMutation({
    mutationFn: () => deleteUserFn({ data: { id: deleteId! } }),
    onSuccess: () => {
      captureEvent('admin_user_deleted', { userId: deleteId })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeleteId(null)
    },
  })

  const filtered = users?.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
          <Input
            placeholder="Cari user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            variant="glass"
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => {
            setEditUser(null)
            setDialogOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Tambah User
        </Button>
      </div>

      <div className="rounded-[var(--glass-radius-sm)] border border-[var(--glass-border)] bg-[var(--glass-surface)] backdrop-blur-[var(--glass-blur)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-white/60">
                  Memuat...
                </TableCell>
              </TableRow>
            ) : filtered?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-white/60">
                  Tidak ada user
                </TableCell>
              </TableRow>
            ) : (
              filtered?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.roleName === 'admin' ? 'default' : 'secondary'}>
                      {user.roleName}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'outline'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white/60">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Manage Workspaces"
                        onClick={() => setAssignmentUser({ id: user.id, name: user.name })}
                      >
                        <FolderCog className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditUser(user)
                          setDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(user.id)}
                        className="text-destructive"
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

      <UserFormDialog open={dialogOpen} onOpenChange={setDialogOpen} user={editUser} />

      {deleteId && (
        <Dialog open onOpenChange={(o) => !o && setDeleteId(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Hapus User?</DialogTitle>
              <DialogDescription>
                Tindakan ini tidak dapat dibatalkan. User akan dihapus permanen.
              </DialogDescription>
            </DialogHeader>
            {deleteMutation.error && (
              <p className="text-sm text-destructive">{deleteMutation.error.message}</p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleteMutation.isPending}>
                Batal
              </Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {assignmentUser && (
        <WorkspaceAssignmentDialog
          userId={assignmentUser.id}
          userName={assignmentUser.name}
          open={!!assignmentUser}
          onOpenChange={(o) => !o && setAssignmentUser(null)}
        />
      )}
    </div>
  )
}
