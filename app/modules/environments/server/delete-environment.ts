import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { deleteEnvironmentService } from '../domain/environment-service'

const deleteInput = z.object({ id: z.string().uuid() })

export const deleteEnvironmentFn = createServerFn({ method: 'POST' })
  .validator(deleteInput)
  .handler(async ({ data }) => {
    return await deleteEnvironmentService(data.id)
  })
