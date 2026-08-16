import { pgTable, varchar, text, boolean, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * Key-value store for application settings.
 * Supports categories (e.g. 'agent') and secret flag for API keys.
 */
export const settings = pgTable('settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: text('value').notNull().default(''),
  category: varchar('category', { length: 50 }).notNull().default('general'),
  isSecret: boolean('is_secret').default(false).notNull(),
  updatedBy: uuid('updated_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
