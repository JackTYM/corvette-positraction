# Expand Categories & Item Attributes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the archive from 6 flat categories to 16 richly-attributed categories (JSONB `attributes` per item), add common fields (expanded Est. Value, Production Date, Rarity), bidirectional Linked Entries between items, and file Documents/attachments.

**Architecture:** Category-specific fields live in a new `attributes jsonb` column on `items`, described once per category by a `CATEGORY_FIELDS: Record<Category, FieldDef[]>` map that drives both the Add form and the Detail page ledger. Linked Entries and Documents are separate tables (`item_links`, `item_documents`), both RLS-scoped like `items`/`walls`. Existing top-level columns (`year`, `scale`, `maker`, `generation`) are kept unchanged for backward compat with `wallOps.ts`/`ARRANGE`/the garage feature — each category maps its "primary" year/maker concept onto those columns and only genuinely unique fields go into `attributes`.

**Tech Stack:** Nuxt 4 SPA, Drizzle ORM (schema/migration only) + Neon Data API (runtime), Cloudflare R2 via `aws4fetch`, Vitest.

**User decisions (already made):**
- Hot Wheels folds into Diecast; "Sign" is dropped (no production data exists yet); "Press Photo" becomes "Photo".
- "Production Date" is a single common field (not duplicated per-category).
- Diecast's "Toy #" field keeps that exact label (not renamed to "Production #") — this was an explicit question the user asked; the answer is "Toy #" because that's the real collector term printed on packaging, distinct from the new common "Production Date" field.
- Diecast gets an added "Manufacturer Collector Number" text field (user's explicit follow-up instruction).
- No data migration is needed — no items exist in any production account yet.
- Generation stays C1–C8 (real Corvette generations only go to C8/2020–Now) — the user's spec said "C1-C9" but C9 doesn't exist yet; not inventing a fictitious generation.

---

## Context for every task below

This extends a working, already-merged 22-task app. Key facts every implementer needs:

- **Typecheck command is `npx tsc -b --force`** — this project's `tsconfig.json` is solution-style (`"files": [], "references":[...]`), so `npx tsc --noEmit` is a silent no-op that always exits 0. Never use it.
- **`noUncheckedIndexedAccess: true`** is enabled — `dict[key]` types as `T | undefined`; handle with optional chaining or a documented `!` assertion.
- Runtime data access is **always** through the Neon Data API client (`useNeon()` → `neon.from('table')...`, a PostgREST-style builder: `.select()`, `.eq()`, `.insert()`, `.update()`, `.delete()`, `.upsert()`, `.single()`, `.maybeSingle()`, `.order()`). **Never** use Drizzle's query builder at runtime — Drizzle in this repo is schema-definition/migration tooling only (`db/schema.ts`, `drizzle-kit generate`/`migrate`).
- RLS policies use `crudPolicy({ role: authenticatedRole, read: authUid(table.userId), modify: authUid(table.userId) })` from `drizzle-orm/neon`, exactly as `items`/`walls` already do in `db/schema.ts`.
- The live Neon project/branch is `mute-rice-52151718` / `br-holy-unit-a6lfzlp8` ("production") — use the `mcp__plugin_neon-plugin_neon__run_sql` MCP tool (project `mute-rice-52151718`, database `neondb`) to verify DDL after migrating, never a different/archived project.
- `npm test` runs Vitest (`vitest run`). Existing tests: `app/utils/catalog.test.ts`, `app/utils/wallOps.test.ts`, `app/composables/useItems.test.ts`, `app/composables/useWall.test.ts` — all test **pure functions only** (no network mocking), a pattern every new test in this plan follows.
- Commit after each task with `git commit` (no `--amend`, unsigned is fine per repo convention — `--no-gpg-sign` if a hook prompts).

---

### Task 1: Database schema — new columns, `item_links`, `item_documents`, RLS, migration

**Goal:** Add the 5 new `items` columns and the two new tables to `db/schema.ts`, generate and apply the Drizzle migration, and verify the resulting DDL/RLS on the live Neon branch.

**Files:**
- Modify: `db/schema.ts`
- Create: `db/migrations/0002_*.sql` (auto-named by `drizzle-kit generate`)
- Create: `db/migrations/0003_*_grants.sql` (custom migration for grants, mirroring `0001_triggers-and-grants.sql`)

**Acceptance Criteria:**
- [ ] `items` has new nullable columns: `production_date date`, `value_as_of date`, `value_source text`, `rarity smallint` (CHECK `rarity is null or rarity between 1 and 3`), `attributes jsonb not null default '{}'`.
- [ ] `item_links` table exists: `id uuid pk`, `user_id text not null default auth.user_id()`, `item_id uuid not null references items(id) on delete cascade`, `linked_item_id uuid not null references items(id) on delete cascade`, `created_at timestamptz not null default now()`, unique `(item_id, linked_item_id)`, CHECK `item_id <> linked_item_id`, RLS enabled with `crudPolicy` scoped to `authUid(user_id)`.
- [ ] `item_documents` table exists: `id uuid pk`, `user_id text not null default auth.user_id()`, `item_id uuid not null references items(id) on delete cascade`, `key text not null`, `filename text not null`, `mime_type text not null`, `size integer not null`, `created_at timestamptz not null default now()`, RLS enabled with `crudPolicy` scoped to `authUid(user_id)`.
- [ ] `authenticated` role has `select, insert, update, delete` on both new tables; `anonymous` has nothing (grants migration mirrors `0001_triggers-and-grants.sql`).
- [ ] `npx tsc -b --force` passes with zero errors.

**Verify:** `mcp__plugin_neon-plugin_neon__run_sql` against project `mute-rice-52151718` running `\d items`, `\d item_links`, `\d item_documents` (or equivalent `information_schema` queries) → new columns/tables/policies present exactly as above.

**Steps:**

- [ ] **Step 1: Edit `db/schema.ts`**

Add `smallint`, `unique`, `check` to the pg-core import, and add the new columns to `items` plus the two new tables:

```ts
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
```

- [ ] **Step 2: Generate the migration**

Run: `npm run db:generate`
Expected: a new `db/migrations/0002_*.sql` file containing `ALTER TABLE items ADD COLUMN ...` for the 5 new columns, `CREATE TABLE item_links (...)`, `CREATE TABLE item_documents (...)`, their RLS policies, indexes, unique/check constraints.

- [ ] **Step 3: Write the grants migration**

Run: `npx drizzle-kit generate --custom --name item_links_documents_grants`
Edit the resulting empty file to:

```sql
-- Custom SQL migration file, put your code below! --
grant select, insert, update, delete on public.item_links to authenticated;
grant select, insert, update, delete on public.item_documents to authenticated;

revoke all on public.item_links from anonymous;
revoke all on public.item_documents from anonymous;
```

- [ ] **Step 4: Apply the migrations**

Run: `npm run db:migrate`
Expected: both new migrations apply cleanly against `DATABASE_URL` (the live Neon branch) with no errors.

- [ ] **Step 5: Verify via Neon MCP**

Call `mcp__plugin_neon-plugin_neon__run_sql` (project `mute-rice-52151718`, database `neondb`) with:
```sql
select column_name, data_type from information_schema.columns where table_name = 'items' and column_name in ('production_date','value_as_of','value_source','rarity','attributes');
select tablename, policyname from pg_policies where tablename in ('item_links','item_documents');
```
Expected: 5 rows for the first query, policies present for both new tables in the second.

- [ ] **Step 6: Typecheck and commit**

Run: `npx tsc -b --force` → 0 errors.

```bash
git add db/schema.ts db/migrations
git commit -m "feat: add category attributes, linked entries, and documents to schema"
```

---

### Task 2: `app/utils/catalog.ts` — 16 categories, `CATEGORY_FIELDS`, `CATEGORY_HAS_GENERATION`

**Goal:** Replace the 6-category `Category` union and 3-slot `FIELD_SETS` with the full 16-category union and a `CATEGORY_FIELDS`/`CATEGORY_HAS_GENERATION` schema-driven field system.

**Files:**
- Modify: `app/utils/catalog.ts`
- Modify: `app/utils/catalog.test.ts`

**Acceptance Criteria:**
- [ ] `Category` is the 16-value union: `'DIECAST'|'BROCHURE'|'ADVERTISEMENT'|'BADGE'|'PATCH'|'PHOTO'|'BOOK'|'ART'|'SPECIALTY CAR'|'OTHER COLLECTABLES'|'INSTRUCTIONAL CD'|'MUSIC CD'|'LITHOGRAPHIC TIN'|'MAGAZINE'|'AUTO PART'|'OWNERS MANUAL'`.
- [ ] `CATEGORIES` tone map has all 16 keys.
- [ ] `isCar` returns true only for `DIECAST` and `SPECIALTY CAR`.
- [ ] `FIELD_SETS` is removed; `CATEGORY_HAS_GENERATION: Record<Category, boolean>` and `CATEGORY_FIELDS: Record<Category, FieldDef[]>` are added, covering every category from the user's spec (Diecast's 23 fields including the new "Manufacturer Collector Number"; Specialty Car's 11 fields; etc — full list in Step 3 below).
- [ ] `Item` interface gains `valueAsOf: string`, `valueSource: string`, `productionDate: string`, `rarity: number | null`, `attributes: Record<string, unknown>`.
- [ ] `npx tsc -b --force` passes; `npm test` passes.

**Verify:** `npm test -- catalog` → all tests pass, including a new test asserting `CATEGORY_FIELDS.DIECAST` contains a field with `key: 'manufacturerCollectorNumber'`.

**Steps:**

- [ ] **Step 1: Replace the `Category`/`CATEGORIES`/`Item`/`isCar` section**

In `app/utils/catalog.ts`, replace lines 14-44 and 120-133 (the `Category` type through `Item` interface, and `CAR_CATEGORIES`/`isCar`/`FIELD_SETS`) with:

```ts
export type Category =
  | 'DIECAST' | 'BROCHURE' | 'ADVERTISEMENT' | 'BADGE' | 'PATCH' | 'PHOTO' | 'BOOK' | 'ART'
  | 'SPECIALTY CAR' | 'OTHER COLLECTABLES' | 'INSTRUCTIONAL CD' | 'MUSIC CD' | 'LITHOGRAPHIC TIN'
  | 'MAGAZINE' | 'AUTO PART' | 'OWNERS MANUAL'

export const CATEGORIES: Record<Category, 'orange'|'ink'> = {
  'DIECAST': 'orange', 'BROCHURE': 'ink', 'ADVERTISEMENT': 'orange', 'BADGE': 'ink',
  'PATCH': 'orange', 'PHOTO': 'ink', 'BOOK': 'orange', 'ART': 'ink',
  'SPECIALTY CAR': 'orange', 'OTHER COLLECTABLES': 'ink', 'INSTRUCTIONAL CD': 'orange',
  'MUSIC CD': 'ink', 'LITHOGRAPHIC TIN': 'orange', 'MAGAZINE': 'ink', 'AUTO PART': 'orange',
  'OWNERS MANUAL': 'ink',
}

export interface Item {
  id: string
  title: string
  sub: string
  category: Category
  generation: Generation
  year: number | ''
  scale: string
  maker: string
  acquired: string
  pricePaid: number
  value: number
  valueAsOf: string
  valueSource: string
  productionDate: string
  rarity: number | null
  condition: string
  location: string
  story: string
  featured: boolean
  colorName: string
  colorHex: string
  imgKey: string | null
  attributes: Record<string, unknown>
}
```

(Keep `fmtMoney`, `fmtDate`, `Stats`/`stats`, `colorOf`/`hexToRgb`/`hsl`/`colorKey`, `GEN_ORDER`/`genIndex`, `ARRANGE`/`ARRANGE_LABELS` exactly as they are — untouched by this task.)

- [ ] **Step 2: Replace `CAR_CATEGORIES`/`isCar`/`FIELD_SETS` at the end of the file**

```ts
export const CAR_CATEGORIES: Category[] = ['DIECAST', 'SPECIALTY CAR']
export const isCar = (item: Pick<Item,'category'> | null | undefined): boolean =>
  !!item && CAR_CATEGORIES.includes(item.category)

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox'
export interface FieldDef { key: string; label: string; type: FieldType; options?: string[]; placeholder?: string }

export const CATEGORY_HAS_GENERATION: Record<Category, boolean> = {
  'DIECAST': true, 'BROCHURE': true, 'ADVERTISEMENT': true, 'BADGE': true, 'PATCH': true,
  'PHOTO': true, 'BOOK': true, 'ART': false, 'SPECIALTY CAR': true, 'OTHER COLLECTABLES': false,
  'INSTRUCTIONAL CD': true, 'MUSIC CD': true, 'LITHOGRAPHIC TIN': true, 'MAGAZINE': false,
  'AUTO PART': true, 'OWNERS MANUAL': false,
}
```

- [ ] **Step 3: Add the full `CATEGORY_FIELDS` map**

```ts
export const CATEGORY_FIELDS: Record<Category, FieldDef[]> = {
  'DIECAST': [
    { key: 'castingYear', label: 'Casting Year', type: 'number', placeholder: '1975' },
    { key: 'modelSeries', label: 'Model Series', type: 'text' },
    { key: 'subSeries', label: 'Sub Series', type: 'text' },
    { key: 'toyNumber', label: 'Toy #', type: 'text' },
    { key: 'manufacturerCollectorNumber', label: 'Manufacturer Collector Number', type: 'text' },
    { key: 'primaryColor', label: 'Primary Color', type: 'text' },
    { key: 'tampoColor', label: 'Tampo Color', type: 'text' },
    { key: 'interiorColor', label: 'Interior Color', type: 'text' },
    { key: 'baseColorMat', label: 'Base Color / Mat', type: 'text' },
    { key: 'wheelType', label: 'Wheel Type', type: 'select', options: ['Redline', 'Real Riders', 'Basic Wheels', '5-Spoke', '5-Dot', 'Chrome', 'Other / Custom'] },
    { key: 'wheelTypeOther', label: 'Wheel Type (if Other / Custom)', type: 'text' },
    { key: 'looseOrCard', label: 'Loose / On-Card', type: 'select', options: ['Loose', 'On-Card'] },
    { key: 'bodyStyle', label: 'Coupe / Convertible / Roadster', type: 'select', options: ['Coupe', 'Convertible', 'Roadster'] },
    { key: 'driveType', label: 'Drive / Mechanism Type', type: 'select', options: ['Free-Roll', 'Pull Back', 'Pull Forward', 'Radio Controlled', 'IP Chip'] },
    { key: 'redline', label: 'Redline', type: 'checkbox' },
    { key: 'treasureHunt', label: 'Treasure Hunt', type: 'checkbox' },
    { key: 'softTire', label: 'Soft Tire', type: 'checkbox' },
    { key: 'starsAndStripes', label: 'Stars and Stripes Style', type: 'checkbox' },
    { key: 'goldPlated', label: 'Gold Plated', type: 'checkbox' },
    { key: 'silverPlated', label: 'Silver Plated', type: 'checkbox' },
    { key: 'iridescentMetallic', label: 'Iridescent / Metallic', type: 'checkbox' },
    { key: 'corvetteProStreet', label: 'Corvette Pro Street', type: 'checkbox' },
    { key: 'errorCar', label: 'Error Car', type: 'checkbox' },
    { key: 'blackMarketUnSpun', label: 'Black Market / Un-Spun', type: 'checkbox' },
  ],
  'BROCHURE': [],
  'ADVERTISEMENT': [
    { key: 'thirdPartyVendor', label: 'Third Party Vendor', type: 'checkbox' },
  ],
  'BADGE': [],
  'PATCH': [],
  'PHOTO': [
    { key: 'size', label: 'Size', type: 'text' },
    { key: 'colorMode', label: 'Black and White / Color', type: 'select', options: ['Black and White', 'Color'] },
    { key: 'material', label: 'Material', type: 'text' },
  ],
  'BOOK': [
    { key: 'editionDate', label: 'Edition Date', type: 'date' },
    { key: 'copyright', label: 'Copyright', type: 'text' },
    { key: 'binding', label: 'Hard / Paper', type: 'select', options: ['Hardcover', 'Paperback'] },
    { key: 'author', label: 'Author', type: 'text' },
    { key: 'publisher', label: 'Publisher', type: 'text' },
    { key: 'publishDate', label: 'Publish Date', type: 'date' },
    { key: 'subjectMatter', label: 'Subject Matter', type: 'text' },
    { key: 'multiGeneration', label: 'Multi-Generation', type: 'checkbox' },
    { key: 'dustCover', label: 'Dust Cover', type: 'checkbox' },
  ],
  'ART': [
    { key: 'presentation', label: 'Canvas / Frame / Unframed', type: 'select', options: ['Canvas', 'Framed', 'Unframed'] },
  ],
  'SPECIALTY CAR': [
    { key: 'material', label: 'Material (Pewter, Glass, etc.)', type: 'text' },
    { key: 'productionYear', label: 'Production Year', type: 'number' },
    { key: 'modelSeries', label: 'Model Series', type: 'text' },
    { key: 'subSeries', label: 'Sub Series', type: 'text' },
    { key: 'productionNumber', label: 'Production #', type: 'text' },
    { key: 'primaryColor', label: 'Primary Color', type: 'text' },
    { key: 'tampoColor', label: 'Tampo Color', type: 'text' },
    { key: 'interiorColor', label: 'Interior Color', type: 'text' },
    { key: 'baseColorMat', label: 'Base Color / Mat', type: 'text' },
    { key: 'bodyStyle', label: 'Coupe / Convertible / Roadster', type: 'select', options: ['Coupe', 'Convertible', 'Roadster'] },
    { key: 'driveType', label: 'Drive / Mechanism Type', type: 'select', options: ['Free-Roll', 'Pull Back', 'Pull Forward', 'Radio Controlled', 'IP Chip', 'Stationary'] },
  ],
  'OTHER COLLECTABLES': [
    { key: 'itemType', label: 'Type', type: 'text' },
  ],
  'INSTRUCTIONAL CD': [],
  'MUSIC CD': [
    { key: 'artist', label: 'Artist', type: 'text' },
    { key: 'album', label: 'Album', type: 'text' },
    { key: 'edition', label: 'Edition', type: 'text' },
  ],
  'LITHOGRAPHIC TIN': [
    { key: 'size', label: 'Size', type: 'text' },
    { key: 'shape', label: 'Shape', type: 'text' },
  ],
  'MAGAZINE': [
    { key: 'vendor', label: 'Vendor', type: 'text' },
    { key: 'volume', label: 'Volume', type: 'text' },
  ],
  'AUTO PART': [
    { key: 'partType', label: 'Part Type', type: 'text' },
    { key: 'quantity', label: 'Quantity', type: 'number' },
  ],
  'OWNERS MANUAL': [
    { key: 'originalOwner', label: 'Original Owner', type: 'text' },
  ],
}
```

- [ ] **Step 4: Update `app/utils/catalog.test.ts`**

Update the `item()` helper and the `isCar` describe block (the only places referencing removed categories):

```ts
function item(overrides: Partial<Item>): Item {
  return {
    id: 'x', title: 'T', sub: '', category: 'DIECAST', generation: 'C2', year: 1963,
    scale: '1:18', maker: 'M', acquired: '2020-01-01', pricePaid: 10, value: 20,
    valueAsOf: '', valueSource: '', productionDate: '', rarity: null,
    condition: '', location: '', story: '', featured: false,
    colorName: 'Red', colorHex: '#B11A1A', imgKey: null, attributes: {}, ...overrides,
  }
}
```

```ts
describe('isCar', () => {
  it('is true for DIECAST and SPECIALTY CAR', () => {
    expect(isCar(item({ category: 'DIECAST' }))).toBe(true)
    expect(isCar(item({ category: 'SPECIALTY CAR' }))).toBe(true)
  })
  it('is false for paper ephemera', () => {
    expect(isCar(item({ category: 'BROCHURE' }))).toBe(false)
  })
})

describe('CATEGORY_FIELDS', () => {
  it('includes the Manufacturer Collector Number field for Diecast', () => {
    expect(CATEGORY_FIELDS.DIECAST.some((f) => f.key === 'manufacturerCollectorNumber')).toBe(true)
  })
  it('has no extra fields for Brochure (Year/Generation are common fields)', () => {
    expect(CATEGORY_FIELDS.BROCHURE).toEqual([])
  })
})
```

Add `CATEGORY_FIELDS` to the top import: `import { fmtMoney, fmtDate, stats, colorKey, ARRANGE, isCar, CATEGORY_FIELDS, type Item } from './catalog'`.

- [ ] **Step 5: Run tests, typecheck, commit**

Run: `npm test` → all pass. Run: `npx tsc -b --force` → 0 errors.

```bash
git add app/utils/catalog.ts app/utils/catalog.test.ts
git commit -m "feat: expand catalog to 16 categories with schema-driven attribute fields"
```

---

### Task 3: `app/composables/useItems.ts` — new columns + `attributes` passthrough

**Goal:** Extend `ItemRow`/`fromRow`/`toPatch` for the 5 new `items` columns.

**Files:**
- Modify: `app/composables/useItems.ts`
- Modify: `app/composables/useItems.test.ts`

**Acceptance Criteria:**
- [ ] `ItemRow` has `value_as_of: string | null`, `value_source: string | null`, `production_date: string | null`, `rarity: number | null`, `attributes: Record<string, unknown> | null`.
- [ ] `fromRow` maps them to `valueAsOf`/`valueSource`/`productionDate` (empty string when null), `rarity` (null passthrough), `attributes` (`{}` when null).
- [ ] `toPatch` maps `valueAsOf`/`valueSource`/`productionDate`/`rarity`/`attributes` back to snake_case, only when the field is present on the input (matching the existing pattern for every other field).
- [ ] `npx tsc -b --force` and `npm test` pass.

**Verify:** `npm test -- useItems` → all pass, including new cases for the 5 new fields.

**Steps:**

- [ ] **Step 1: Extend `ItemRow` and `fromRow`/`toPatch`**

In `app/composables/useItems.ts`, add to `ItemRow` (after `value`):

```ts
  value_as_of: string | null
  value_source: string | null
```

and after `img_key`:

```ts
  production_date: string | null
  rarity: number | null
  attributes: Record<string, unknown> | null
```

In `fromRow`, add after `value: Number(row.value) || 0,`:

```ts
    valueAsOf: row.value_as_of ?? '',
    valueSource: row.value_source ?? '',
```

and after `imgKey: row.img_key,`:

```ts
    productionDate: row.production_date ?? '',
    rarity: row.rarity ?? null,
    attributes: row.attributes ?? {},
```

In `toPatch`, add after the `value` line:

```ts
  if (input.valueAsOf !== undefined) patch.value_as_of = input.valueAsOf || null
  if (input.valueSource !== undefined) patch.value_source = input.valueSource
```

and after the `imgKey` line:

```ts
  if (input.productionDate !== undefined) patch.production_date = input.productionDate || null
  if (input.rarity !== undefined) patch.rarity = input.rarity
  if (input.attributes !== undefined) patch.attributes = input.attributes
```

- [ ] **Step 2: Extend `app/composables/useItems.test.ts`**

Update the `row` fixture and both `fromRow` expectations to include the new fields, and add new `toPatch` cases:

```ts
const row: ItemRow = {
  id: 'id-1', user_id: 'user-1', title: 'Sting Ray', sub: 'Riverside Red', category: 'DIECAST',
  generation: 'C2', year: 1963, scale: '1:18', maker: 'AUTOart', acquired: '1963-01-01',
  price_paid: '95.00', value: '285.00', value_as_of: '2026-01-01', value_source: 'Hagerty',
  condition: 'Mint', location: 'Cabinet A', story: '…',
  featured: false, color_name: 'Riverside Red', color_hex: '#B11A1A', img_key: 'user-1/abc.webp',
  production_date: '1963-06-01', rarity: 2, attributes: { toyNumber: 'HW-12' },
  created_at: '2020-01-01T00:00:00Z', updated_at: '2020-01-01T00:00:00Z',
}
```

```ts
  it('maps snake_case DB columns to the camelCase Item shape', () => {
    expect(fromRow(row)).toEqual({
      id: 'id-1', title: 'Sting Ray', sub: 'Riverside Red', category: 'DIECAST', generation: 'C2',
      year: 1963, scale: '1:18', maker: 'AUTOart', acquired: '1963-01-01', pricePaid: 95,
      value: 285, valueAsOf: '2026-01-01', valueSource: 'Hagerty', condition: 'Mint',
      location: 'Cabinet A', story: '…', featured: false,
      colorName: 'Riverside Red', colorHex: '#B11A1A', imgKey: 'user-1/abc.webp',
      productionDate: '1963-06-01', rarity: 2, attributes: { toyNumber: 'HW-12' },
    })
  })
  it('defaults null price/value/attributes to 0/empty and null img_key stays null', () => {
    const sparse = { ...row, price_paid: null, value: null, img_key: null, value_as_of: null, value_source: null, production_date: null, rarity: null, attributes: null }
    const mapped = fromRow(sparse)
    expect(mapped.pricePaid).toBe(0)
    expect(mapped.value).toBe(0)
    expect(mapped.imgKey).toBeNull()
    expect(mapped.valueAsOf).toBe('')
    expect(mapped.rarity).toBeNull()
    expect(mapped.attributes).toEqual({})
  })
```

```ts
  it('maps the new common fields and attributes', () => {
    expect(toPatch({ valueAsOf: '2026-01-01', valueSource: 'eBay comp', productionDate: '', rarity: 3, attributes: { redline: true } }))
      .toEqual({ value_as_of: '2026-01-01', value_source: 'eBay comp', production_date: null, rarity: 3, attributes: { redline: true } })
  })
```

- [ ] **Step 3: Run tests, typecheck, commit**

Run: `npm test` → all pass. Run: `npx tsc -b --force` → 0 errors.

```bash
git add app/composables/useItems.ts app/composables/useItems.test.ts
git commit -m "feat: map new item columns (value source/as-of, production date, rarity, attributes)"
```

---

### Task 4: `app/composables/useItemLinks.ts` — Linked Entries composable

**Goal:** A composable for bidirectional item-to-item links, resolving either side of the relationship.

**Files:**
- Create: `app/composables/useItemLinks.ts`
- Create: `app/composables/useItemLinks.test.ts`

**Acceptance Criteria:**
- [ ] `fromLinkRow` maps a DB row (`item_id`/`linked_item_id`) to `{ id, itemId, linkedItemId }`.
- [ ] `otherItemId(link, itemId)` returns whichever side of the link isn't `itemId`.
- [ ] `useItemLinks()` exposes `fetchForItem(itemId)` (queries both directions and merges — does not rely on Data API `.or()` support), `create(itemId, linkedItemId)`, `remove(linkId)`.
- [ ] `npx tsc -b --force` and `npm test` pass.

**Verify:** `npm test -- useItemLinks` → all pass.

**Steps:**

- [ ] **Step 1: Write `app/composables/useItemLinks.ts`**

```ts
export interface LinkRow {
  id: string
  user_id: string
  item_id: string
  linked_item_id: string
  created_at: string
}

export interface ItemLink { id: string; itemId: string; linkedItemId: string }

export function fromLinkRow(row: LinkRow): ItemLink {
  return { id: row.id, itemId: row.item_id, linkedItemId: row.linked_item_id }
}

export function otherItemId(link: ItemLink, itemId: string): string {
  return link.itemId === itemId ? link.linkedItemId : link.itemId
}

export function useItemLinks() {
  const neon = useNeon()

  async function fetchForItem(itemId: string): Promise<ItemLink[]> {
    const [a, b] = await Promise.all([
      neon.from('item_links').select('*').eq('item_id', itemId),
      neon.from('item_links').select('*').eq('linked_item_id', itemId),
    ])
    if (a.error) throw a.error
    if (b.error) throw b.error
    const rows = [...(a.data as LinkRow[]), ...(b.data as LinkRow[])]
    return rows.map(fromLinkRow)
  }

  async function create(itemId: string, linkedItemId: string): Promise<ItemLink> {
    const { data, error } = await neon.from('item_links').insert({ item_id: itemId, linked_item_id: linkedItemId }).select().single()
    if (error) throw error
    return fromLinkRow(data as LinkRow)
  }

  async function remove(linkId: string): Promise<void> {
    const { error } = await neon.from('item_links').delete().eq('id', linkId)
    if (error) throw error
  }

  return { fetchForItem, create, remove }
}
```

- [ ] **Step 2: Write `app/composables/useItemLinks.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { fromLinkRow, otherItemId, type LinkRow } from './useItemLinks'

const row: LinkRow = { id: 'link-1', user_id: 'user-1', item_id: 'item-a', linked_item_id: 'item-b', created_at: '2020-01-01T00:00:00Z' }

describe('fromLinkRow', () => {
  it('maps snake_case DB columns to the camelCase ItemLink shape', () => {
    expect(fromLinkRow(row)).toEqual({ id: 'link-1', itemId: 'item-a', linkedItemId: 'item-b' })
  })
})

describe('otherItemId', () => {
  const link = fromLinkRow(row)
  it('returns the linked item when given the origin item', () => {
    expect(otherItemId(link, 'item-a')).toBe('item-b')
  })
  it('returns the origin item when given the linked item', () => {
    expect(otherItemId(link, 'item-b')).toBe('item-a')
  })
})
```

- [ ] **Step 3: Run tests, typecheck, commit**

Run: `npm test` → all pass, including 3 new `useItemLinks` tests. Run: `npx tsc -b --force` → 0 errors.

```bash
git add app/composables/useItemLinks.ts app/composables/useItemLinks.test.ts
git commit -m "feat: add useItemLinks composable for bidirectional linked entries"
```

---

### Task 5: `app/composables/useItemDocuments.ts` — Documents composable

**Goal:** A composable for per-item document/attachment rows (metadata only — R2 upload/delete happens via the server routes built in Task 6).

**Files:**
- Create: `app/composables/useItemDocuments.ts`
- Create: `app/composables/useItemDocuments.test.ts`

**Acceptance Criteria:**
- [ ] `fromDocumentRow` maps a DB row to `{ id, itemId, key, filename, mimeType, size }`.
- [ ] `useItemDocuments()` exposes `fetchForItem(itemId)` (ordered oldest-first), `create(itemId, doc)`, `remove(documentId)`.
- [ ] `npx tsc -b --force` and `npm test` pass.

**Verify:** `npm test -- useItemDocuments` → all pass.

**Steps:**

- [ ] **Step 1: Write `app/composables/useItemDocuments.ts`**

```ts
export interface DocumentRow {
  id: string
  user_id: string
  item_id: string
  key: string
  filename: string
  mime_type: string
  size: number
  created_at: string
}

export interface ItemDocument { id: string; itemId: string; key: string; filename: string; mimeType: string; size: number }

export function fromDocumentRow(row: DocumentRow): ItemDocument {
  return { id: row.id, itemId: row.item_id, key: row.key, filename: row.filename, mimeType: row.mime_type, size: row.size }
}

export function useItemDocuments() {
  const neon = useNeon()

  async function fetchForItem(itemId: string): Promise<ItemDocument[]> {
    const { data, error } = await neon.from('item_documents').select('*').eq('item_id', itemId).order('created_at', { ascending: true })
    if (error) throw error
    return (data as DocumentRow[]).map(fromDocumentRow)
  }

  async function create(itemId: string, doc: { key: string; filename: string; mimeType: string; size: number }): Promise<ItemDocument> {
    const { data, error } = await neon.from('item_documents').insert({
      item_id: itemId, key: doc.key, filename: doc.filename, mime_type: doc.mimeType, size: doc.size,
    }).select().single()
    if (error) throw error
    return fromDocumentRow(data as DocumentRow)
  }

  async function remove(documentId: string): Promise<void> {
    const { error } = await neon.from('item_documents').delete().eq('id', documentId)
    if (error) throw error
  }

  return { fetchForItem, create, remove }
}
```

- [ ] **Step 2: Write `app/composables/useItemDocuments.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { fromDocumentRow, type DocumentRow } from './useItemDocuments'

const row: DocumentRow = {
  id: 'doc-1', user_id: 'user-1', item_id: 'item-a', key: 'user-1/docs/uuid-manual.pdf',
  filename: 'manual.pdf', mime_type: 'application/pdf', size: 204800, created_at: '2020-01-01T00:00:00Z',
}

describe('fromDocumentRow', () => {
  it('maps snake_case DB columns to the camelCase ItemDocument shape', () => {
    expect(fromDocumentRow(row)).toEqual({
      id: 'doc-1', itemId: 'item-a', key: 'user-1/docs/uuid-manual.pdf',
      filename: 'manual.pdf', mimeType: 'application/pdf', size: 204800,
    })
  })
})
```

- [ ] **Step 3: Run tests, typecheck, commit**

Run: `npm test` → all pass. Run: `npx tsc -b --force` → 0 errors.

```bash
git add app/composables/useItemDocuments.ts app/composables/useItemDocuments.test.ts
git commit -m "feat: add useItemDocuments composable for item attachments"
```

---

### Task 6: R2 document key + upload/delete routes + client composable

**Goal:** Mirror the existing image upload/delete pipeline for arbitrary documents (PDF + images), with a broader type allow-list and a 15MB cap.

**Files:**
- Modify: `server/utils/r2.ts`
- Create: `server/api/documents.post.ts`
- Create: `server/api/documents.delete.ts`
- Create: `app/composables/useDocumentUpload.ts`

**Acceptance Criteria:**
- [ ] `makeDocumentKey(userId, filename)` returns `${userId}/docs/${uuid}-${sanitizedFilename}`, sanitizing the filename to `[a-zA-Z0-9._-]` only (no path traversal).
- [ ] `POST /api/documents` (file `server/api/documents.post.ts`) verifies the bearer JWT, accepts `application/pdf`/`image/webp`/`image/png`/`image/jpeg` up to 15MB, uploads to R2 under the new key, returns `{ key, filename, mimeType, size, url }`.
- [ ] `DELETE /api/documents` (file `server/api/documents.delete.ts`) verifies the bearer JWT, requires `isOwnedKey(key, userId)` (the existing `${userId}/` prefix check already covers the `docs/` sub-path), deletes from R2.
- [ ] `useDocumentUpload()` composable exposes `upload(file)` (raw file, no WebP conversion — unlike `useImageUpload`) and `remove(key)`, both attaching the JWT the same way `useImageUpload` does.
- [ ] `npx tsc -b --force` passes.

**Verify:** `npx tsc -b --force` → 0 errors (no automated test for these routes — they require a live R2 bucket; covered by the manual verification in Task 9).

**Steps:**

- [ ] **Step 1: Add `makeDocumentKey` to `server/utils/r2.ts`**

```ts
export function makeDocumentKey(userId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${userId}/docs/${crypto.randomUUID()}-${safe}`
}
```

- [ ] **Step 2: Write `server/api/documents.post.ts`**

```ts
export default defineEventHandler(async (event) => {
  const auth = getHeader(event, 'authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Missing bearer token' })

  let userId: string
  try {
    userId = await verifyNeonJwt(token, getNeonJwks())
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired token' })
  }

  const parts = await readMultipartFormData(event)
  const file = parts?.find((p) => p.name === 'file')
  if (!file || !file.data || file.data.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Missing file' })
  }

  const ALLOWED = ['application/pdf', 'image/webp', 'image/png', 'image/jpeg']
  if (!file.type || !ALLOWED.includes(file.type)) {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported document type' })
  }
  const MAX_BYTES = 15 * 1024 * 1024
  if (file.data.length > MAX_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'Document too large (max 15MB)' })
  }

  const cfg = useRuntimeConfig()
  const filename = file.filename || 'document'
  const key = makeDocumentKey(userId, filename)
  const client = getR2Client()
  const res = await client.fetch(objectUrl(cfg.r2.endpoint, cfg.r2.bucket, key), {
    method: 'PUT',
    body: file.data,
    headers: { 'Content-Type': file.type },
  })
  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: `R2 upload failed: ${res.status}` })
  }

  return { key, filename, mimeType: file.type, size: file.data.length, url: `${cfg.public.imageBaseUrl}/${key}` }
})
```

- [ ] **Step 3: Write `server/api/documents.delete.ts`**

```ts
export default defineEventHandler(async (event) => {
  const auth = getHeader(event, 'authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Missing bearer token' })

  let userId: string
  try {
    userId = await verifyNeonJwt(token, getNeonJwks())
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired token' })
  }

  const body = await readBody<{ key?: string }>(event)
  const key = body?.key
  if (!key || !isOwnedKey(key, userId)) {
    throw createError({ statusCode: 403, statusMessage: 'Not your document' })
  }

  const cfg = useRuntimeConfig()
  const client = getR2Client()
  const res = await client.fetch(objectUrl(cfg.r2.endpoint, cfg.r2.bucket, key), { method: 'DELETE' })
  if (!res.ok && res.status !== 404) {
    throw createError({ statusCode: 502, statusMessage: `R2 delete failed: ${res.status}` })
  }

  return { ok: true }
})
```

Note: both routes reference `verifyNeonJwt`, `getNeonJwks`, `getR2Client`, `objectUrl`, `isOwnedKey`, `makeDocumentKey` as Nitro auto-imports from `server/utils/` — no explicit import needed, matching `server/api/upload.post.ts`'s existing style.

- [ ] **Step 4: Write `app/composables/useDocumentUpload.ts`**

```ts
export interface DocUploadResult { key: string; filename: string; mimeType: string; size: number; url: string }

export function useDocumentUpload() {
  const { getJwt } = useAuth()

  async function upload(file: File): Promise<DocUploadResult> {
    const jwt = await getJwt()
    if (!jwt) throw new Error('Not signed in')
    const form = new FormData()
    form.append('file', file, file.name)
    return await $fetch<DocUploadResult>('/api/documents', {
      method: 'POST',
      body: form,
      headers: { Authorization: `Bearer ${jwt}` },
    })
  }

  async function remove(key: string): Promise<void> {
    const jwt = await getJwt()
    if (!jwt) throw new Error('Not signed in')
    await $fetch('/api/documents', {
      method: 'DELETE',
      body: { key },
      headers: { Authorization: `Bearer ${jwt}` },
    })
  }

  return { upload, remove }
}
```

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc -b --force` → 0 errors.

```bash
git add server/utils/r2.ts server/api/documents.post.ts server/api/documents.delete.ts app/composables/useDocumentUpload.ts
git commit -m "feat: add document upload/delete R2 pipeline"
```

---

### Task 7: `app/pages/add.vue` — common field additions + dynamic category attributes + Documents + Linked Entries

**Goal:** Add the new common fields, replace the hardcoded 3-field category section with a dynamic `CATEGORY_FIELDS`-driven section, and add Documents/Linked Entries pickers to the Add form. Also generalize `SlotPicker.vue` (currently hardcoded to garage copy) so it can be reused for Linked Entries.

**Files:**
- Modify: `app/components/garage/SlotPicker.vue`
- Create: `app/components/RarityStars.vue`
- Modify: `app/pages/add.vue`

**Acceptance Criteria:**
- [ ] `SlotPicker.vue` accepts optional `title` (default `'Shelve a Car Here'`) and `emptyMessage` (default the existing garage copy) props — garage.vue's existing usage renders identically with no props passed.
- [ ] `RarityStars.vue` renders 1-3 stars, filled up to `modelValue`, clickable when `editable` (clicking the currently-selected star clears it back to `null`).
- [ ] Add form's common section includes: Production Date (date), Rarity (editable `RarityStars`), Value As Of (date), Value Source (text) — alongside the existing Est. Value field.
- [ ] Generation field visibility is driven by `CATEGORY_HAS_GENERATION[form.category]` (replacing `FIELD_SETS[form.category].gen`); Year/Scale/Maker fields keep fixed generic labels ("Year", "Scale / Format", "Maker / Manufacturer") — no more per-category relabeling.
- [ ] A dynamic fieldset renders one input per `CATEGORY_FIELDS[form.category]` entry, keyed by `f.type`, writing into `form.attributes[f.key]`; switching category resets `form.attributes` to fresh defaults for the new category's fields (`false` for checkboxes, `''` otherwise).
- [ ] A "+ Attach a Document" control uploads one or more files via `useDocumentUpload().upload()` and stages them; a "+ Link an Entry" button opens the (now-generalized) `SlotPicker` over the user's other items and stages a linked item id. Both staged lists are committed (via `useItemDocuments().create()` / `useItemLinks().create()`) after the item itself is created.
- [ ] `npx tsc -b --force` passes; `npm test` still passes (no regressions).

**Verify:** `npx tsc -b --force` → 0 errors; manual verification deferred to Task 9 (needs a live dev server + real categories to click through).

**Steps:**

- [ ] **Step 1: Generalize `app/components/garage/SlotPicker.vue`**

```vue
<template>
  <div class="modal-scrim no-print" @click="$emit('close')">
    <div class="modal-card" @click.stop>
      <div style="background: var(--orange); color: var(--paper); padding: 12px 18px; display: flex; justify-content: space-between; align-items: center;">
        <span class="kicker" style="letter-spacing: 0.18em; font-size: 12px;">{{ title }}</span>
        <button class="icon-btn" style="background: transparent; color: var(--paper); border-color: var(--paper);" @click="$emit('close')">✕</button>
      </div>
      <div style="max-height: 60vh; overflow-y: auto;">
        <div v-if="candidates.length === 0" style="padding: 30px 20px; text-align: center; font-style: italic; color: var(--muted);">
          {{ emptyMessage }}
        </div>
        <button v-for="it in candidates" :key="it.id" class="pick-row" @click="$emit('pick', it.id)">
          <span class="pick-swatch" :style="{ background: colorOf(it).hex }" />
          <span style="flex: 1; text-align: left; min-width: 0;">
            <span style="font-family: var(--font-display); font-weight: 700; font-size: 17px; display: block; line-height: 1;">{{ it.title }}</span>
            <span style="font-family: var(--font-cond); font-size: 11.5px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em;">{{ it.generation === '—' ? 'Ephemera' : it.generation }} · {{ it.year }} · {{ colorOf(it).name }}</span>
          </span>
          <span class="value-note" style="font-size: 18px;">{{ fmtMoney(it.value) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { colorOf, fmtMoney, type Item } from '~/utils/catalog'
withDefaults(defineProps<{ candidates: Item[]; title?: string; emptyMessage?: string }>(), {
  title: 'Shelve a Car Here',
  emptyMessage: 'Every car is already on the wall. Drag one between slots to re-file it.',
})
defineEmits<{ pick: [id: string]; close: [] }>()
</script>
```

(This is the only change to `SlotPicker.vue` — garage.vue's existing `<SlotPicker :candidates="loose" @close=... @pick=... />` call passes no `title`/`emptyMessage`, so it keeps rendering "Shelve a Car Here" exactly as before.)

- [ ] **Step 2: Write `app/components/RarityStars.vue`**

```vue
<template>
  <span class="rarity-stars" :style="{ cursor: editable ? 'pointer' : 'default' }">
    <span
      v-for="n in 3" :key="n"
      :style="{ color: n <= (modelValue || 0) ? 'var(--orange)' : 'var(--rule)', fontSize: '18px' }"
      @click="editable && $emit('update:modelValue', modelValue === n ? null : n)"
    >★</span>
  </span>
</template>

<script setup lang="ts">
defineProps<{ modelValue: number | null; editable?: boolean }>()
defineEmits<{ 'update:modelValue': [value: number | null] }>()
</script>
```

- [ ] **Step 3: Rewrite `app/pages/add.vue`'s script block**

```ts
import { CATEGORIES, CATEGORY_FIELDS, CATEGORY_HAS_GENERATION, GENERATIONS, GEN_ORDER, type Category, type Generation, type Item } from '~/utils/catalog'

const { items, create } = useItems()
const { upload } = useImageUpload()
const { upload: uploadDoc } = useDocumentUpload()
const { create: createDocument } = useItemDocuments()
const { create: createLink } = useItemLinks()

const categoryKeys = Object.keys(CATEGORIES) as Category[]
const genOptions = GEN_ORDER

function freshAttributes(c: Category): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const f of CATEGORY_FIELDS[c]) next[f.key] = f.type === 'checkbox' ? false : ''
  return next
}

const form = reactive({
  title: '', sub: '', category: 'DIECAST' as Category, generation: 'C2' as Generation,
  year: '', scale: '', maker: '', acquired: '', pricePaid: '', value: '',
  valueAsOf: '', valueSource: '', productionDate: '', rarity: null as number | null,
  condition: '', location: '', story: '',
  attributes: freshAttributes('DIECAST'),
})
const fields = computed(() => CATEGORY_FIELDS[form.category])

watch(() => form.category, (c) => {
  if (!CATEGORY_HAS_GENERATION[c]) form.generation = '—'
  else if (form.generation === '—') form.generation = 'C2'
  form.attributes = freshAttributes(c)
})

const pendingFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const uploading = ref(false)
let uploadedKey: string | null = null

function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  pendingFile.value = file
  previewUrl.value = URL.createObjectURL(file)
}
function clearPhoto() {
  pendingFile.value = null
  previewUrl.value = null
  uploadedKey = null
}

const pendingDocuments = ref<{ key: string; filename: string; mimeType: string; size: number; url: string }[]>([])
async function onDocFiles(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  if (!files.length) return
  for (const file of files) {
    const result = await uploadDoc(file)
    pendingDocuments.value.push(result)
  }
}
function removePendingDocument(i: number) {
  pendingDocuments.value.splice(i, 1)
}

const pendingLinks = ref<string[]>([])
const showLinkPicker = ref(false)
const linkCandidates = computed(() => items.value.filter((i) => !pendingLinks.value.includes(i.id)))
function addPendingLink(id: string) {
  pendingLinks.value.push(id)
  showLinkPicker.value = false
}
function removePendingLink(id: string) {
  pendingLinks.value = pendingLinks.value.filter((x) => x !== id)
}

const valid = computed(() => form.title.trim().length > 0 && String(form.year).trim().length > 0)
const saving = ref(false)

async function onSave() {
  if (!valid.value || saving.value) return
  saving.value = true
  try {
    if (pendingFile.value) {
      uploading.value = true
      const result = await upload(pendingFile.value)
      uploadedKey = result.key
    }
    const item = await create({
      title: form.title, sub: form.sub || 'Newly catalogued', category: form.category,
      generation: form.generation, year: form.year ? Number(form.year) : '',
      scale: form.scale || '—', maker: form.maker || 'Unknown', acquired: form.acquired,
      pricePaid: Number(form.pricePaid) || 0, value: Number(form.value) || 0,
      valueAsOf: form.valueAsOf, valueSource: form.valueSource, productionDate: form.productionDate,
      rarity: form.rarity,
      condition: form.condition || 'Not yet assessed', location: form.location || 'Unfiled',
      story: form.story || 'No notes recorded yet.', featured: false,
      colorName: '', colorHex: '', imgKey: uploadedKey, attributes: form.attributes,
    })
    for (const doc of pendingDocuments.value) {
      await createDocument(item.id, doc)
    }
    for (const linkedId of pendingLinks.value) {
      await createLink(item.id, linkedId)
    }
    await navigateTo(`/collection/${item.id}`)
  } finally {
    uploading.value = false
    saving.value = false
  }
}
```

- [ ] **Step 4: Update `app/pages/add.vue`'s template**

Change the Generation `v-if` from `fieldSet.gen` to `CATEGORY_HAS_GENERATION[form.category]`:

```html
<label v-if="CATEGORY_HAS_GENERATION[form.category]">
```

Change the Year/Scale/Maker labels from `{{ fieldSet.year.l }}`/`{{ fieldSet.scale.l }}`/`{{ fieldSet.maker.l }}` (and their `:placeholder`s) to fixed text:

```html
<label>
  <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Year *</span>
  <input v-model="form.year" type="number" placeholder="1963" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;" />
</label>
<label>
  <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Scale / Format</span>
  <input v-model="form.scale" placeholder="1:18" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;" />
</label>
<label>
  <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Maker / Manufacturer</span>
  <input v-model="form.maker" placeholder="AUTOart" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;" />
</label>
```

After the existing "Est. Value ($)" label, add three more fields to the `.index-card-grid`:

```html
<label>
  <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Value As Of</span>
  <input v-model="form.valueAsOf" type="date" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;" />
</label>
<label>
  <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Value Source</span>
  <input v-model="form.valueSource" placeholder="Hagerty valuation, eBay comp…" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;" />
</label>
<label>
  <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Production Date</span>
  <input v-model="form.productionDate" type="date" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;" />
</label>
<label>
  <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Rarity</span>
  <RarityStars v-model="form.rarity" editable style="display: block; padding: 8px 2px;" />
</label>
```

After the "Provenance & Notes" `<label>` (before the closing `.index-card-body` div), add the dynamic attributes section, Documents, and Linked Entries:

```html
<div v-if="fields.length" style="margin-top: 20px;">
  <div class="kicker" style="color: var(--orange); margin-bottom: 10px;">{{ form.category }} Details</div>
  <div class="index-card-grid">
    <label v-for="f in fields" :key="f.key" :style="f.type === 'textarea' ? 'grid-column: 1 / -1;' : ''">
      <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">{{ f.label }}</span>
      <input v-if="f.type === 'text' || f.type === 'number' || f.type === 'date'" v-model="form.attributes[f.key]" :type="f.type" :placeholder="f.placeholder" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;" />
      <textarea v-else-if="f.type === 'textarea'" v-model="form.attributes[f.key]" rows="2" :placeholder="f.placeholder" style="border-bottom: 1.5px solid var(--rule); padding: 6px 2px; font-size: 16.5px; resize: vertical;" />
      <select v-else-if="f.type === 'select'" v-model="form.attributes[f.key]" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16.5px;">
        <option value="">—</option>
        <option v-for="opt in f.options" :key="opt" :value="opt">{{ opt }}</option>
      </select>
      <span v-else-if="f.type === 'checkbox'" style="display: flex; align-items: center; gap: 6px; padding: 5px 2px;">
        <input v-model="form.attributes[f.key]" type="checkbox" />
      </span>
    </label>
  </div>
</div>

<div style="margin-top: 20px;">
  <div class="kicker" style="color: var(--orange); margin-bottom: 10px;">Documents</div>
  <label class="btn ghost no-print" style="cursor: pointer; border-color: var(--ink);">
    + Attach a Document
    <input type="file" accept=".pdf,image/*" multiple style="display: none;" @change="onDocFiles" />
  </label>
  <div v-for="(d, i) in pendingDocuments" :key="d.key" style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
    <span>{{ d.filename }}</span>
    <button class="link-tab" style="color: var(--muted); font-size: 11px; background: none; border: none;" @click="removePendingDocument(i)">remove</button>
  </div>
</div>

<div style="margin-top: 20px;">
  <div class="kicker" style="color: var(--orange); margin-bottom: 10px;">Linked Entries</div>
  <button class="btn ghost no-print" type="button" style="border-color: var(--ink);" @click="showLinkPicker = true">+ Link an Entry</button>
  <div v-for="id in pendingLinks" :key="id" style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
    <span>{{ items.find((i) => i.id === id)?.title }}</span>
    <button class="link-tab" style="color: var(--muted); font-size: 11px; background: none; border: none;" @click="removePendingLink(id)">remove</button>
  </div>
</div>
```

At the very end of the template (as a sibling of the outermost `.wrap` div's content, alongside the save/discard buttons), add:

```html
<SlotPicker v-if="showLinkPicker" title="Link an Entry" empty-message="No other items to link yet." :candidates="linkCandidates" @close="showLinkPicker = false" @pick="addPendingLink" />
```

- [ ] **Step 5: Typecheck, run tests, commit**

Run: `npx tsc -b --force` → 0 errors. Run: `npm test` → all pass (no regressions).

```bash
git add app/components/garage/SlotPicker.vue app/components/RarityStars.vue app/pages/add.vue
git commit -m "feat: add dynamic category attributes, documents, and linked entries to the Add form"
```

---

### Task 8: `app/pages/collection/[id].vue` — new ledger rows, dynamic attributes, Linked Entries, Documents

**Goal:** Surface every new field/relationship on the Item Detail page.

**Files:**
- Modify: `app/pages/collection/[id].vue`

**Acceptance Criteria:**
- [ ] The existing ledger gains rows for Production Date and Rarity (via `RarityStars` read-only); Value As Of / Value Source render near the existing `ValueNote` banner.
- [ ] A second, dynamic ledger renders one row per `CATEGORY_FIELDS[item.category]` entry, reading from `item.attributes[f.key]` (checkboxes shown as "Yes"/"No", dates formatted via `fmtDate`, empty values shown as "—").
- [ ] A "Linked Entries" section lists every linked item (resolved against the already-loaded `items` list via `otherItemId`), with an unlink button per row and a "+ Link an Entry" button that opens the shared `SlotPicker` (candidates = the user's items minus itself and already-linked ones).
- [ ] A "Documents" section lists every attached document with a download link (`${imageBaseUrl}/${key}`) and a remove button (removes the DB row, then best-effort removes the R2 object, matching the existing image-delete error-swallow pattern with `console.warn`), plus an "+ Attach a Document" upload control.
- [ ] `npx tsc -b --force` passes; `npm test` still passes (no regressions).

**Verify:** `npx tsc -b --force` → 0 errors; manual click-through verification deferred to Task 9.

**Steps:**

- [ ] **Step 1: Update the script block**

```ts
import { fmtMoney, fmtDate, GENERATIONS, CATEGORY_FIELDS, type Generation, type Item } from '~/utils/catalog'
import { otherItemId, type ItemLink } from '~/composables/useItemLinks'
import type { ItemDocument } from '~/composables/useItemDocuments'

const route = useRoute()
const { items, fetchAll, remove: removeItem } = useItems()
const { remove: removeImage } = useImageUpload()
const { fetchForItem: fetchLinksForItem, create: createLink, remove: removeLink } = useItemLinks()
const { fetchForItem: fetchDocsForItem, create: createDocument, remove: removeDocumentRow } = useItemDocuments()
const { upload: uploadDoc, remove: removeDocumentFile } = useDocumentUpload()

if (!items.value.length) {
  try {
    await fetchAll()
  } catch (err) {
    console.warn('Failed to load items for the Item Detail page:', err)
  }
}

const item = computed(() => items.value.find((i) => i.id === route.params.id) || null)

const links = ref<ItemLink[]>([])
const documents = ref<ItemDocument[]>([])

async function loadRelated() {
  if (!item.value) return
  try {
    links.value = await fetchLinksForItem(item.value.id)
  } catch (err) {
    console.warn('Failed to load linked entries:', err)
  }
  try {
    documents.value = await fetchDocsForItem(item.value.id)
  } catch (err) {
    console.warn('Failed to load documents:', err)
  }
}
await loadRelated()

const linkedItems = computed(() => {
  if (!item.value) return [] as { linkId: string; item: Item }[]
  return links.value
    .map((l) => {
      const otherId = otherItemId(l, item.value!.id)
      const found = items.value.find((i) => i.id === otherId)
      return found ? { linkId: l.id, item: found } : null
    })
    .filter((x): x is { linkId: string; item: Item } => x !== null)
})

const showLinkPicker = ref(false)
const linkCandidates = computed(() => {
  if (!item.value) return [] as Item[]
  const linkedIds = new Set(links.value.map((l) => otherItemId(l, item.value!.id)))
  return items.value.filter((i) => i.id !== item.value!.id && !linkedIds.has(i.id))
})
async function onLink(candidateId: string) {
  if (!item.value) return
  const link = await createLink(item.value.id, candidateId)
  links.value = [...links.value, link]
  showLinkPicker.value = false
}
async function onUnlink(linkId: string) {
  await removeLink(linkId)
  links.value = links.value.filter((l) => l.id !== linkId)
}

async function onDocFiles(e: Event) {
  if (!item.value) return
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  for (const file of files) {
    const uploaded = await uploadDoc(file)
    const doc = await createDocument(item.value.id, uploaded)
    documents.value = [...documents.value, doc]
  }
}
async function onRemoveDocument(d: ItemDocument) {
  if (!window.confirm(`Remove "${d.filename}"?`)) return
  await removeDocumentRow(d.id)
  documents.value = documents.value.filter((x) => x.id !== d.id)
  try {
    await removeDocumentFile(d.key)
  } catch (err) {
    console.warn('Failed to remove R2 document after row delete:', err)
  }
}

async function onDelete() {
  if (!item.value) return
  if (!window.confirm(`Remove "${item.value.title}" from your archive? This can't be undone.`)) return
  const imgKey = item.value.imgKey
  await removeItem(item.value.id)
  if (imgKey) {
    try { await removeImage(imgKey) } catch (err) { console.warn('Failed to remove R2 image after item delete:', err) }
  }
  await navigateTo('/collection')
}
const cfg = useRuntimeConfig()
const imageBaseUrl = cfg.public.imageBaseUrl

const gain = computed(() => (item.value ? item.value.value - item.value.pricePaid : 0))
const rows = computed(() => {
  if (!item.value) return [] as [string, string][]
  const g = item.value.generation !== '—' ? GENERATIONS[item.value.generation as Exclude<Generation, '—'>] : undefined
  return [
    ['Year', String(item.value.year)],
    ['Generation', item.value.generation === '—' ? 'Ephemera' : `${item.value.generation} — ${g ? g.name : ''}`],
    ['Scale / Format', item.value.scale],
    ['Maker', item.value.maker],
    ['Acquired', fmtDate(item.value.acquired)],
    ['Price Paid', fmtMoney(item.value.pricePaid)],
    ['Location', item.value.location],
    ['Production Date', fmtDate(item.value.productionDate)],
  ] as [string, string][]
})

const attrFields = computed(() => (item.value ? CATEGORY_FIELDS[item.value.category] : []))
const attrRows = computed<[string, string][]>(() => {
  if (!item.value) return []
  return attrFields.value.map((f) => {
    const raw = item.value!.attributes[f.key]
    let display: string
    if (f.type === 'checkbox') display = raw ? 'Yes' : 'No'
    else if (f.type === 'date') display = fmtDate(raw as string)
    else display = raw != null && raw !== '' ? String(raw) : '—'
    return [f.label, display]
  })
})
```

- [ ] **Step 2: Update the template**

Add the Rarity/Value As Of/Source near the existing value banner (right after the `.detail-gain` closing `</div>`, still inside `.detail-value-banner`):

```html
<div v-if="item.rarity || item.valueAsOf || item.valueSource" style="width: 100%; margin-top: 10px; font-size: 12px; color: rgba(245,240,232,0.7);">
  <RarityStars :model-value="item.rarity" />
  <span v-if="item.valueAsOf"> · as of {{ fmtDate(item.valueAsOf) }}</span>
  <span v-if="item.valueSource"> · {{ item.valueSource }}</span>
</div>
```

After the existing `.detail-ledger` block (fixed rows), add the dynamic attributes ledger:

```html
<div v-if="attrRows.length" class="detail-ledger" style="margin-top: 14px;">
  <div v-for="([k, v], i) in attrRows" :key="k" class="detail-ledger-row" :style="{ borderBottom: i < attrRows.length - 1 ? '1px solid var(--rule)' : 'none' }">
    <div class="kicker detail-ledger-key">{{ k }}</div>
    <div style="padding: 10px 14px; font-size: 16px;">{{ v }}</div>
  </div>
</div>
```

After the "Provenance & Notes" paragraph (still inside the second grid column, before its closing `</div>`), add Linked Entries and Documents:

```html
<div class="no-print" style="margin-top: 24px;">
  <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">Linked Entries</div>
  <div v-for="li in linkedItems" :key="li.linkId" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--rule);">
    <NuxtLink :to="`/collection/${li.item.id}`" style="font-size: 15px;">{{ li.item.title }}</NuxtLink>
    <button class="link-tab" style="color: var(--muted); font-size: 11px; background: none; border: none;" @click="onUnlink(li.linkId)">unlink</button>
  </div>
  <button class="btn ghost" style="margin-top: 10px; font-size: 12px; padding: 7px 13px;" @click="showLinkPicker = true">+ Link an Entry</button>
</div>

<div class="no-print" style="margin-top: 24px;">
  <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">Documents</div>
  <div v-for="d in documents" :key="d.id" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--rule);">
    <a :href="`${imageBaseUrl}/${d.key}`" target="_blank" rel="noopener" style="font-size: 15px;">{{ d.filename }}</a>
    <button class="link-tab" style="color: var(--muted); font-size: 11px; background: none; border: none;" @click="onRemoveDocument(d)">remove</button>
  </div>
  <label class="btn ghost" style="margin-top: 10px; font-size: 12px; padding: 7px 13px; cursor: pointer;">
    + Attach a Document
    <input type="file" accept=".pdf,image/*" multiple style="display: none;" @change="onDocFiles" />
  </label>
</div>
```

Add the `SlotPicker` modal as a sibling of the outer `v-if="item"` div (so it can render regardless of the `v-else` "not found" branch is irrelevant since it's inside the `v-if="item"` branch — place it right before that div's closing `</div>`):

```html
<SlotPicker v-if="showLinkPicker" title="Link an Entry" empty-message="No other items to link yet." :candidates="linkCandidates" @close="showLinkPicker = false" @pick="onLink" />
```

- [ ] **Step 3: Typecheck, run tests, commit**

Run: `npx tsc -b --force` → 0 errors. Run: `npm test` → all pass.

```bash
git add app/pages/collection/[id].vue
git commit -m "feat: surface new fields, linked entries, and documents on the Item Detail page"
```

---

### Task 9: Full verification pass

**Goal:** Confirm the whole feature works end-to-end against the live Neon/R2 backend, matching the plan's original Verification section.

**Files:** none (verification only).

**Acceptance Criteria:**
- [ ] `npx tsc -b --force` → 0 errors.
- [ ] `npm run build` → completes with no errors.
- [ ] `npm test` → all tests pass (existing + all new tests from Tasks 2–5).
- [ ] Manual: via `npm run dev`, add one item each for Diecast (with several checkboxes/attributes set), Book, and Photo via `/add`; confirm the dynamic fields save and render correctly on `/collection/[id]`.
- [ ] Manual: link two items together from one item's detail page; confirm the reverse item shows the same link (bidirectional).
- [ ] Manual: attach a PDF and an image as documents on an item; confirm both list and download correctly, and that removing one deletes both the DB row and the R2 object (spot-check via a second upload of the same filename succeeding, or via R2 bucket listing if available).
- [ ] Manual: confirm RLS still isolates two accounts — reuse the curl+JWT technique from the original build (sign up two accounts, `GET /get-session` to capture each JWT, confirm each account's Data API queries only return its own items/links/documents).

**Verify:** All four bullets above pass; report any failures with the exact command output before considering this task complete.

**Steps:**

- [ ] **Step 1: Automated checks**

Run: `npx tsc -b --force` → expect 0 errors.
Run: `npm test` → expect all tests passing (existing 35 + new tests from Tasks 2-5).
Run: `npm run build` → expect a clean build with no errors.

- [ ] **Step 2: Manual smoke test**

Start the dev server (`npm run dev`), then walk through the acceptance criteria's manual bullets above using a real signed-in account. For the RLS check, reuse the pattern already proven earlier in this project: `POST {authUrl}/sign-up/email` with `Origin: http://localhost:3000`, then `GET {authUrl}/get-session` with the session cookie to capture the `set-auth-jwt` response header as a real JWT, then issue Data API requests with each account's JWT and confirm cross-account isolation on `items`, `item_links`, and `item_documents`.

- [ ] **Step 3: Report and commit any fixes**

If any step above surfaces a bug, fix it in the relevant file from Tasks 1-8, re-run the affected verification, and commit the fix with a message describing what was wrong (e.g. `fix: <bug found during full verification pass>`). Once everything passes, no further commit is needed for this task itself.

---

## Self-review notes

- **Spec coverage:** every common attribute (Picture, Stored At, Acquired, Price Paid, Est Value+As Of+Source, Condition Report, Production Date, Notes, Linked Entries, Rarity, Documents) and every one of the 16 categories' unique attributes from the user's verbatim spec is covered by `CATEGORY_FIELDS` in Task 2, including the user's Diecast naming decision ("Toy #") and the "Manufacturer Collector Number" follow-up.
- **Type consistency checked:** `Item`/`ItemRow`/`FieldDef`/`ItemLink`/`ItemDocument` field names are identical across Tasks 2, 3, 4, 5, 7, 8 (`valueAsOf`/`valueSource`/`productionDate`/`rarity`/`attributes` on `Item`; `otherItemId`/`fromLinkRow`/`fromDocumentRow` signatures match their call sites in Task 8).
- **No placeholders:** every step has complete, copy-pasteable code — no "add appropriate handling" language anywhere in this plan.
