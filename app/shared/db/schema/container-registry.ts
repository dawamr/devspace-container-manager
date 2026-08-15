import { pgTable, uuid, varchar, boolean, timestamp, unique } from 'drizzle-orm/pg-core'
import { environments } from './environments'
import { projects } from './projects'

export const containerRegistry = pgTable(
  'container_registry',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    containerId: varchar('container_id', { length: 64 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    image: varchar('image', { length: 255 }).notNull(),
    environmentId: uuid('environment_id')
      .references(() => environments.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    stackName: varchar('stack_name', { length: 255 }),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
    isActive: boolean('is_active').default(true).notNull(),
  },
  (t) => [unique().on(t.containerId, t.environmentId)],
)
