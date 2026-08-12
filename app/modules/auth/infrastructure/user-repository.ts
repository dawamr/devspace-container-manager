import { eq, lt } from 'drizzle-orm'
import { db } from '#/shared/db/client'
import { users, sessions, roles } from '#/shared/db/schema'

export type UserWithRole = {
  id: string
  email: string
  name: string
  isActive: boolean
  roleId: string
  roleName: string
}

export async function findUserByEmail(email: string) {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      name: users.name,
      roleId: users.roleId,
      roleName: roles.name,
      isActive: users.isActive,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.email, email))
    .limit(1)
  return rows[0] ?? null
}

export async function findUserById(id: string) {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      roleId: users.roleId,
      roleName: roles.name,
      isActive: users.isActive,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function findSessionById(sessionId: string) {
  const rows = await db
    .select({
      sessionId: sessions.id,
      userId: sessions.userId,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1)
  return rows[0] ?? null
}

export async function insertSession(userId: string, expiresAt: Date) {
  const [row] = await db
    .insert(sessions)
    .values({ userId, expiresAt })
    .returning({ id: sessions.id })
  return row?.id ?? null
}

export async function deleteSessionById(sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId))
}

export async function deleteExpiredSessions() {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()))
}

export async function touchSessionExpiry(sessionId: string, expiresAt: Date) {
  await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, sessionId))
}

export async function updateLastLogin(userId: string) {
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId))
}
