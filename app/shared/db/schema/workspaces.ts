import { pgTable, uuid, varchar, boolean, timestamp, integer, unique } from 'drizzle-orm/pg-core'
import { projects } from './projects'
import { environments } from './environments'
import { containerRegistry } from './container-registry'
import { users } from './auth'

export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    environmentId: uuid('environment_id')
      .references(() => environments.id, { onDelete: 'cascade' })
      .notNull(),
    containerRegistryId: uuid('container_registry_id')
      .references(() => containerRegistry.id, { onDelete: 'set null' }),
    rootPath: varchar('root_path', { length: 500 }).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdById: uuid('created_by')
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.name, t.environmentId)],
)

export const workspaceMounts = pgTable(
  'workspace_mounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .references(() => workspaces.id, { onDelete: 'cascade' })
      .notNull(),
    hostPath: varchar('host_path', { length: 500 }).notNull(),
    containerPath: varchar('container_path', { length: 500 }).notNull(),
    isReadOnly: boolean('is_read_only').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.workspaceId, t.hostPath)],
)

export const workspaceAssignments = pgTable(
  'workspace_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .references(() => workspaces.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    role: varchar('role', { length: 20 }).default('developer').notNull(),
    assignedBy: uuid('assigned_by')
      .references(() => users.id)
      .notNull(),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.workspaceId, t.userId)],
)

export const agentSessions = pgTable('agent_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id')
    .references(() => workspaces.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  containerRegistryId: uuid('container_registry_id')
    .references(() => containerRegistry.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  toolCallCount: integer('tool_call_count').default(0).notNull(),
  tokenUsage: integer('token_usage').default(0).notNull(),
  tokenBudget: integer('token_budget').default(50000).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
})
