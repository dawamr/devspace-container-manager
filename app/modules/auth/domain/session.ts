import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server'

const SESSION_COOKIE_NAME = 'devspace_sid'
const SESSION_TTL_DAYS = 7

export function getSessionIdFromCookie(): string | undefined {
  return getCookie(SESSION_COOKIE_NAME)
}

export function setSessionCookie(sessionId: string) {
  setCookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  })
}

export function clearSessionCookie() {
  deleteCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
}

export function getSessionExpiry(): Date {
  const d = new Date()
  d.setDate(d.getDate() + SESSION_TTL_DAYS)
  return d
}
