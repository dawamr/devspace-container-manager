import { createServerFn } from '@tanstack/react-start'
import { getCurrentUser } from '../domain/auth-service'

export const getCurrentUserFn = createServerFn({ method: 'GET' }).handler(async () => {
  return await getCurrentUser()
})
