import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core'
import { projects } from './projects'

export const environments = pgTable('environments', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  dockerHost: varchar('docker_host', { length: 255 }).notNull(),
  dockerCertPath: varchar('docker_cert_path', { length: 255 }),
  tlsEnabled: boolean('tls_enabled').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
