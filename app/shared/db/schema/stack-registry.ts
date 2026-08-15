import { pgTable, uuid, varchar, integer, boolean, timestamp, unique } from 'drizzle-orm/pg-core'
import { environments } from './environments'
import { projects } from './projects'

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
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.name, t.environmentId)],
)
