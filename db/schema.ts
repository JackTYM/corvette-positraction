import { sql } from 'drizzle-orm'
import {
  pgTable, uuid, text, integer, numeric, boolean, date, timestamp, jsonb, index,
} from 'drizzle-orm/pg-core'
import { crudPolicy, authenticatedRole, authUid } from 'drizzle-orm/neon'

export const items = pgTable(
  'items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().default(sql`auth.user_id()`),
    title: text('title').notNull(),
    sub: text('sub'),
    category: text('category'),
    generation: text('generation'),
    year: integer('year'),
    scale: text('scale'),
    maker: text('maker'),
    acquired: date('acquired'),
    pricePaid: numeric('price_paid', { precision: 12, scale: 2 }),
    value: numeric('value', { precision: 12, scale: 2 }),
    condition: text('condition'),
    location: text('location'),
    story: text('story'),
    featured: boolean('featured').notNull().default(false),
    colorName: text('color_name'),
    colorHex: text('color_hex'),
    imgKey: text('img_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('items_user_id_idx').on(table.userId, table.createdAt),
    crudPolicy({
      role: authenticatedRole,
      read: authUid(table.userId),
      modify: authUid(table.userId),
    }),
  ],
).enableRLS()

export const walls = pgTable(
  'walls',
  {
    userId: text('user_id').primaryKey().default(sql`auth.user_id()`),
    cases: jsonb('cases').notNull().default(sql`'[]'::jsonb`),
    itemOrder: jsonb('item_order').notNull().default(sql`'[]'::jsonb`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    crudPolicy({
      role: authenticatedRole,
      read: authUid(table.userId),
      modify: authUid(table.userId),
    }),
  ],
).enableRLS()
