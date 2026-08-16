import { pgTable, uuid, varchar, timestamp, unique } from 'drizzle-orm/pg-core'
import { containerRegistry } from './container-registry'
import { users } from './auth'

export const containerAssignments = pgTable(
  'container_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    containerRegistryId: uuid('container_registry_id')
      .references(() => containerRegistry.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    role: varchar('role', { length: 20 }).default('operator').notNull(),
    assignedBy: uuid('assigned_by')
      .references(() => users.id)
      .notNull(),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.containerRegistryId, t.userId)],
)
