import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  PORTAINER_URL: z.string().url(),
  PORTAINER_API_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
})

export const env = envSchema.parse(process.env)
