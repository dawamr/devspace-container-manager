import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createRoleFn } from '../server/create-role'
import { updateRoleFn } from '../server/update-role'
import { captureEvent } from '#/shared/lib/posthog'
import { Button } from '#/shared/ui/button'
import { Input } from '#/shared/ui/input'
import { Label } from '#/shared/ui/label'
import { Textarea } from '#/shared/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/shared/ui/dialog'

type RoleFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  role?: {
    id: string
    name: string
    description: string | null
    isSystem: boolean
  } | null
}

type FormState = {
  name: string
  description: string
}

export function RoleFormDialog({ open, onOpenChange, role }: RoleFormDialogProps) {
  const isEdit = !!role
  const [form, setForm] = useState<FormState>({ name: '', description: '' })
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (role) {
      setForm({ name: role.name, description: role.description ?? '' })
    } else {
      setForm({ name: '', description: '' })
    }
    setError(null)
  }, [role, open])

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        await updateRoleFn({
          data: {
            id: role!.id,
            name: form.name,
            description: form.description || null,
          },
        })
      } else {
        await createRoleFn({
          data: {
            name: form.name,
            description: form.description || undefined,
          },
        })
      }
    },
    onSuccess: () => {
      if (isEdit) {
        captureEvent('admin_role_updated', { roleId: role!.id })
      } else {
        captureEvent('admin_role_created', { roleName: form.name })
      }
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      onOpenChange(false)
    },
    onError: (e: Error) => setError(e.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Role' : 'Tambah Role'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Ubah data role.'
              : 'Buat role baru untuk mengatur akses permission.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nama Role</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={isEdit && role?.isSystem}
              required
              placeholder="contoh: editor"
            />
            {isEdit && role?.isSystem && (
              <p className="text-xs text-white/60">System role tidak bisa diubah namanya</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Deskripsi singkat role"
              rows={3}
            />
          </div>
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
