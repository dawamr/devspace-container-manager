import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { listEnvironmentsService } from '../domain/environment-service'

const listInput = z.object({ projectId: z.string().uuid() })

export const listEnvironmentsFn = createServerFn({ method: 'GET' })
  .validator(listInput)
  .handler(async ({ data }) => {
    return await listEnvironmentsService(data.projectId)
  })
