import { z } from 'zod'
import {
  listUsers,
  findUserByIdWithRole,
  emailExists,
  createUser,
  updateUser,
  deleteUser,
  countActiveAdmins,
  type CreateUserInput,
  type UpdateUserInput,
} from '../infrastructure/user-repository'

export const createUserSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  name: z.string().min(1, 'Nama wajib diisi').max(100),
  roleId: z.string().uuid('Role ID tidak valid'),
})

export const updateUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
  roleId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
})

export type UserListItem = Awaited<ReturnType<typeof listUsers>>[number]

export async function getUsers() {
  return listUsers()
}

export async function getUserById(id: string) {
  const user = await findUserByIdWithRole(id)
  if (!user) throw new Error('NOT_FOUND')
  return user
}

export async function createNewUser(input: CreateUserInput, _currentUserId: string) {
  const exists = await emailExists(input.email)
  if (exists) throw new Error('Email sudah digunakan')
  const userId = await createUser(input)
  return userId
}

export async function updateExistingUser(input: UpdateUserInput, currentUserId: string) {
  if (input.email) {
    const exists = await emailExists(input.email, input.id)
    if (exists) throw new Error('Email sudah digunakan')
  }
  await updateUser({ ...input, updatedBy: currentUserId })
}

export async function deleteExistingUser(userId: string, currentUserId: string) {
  if (userId === currentUserId) {
    throw new Error('Tidak bisa menghapus akun sendiri')
  }
  const user = await findUserByIdWithRole(userId)
  if (!user) throw new Error('NOT_FOUND')
  if (user.roleName === 'admin') {
    const adminCount = await countActiveAdmins()
    if (adminCount <= 1) {
      throw new Error('Tidak bisa menghapus admin terakhir')
    }
  }
  await deleteUser(userId)
}
