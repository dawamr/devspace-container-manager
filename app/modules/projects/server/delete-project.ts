import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { deleteProjectService } from '../domain/project-service'

const deleteInput = z.object({ id: z.string().uuid() })

export const deleteProjectFn = createServerFn({ method: 'POST' })
  .validator(deleteInput)
  .handler(async ({ data }) => {
    return await deleteProjectService(data.id)
  })
