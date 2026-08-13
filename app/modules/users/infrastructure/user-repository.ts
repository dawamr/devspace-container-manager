import { eq, and, asc, count } from 'drizzle-orm'
import { db } from '#/shared/db/client'
import { users, roles } from '#/shared/db/schema'
import { hashPassword } from '#/shared/lib/crypto'

export type UserWithRole = {
  id: string
  email: string
  name: string
  roleName: string
  roleId: string
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
}

export type CreateUserInput = {
  email: string
  password: string
  name: string
  roleId: string
}

export type UpdateUserInput = {
  id: string
  email?: string
  name?: string
  roleId?: string
  isActive?: boolean
  updatedBy?: string
}

export async function listUsers(): Promise<UserWithRole[]> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      roleId: users.roleId,
      roleName: roles.name,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .orderBy(asc(users.name))
  return rows
}

export async function findUserByIdWithRole(id: string): Promise<UserWithRole | null> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      roleId: users.roleId,
      roleName: roles.name,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function emailExists(email: string, excludeId?: string): Promise<boolean> {
  const conditions = [eq(users.email, email)]
  if (excludeId) {
    conditions.push(eq(users.id, excludeId))
  }
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(...conditions))
    .limit(1)
  return rows.length > 0
}

export async function createUser(input: CreateUserInput): Promise<string> {
  const passwordHash = await hashPassword(input.password)
  const [created] = await db
    .insert(users)
    .values({
      email: input.email,
      passwordHash,
      name: input.name,
      roleId: input.roleId,
    })
    .returning({ id: users.id })
  if (!created) throw new Error('Failed to create user')
  return created.id
}

export async function updateUser(input: UpdateUserInput): Promise<void> {
  const updates: Record<string, unknown> = {}
  if (input.email !== undefined) updates.email = input.email
  if (input.name !== undefined) updates.name = input.name
  if (input.roleId !== undefined) updates.roleId = input.roleId
  if (input.isActive !== undefined) updates.isActive = input.isActive
  if (input.updatedBy !== undefined) updates.updatedBy = input.updatedBy
  updates.updatedAt = new Date()

  await db.update(users).set(updates).where(eq(users.id, input.id))
}

export async function deleteUser(id: string): Promise<void> {
  await db.delete(users).where(eq(users.id, id))
}

export async function countUsersByRole(roleId: string): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.roleId, roleId))
  return result?.count ?? 0
}

export async function countActiveAdmins(): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(roles.name, 'admin'), eq(users.isActive, true)))
  return result?.count ?? 0
}
