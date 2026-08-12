import { verifyPassword } from '#/shared/lib/crypto'
import {
  findUserByEmail,
  findUserById,
  findSessionById,
  insertSession,
  deleteSessionById,
  touchSessionExpiry,
  updateLastLogin,
  deleteExpiredSessions,
} from '../infrastructure/user-repository'
import {
  getSessionIdFromCookie,
  setSessionCookie,
  clearSessionCookie,
  getSessionExpiry,
} from './session'

export type AuthUser = {
  id: string
  email: string
  name: string
  roleName: string
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const user = await findUserByEmail(email)
  if (!user) throw new Error('Email atau password salah')
  if (!user.isActive) throw new Error('Akun dinonaktifkan')

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) throw new Error('Email atau password salah')

  const expiresAt = getSessionExpiry()
  const sessionId = await insertSession(user.id, expiresAt)
  if (!sessionId) throw new Error('Gagal membuat session')

  setSessionCookie(sessionId)
  await updateLastLogin(user.id)
  await deleteExpiredSessions()

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roleName: user.roleName,
  }
}

export async function logout() {
  const sessionId = getSessionIdFromCookie()
  if (sessionId) {
    await deleteSessionById(sessionId)
  }
  clearSessionCookie()
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const sessionId = getSessionIdFromCookie()
  if (!sessionId) return null

  const session = await findSessionById(sessionId)
  if (!session) return null

  if (session.expiresAt < new Date()) {
    await deleteSessionById(sessionId)
    return null
  }

  await touchSessionExpiry(sessionId, getSessionExpiry())

  const user = await findUserById(session.userId)
  if (!user || !user.isActive) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roleName: user.roleName,
  }
}
