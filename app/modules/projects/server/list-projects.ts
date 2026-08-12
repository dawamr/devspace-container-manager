import { createServerFn } from '@tanstack/react-start'
import { listProjectsService } from '../domain/project-service'

export const listProjectsFn = createServerFn({ method: 'GET' }).handler(async () => {
  return await listProjectsService()
})
