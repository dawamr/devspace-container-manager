import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { login } from '../domain/auth-service'

const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const loginFn = createServerFn({ method: 'POST' })
  .validator(loginInput)
  .handler(async ({ data }) => {
    const { email, password } = data
    const user = await login(email, password)
    return { success: true, user }
  })
