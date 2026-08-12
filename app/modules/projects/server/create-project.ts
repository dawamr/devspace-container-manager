import { createServerFn } from '@tanstack/react-start'
import { createProjectService, projectCreateSchema } from '../domain/project-service'

export const createProjectFn = createServerFn({ method: 'POST' })
  .validator(projectCreateSchema)
  .handler(async ({ data }) => {
    return await createProjectService(data)
  })
