import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  DOCKER_HOST: z.string().default('unix:///var/run/docker.sock'),
  DOCKER_CERT_PATH: z.string().optional(),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
  // LLM config now read from DB settings table; env vars kept as fallback only
  LLM_API_KEY: z.string().default(''),
  LLM_MODEL: z.string().default('gpt-4o'),
  LLM_BASE_URL: z.string().default(''),
  AGENT_TOKEN_BUDGET: z.coerce.number().default(50000),
  AGENT_TOOL_LIMIT: z.coerce.number().default(50),
})

export const env = envSchema.parse(process.env)
