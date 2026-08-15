import { createServerFn } from '@tanstack/react-start'
import { createEnvironmentService, environmentCreateSchema } from '../domain/environment-service'

export const createEnvironmentFn = createServerFn({ method: 'POST' })
  .validator(environmentCreateSchema)
  .handler(async ({ data }) => {
    return await createEnvironmentService(data)
  })
