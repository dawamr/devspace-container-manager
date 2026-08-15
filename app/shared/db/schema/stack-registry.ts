import { pgTable, uuid, varchar, integer, boolean, timestamp, text, unique } from 'drizzle-orm/pg-core'
import { environments } from './environments'
import { projects } from './projects'
import { containerRegistry } from './container-registry'

export const stackRegistry = pgTable(
  'stack_registry',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    environmentId: uuid('environment_id')
      .references(() => environments.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    containerCount: integer('container_count').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    type: varchar('type', { length: 20 }).default('auto').notNull(),
    description: text('description'),
    color: varchar('color', { length: 7 }),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.name, t.environmentId)],
)

export const stackContainerAssignments = pgTable(
  'stack_container_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    stackId: uuid('stack_id')
      .references(() => stackRegistry.id, { onDelete: 'cascade' })
      .notNull(),
    containerId: uuid('container_id')
      .references(() => containerRegistry.id, { onDelete: 'cascade' })
      .notNull(),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.stackId, t.containerId)],
)
