import { createServerFn } from '@tanstack/react-start'
import { logout } from '../domain/auth-service'

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  await logout()
  return { success: true }
})
