import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  DOCKER_HOST: z.string().default('unix:///var/run/docker.sock'),
  DOCKER_CERT_PATH: z.string().optional(),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
})

export const env = envSchema.parse(process.env)
