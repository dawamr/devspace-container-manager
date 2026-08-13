import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createUserFn } from '../server/create-user'
import { updateUserFn } from '../server/update-user'
import { RoleSelect } from './role-select'
import { captureEvent } from '#/shared/lib/posthog'
import { Button } from '#/shared/ui/button'
import { Input } from '#/shared/ui/input'
import { Label } from '#/shared/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/shared/ui/select'

type UserFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: {
    id: string
    email: string
    name: string
    roleId: string
    isActive: boolean
  } | null
}

type FormState = {
  email: string
  password: string
  name: string
  roleId: string
  isActive: boolean
}

const emptyForm: FormState = {
  email: '',
  password: '',
  name: '',
  roleId: '',
  isActive: true,
}

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const isEdit = !!user
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (user) {
      setForm({
        email: user.email,
        password: '',
        name: user.name,
        roleId: user.roleId,
        isActive: user.isActive,
      })
    } else {
      setForm(emptyForm)
    }
    setError(null)
  }, [user, open])

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        await updateUserFn({
          data: {
            id: user!.id,
            email: form.email,
            name: form.name,
            roleId: form.roleId,
            isActive: form.isActive,
          },
        })
      } else {
        await createUserFn({
          data: {
            email: form.email,
            password: form.password,
            name: form.name,
            roleId: form.roleId,
          },
        })
      }
    },
    onSuccess: () => {
      if (isEdit) {
        captureEvent('admin_user_updated', { userId: user!.id })
      } else {
        captureEvent('admin_user_created', { roleId: form.roleId })
      }
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
    },
    onError: (e: Error) => {
      setError(e.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit User' : 'Tambah User'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Ubah data user.' : 'Buat user baru dengan akses role.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nama</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          {!isEdit && (
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label>Role</Label>
            <RoleSelect
              value={form.roleId}
              onValueChange={(v) => setForm((f) => ({ ...f, roleId: v }))}
            />
          </div>
          {isEdit && (
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={form.isActive ? 'active' : 'inactive'}
                onValueChange={(v) => setForm((f) => ({ ...f, isActive: v === 'active' }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Buat'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
