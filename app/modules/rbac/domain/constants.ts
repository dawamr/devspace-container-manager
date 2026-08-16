export const ROLE_NAMES = {
  ADMIN: 'admin',
  DEVELOPER: 'developer',
  VIEWER: 'viewer',
} as const

export const RESOURCES = {
  USERS: 'users',
  PROJECTS: 'projects',
  ENVIRONMENTS: 'environments',
  STACKS: 'stacks',
  CONTAINERS: 'containers',
  LOGS: 'logs',
  WORKSPACES: 'workspaces',
} as const

export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  ASSIGN: 'assign',
} as const

export type Resource = (typeof RESOURCES)[keyof typeof RESOURCES]
export type Action = (typeof ACTIONS)[keyof typeof ACTIONS]
