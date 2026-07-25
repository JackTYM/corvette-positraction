import { sql } from 'drizzle-orm'
import {
  pgTable, uuid, text, integer, smallint, numeric, boolean, date, timestamp, jsonb, index, unique, check,
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
    valueAsOf: date('value_as_of'),
    valueSource: text('value_source'),
    productionDate: date('production_date'),
    rarity: smallint('rarity'),
    condition: text('condition'),
    location: text('location'),
    story: text('story'),
    featured: boolean('featured').notNull().default(false),
    colorName: text('color_name'),
    colorHex: text('color_hex'),
    imgKey: text('img_key'),
    attributes: jsonb('attributes').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('items_user_id_idx').on(table.userId, table.createdAt),
    check('items_rarity_range', sql`${table.rarity} is null or (${table.rarity} >= 1 and ${table.rarity} <= 3)`),
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

export const itemLinks = pgTable(
  'item_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().default(sql`auth.user_id()`),
    itemId: uuid('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
    linkedItemId: uuid('linked_item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('item_links_item_id_idx').on(table.itemId),
    index('item_links_linked_item_id_idx').on(table.linkedItemId),
    unique('item_links_pair_unique').on(table.itemId, table.linkedItemId),
    check('item_links_no_self_link', sql`${table.itemId} <> ${table.linkedItemId}`),
    crudPolicy({
      role: authenticatedRole,
      read: authUid(table.userId),
      modify: authUid(table.userId),
    }),
  ],
).enableRLS()

export const itemDocuments = pgTable(
  'item_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().default(sql`auth.user_id()`),
    itemId: uuid('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    filename: text('filename').notNull(),
    mimeType: text('mime_type').notNull(),
    size: integer('size').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('item_documents_item_id_idx').on(table.itemId),
    crudPolicy({
      role: authenticatedRole,
      read: authUid(table.userId),
      modify: authUid(table.userId),
    }),
  ],
).enableRLS()
