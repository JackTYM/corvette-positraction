# Diecast Reference Redesign + Wishlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the shipped Diecast Reference feature's Add-form picker and two-page browse structure with one all-pictures browse-and-import page, and add a new user-owned Wishlist feature.

**Architecture:** Two new dedup/import primitives (`items.source_variant_id`, a server-side image-import route that copies an external reference photo into R2) power a rewritten `/diecast-reference` page that shows every scraped picture inline, tracks which ones the user already owns or wants, and routes clicks to the Add form (pre-populated, photo already imported) or an existing entry. A new `wishlist_items` table + `useWishlist.ts` composable + pages mirror the existing `items`/`useItems.ts` pattern exactly, but with a deliberately small field set.

**Tech Stack:** Same stack as the rest of the app — Drizzle (schema/migration only), Neon Data API + Vue composables at runtime, Nitro server routes for R2 writes, `aws4fetch` for R2 signing (all already in place, no new dependencies).

**User decisions (already made):**
- Captions on the browse page are always-visible under each thumbnail, not hover-only.
- The reference site's images have two independent internal ID schemes (model/page id in the URL slug, unrelated per-photo id in each image filename) — no single ID to expose; a variant's "view original" is its own `image_url`, its "view listing" is its parent model's `source_url`.
- Server-side image import stores the fetched image in its original content-type (JPEG typically) — `toWebp()` is browser-Canvas-only and cannot run in a Nitro route, so re-encoding to WebP is out of scope here.
- Wishlist manual entries are deliberately simple (photo, name, estimated price, source link, notes) — no category/attributes richness like `items`.

---

## Context every task needs

- **Typecheck command is `npx tsc -b --force`** — `npx tsc --noEmit` is a silent no-op in this project (solution-style tsconfig). Never use it.
- Runtime data access always goes through `useNeon()` → `neon.from('table')...` (PostgREST-style, `{data,error}`, manual `if (error) throw error`). Drizzle is schema/migration tooling only.
- `db/schema.ts` currently ends with `diecastModels`/`diecastVariants` (read-only, `pgPolicy`-based RLS, no `user_id`). `items`, `walls`, `itemLinks`, `itemDocuments` are user-owned via `crudPolicy({ role: authenticatedRole, read: authUid(table.userId), modify: authUid(table.userId) })` from `drizzle-orm/neon` — the new `wishlistItems` table uses this exact same pattern (not `pgPolicy`), so its migration needs **no custom grants file** (unlike the diecast tables) — `crudPolicy` generates full RLS + grants automatically, confirmed by every existing `items`-like table in this project.
- Existing R2 helpers live in `server/utils/r2.ts`: `makeImageKey(userId)`, `isOwnedKey(key, userId)`, `objectUrl(endpoint, bucket, key)`, `getR2Client()`. The existing upload route is `server/api/upload.post.ts` (multipart, JWT-verified via `verifyNeonJwt`/`getNeonJwks` from `server/utils/neon-jwt.ts`), delete route is `server/api/images.delete.ts` (flat filename → route `/api/images`, method from `.delete.ts` suffix — this project's server routes are flat files, no subdirectories under `server/api/`).
- Commit after each task with `git commit --no-gpg-sign` (no signing key configured).

---

### Task 1: Schema — `items.sourceVariantId` + new `wishlist_items` table

**Goal:** Add the dedup-tracking column to `items` and a new user-owned `wishlist_items` table, migrated to the live Neon branch.

**Files:**
- Modify: `db/schema.ts`
- Create: `db/migrations/0006_*.sql` (auto-named by `drizzle-kit generate`)

**Acceptance Criteria:**
- [ ] `items` gets a new nullable column `source_variant_id uuid references diecast_variants(id) on delete set null`.
- [ ] `wishlist_items` table: `id uuid pk`, `user_id text not null default auth.user_id()`, `title text not null`, `estimated_price numeric(12,2)`, `source_url text`, `notes text`, `img_key text`, `source_variant_id uuid references diecast_variants(id) on delete set null`, `created_at`/`updated_at timestamptz`. RLS via `crudPolicy` exactly like `items` (read/modify both `authUid(table.userId)`), plus an index on `(user_id, created_at)` matching `items_user_id_idx`.
- [ ] `npx tsc -b --force` passes with zero errors.

**Verify:** `mcp__plugin_neon-plugin_neon__run_sql` (project `mute-rice-52151718`, database `neondb`) confirming: `items.source_variant_id` column exists with the FK; `wishlist_items` table exists with a `crud-authenticated-policy-*` style RLS policy set (same shape as `items`'s policies — check `pg_policies` for both tables side by side).

**Steps:**

- [ ] **Step 1: Edit `db/schema.ts`**

In the `items` table's column list, add `sourceVariantId` right after `imgKey: text('img_key'),`:

```ts
    imgKey: text('img_key'),
    sourceVariantId: uuid('source_variant_id').references(() => diecastVariants.id, { onDelete: 'set null' }),
```

(The forward reference to `diecastVariants`, defined later in the same file, is safe — Drizzle's `.references()` takes a thunk that's only invoked when the schema is actually introspected, by which point the whole module has finished evaluating top to bottom.)

At the very end of the file, after the existing `diecastVariants` export, add:

```ts
export const wishlistItems = pgTable(
  'wishlist_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().default(sql`auth.user_id()`),
    title: text('title').notNull(),
    estimatedPrice: numeric('estimated_price', { precision: 12, scale: 2 }),
    sourceUrl: text('source_url'),
    notes: text('notes'),
    imgKey: text('img_key'),
    sourceVariantId: uuid('source_variant_id').references(() => diecastVariants.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('wishlist_items_user_id_idx').on(table.userId, table.createdAt),
    crudPolicy({
      role: authenticatedRole,
      read: authUid(table.userId),
      modify: authUid(table.userId),
    }),
  ],
).enableRLS()
```

- [ ] **Step 2: Generate and apply the migration**

Run: `npm run db:generate` → expect a new `db/migrations/0006_*.sql` containing `ALTER TABLE items ADD COLUMN source_variant_id ...`, `CREATE TABLE wishlist_items ...`, the FK, the index, RLS enable + policies, and grants (all auto-generated by `crudPolicy` — no custom migration file needed this time).

Run: `npm run db:migrate`.

- [ ] **Step 3: Verify live**

Call `mcp__plugin_neon-plugin_neon__run_sql` (project `mute-rice-52151718`, db `neondb`):
```sql
select column_name, is_nullable, data_type from information_schema.columns where table_name = 'items' and column_name = 'source_variant_id';
select tablename, policyname, cmd, roles from pg_policies where tablename in ('items', 'wishlist_items') order by tablename;
select table_name, grantee, privilege_type from information_schema.role_table_grants where table_name = 'wishlist_items';
```
Expected: the column exists nullable uuid; `wishlist_items` has the same policy shape (roles, commands) as `items`; `authenticated` has full CRUD grants on `wishlist_items` (matching `items`, since `crudPolicy` handles both RLS and grants together, same as every other user-owned table).

- [ ] **Step 4: Typecheck and commit**

Run: `npx tsc -b --force` → 0 errors.

```bash
git add db/schema.ts db/migrations
git commit --no-gpg-sign -m "feat: add items.source_variant_id and wishlist_items table"
```

---

### Task 2: Server-side image import (copy a reference photo into R2)

**Goal:** A new authenticated route that fetches a `smalldiecastcorvettes.com` image server-side and re-uploads it into the user's own R2 space, plus the client-side composable call and the small `makeImageKey` extension it needs.

**Files:**
- Create: `server/api/import.post.ts`
- Modify: `server/utils/r2.ts` (extend `makeImageKey` with an optional extension)
- Modify: `app/composables/useImageUpload.ts` (add `importFromUrl`)

**Acceptance Criteria:**
- [ ] `makeImageKey(userId, ext = 'webp')` accepts an optional extension, defaulting to `'webp'` so the existing `server/api/upload.post.ts` call site (`makeImageKey(userId)`, no second arg) is unaffected.
- [ ] `POST /api/import` requires a valid JWT (same pattern as `upload.post.ts`), rejects any `sourceUrl` not starting with `https://smalldiecastcorvettes.com/` with 400, fetches the image server-side, validates its `content-type` against `['image/webp','image/png','image/jpeg']` and size against the same 8MB cap as `upload.post.ts`, uploads to R2 under `makeImageKey(userId, ext)` (ext derived from content-type), and returns `{ key, url }` in the same shape as the upload route.
- [ ] `useImageUpload.ts`'s new `importFromUrl(sourceUrl)` calls this route with the existing JWT-fetch pattern, returning the same `UploadResult` shape as `upload()`.
- [ ] `npx tsc -b --force` and `npm test` pass (existing r2/upload-related behavior unaffected — there are no dedicated tests for these files currently, so no existing test should change).

**Verify:** `npx tsc -b --force` → 0 errors. Live fetch-through-to-R2 verification is deferred to the final Task 9 (needs a real JWT + a real live scraped `image_url`).

**Steps:**

- [ ] **Step 1: Extend `server/utils/r2.ts`**

Current `makeImageKey`:
```ts
export function makeImageKey(userId: string): string {
  return `${userId}/${crypto.randomUUID()}.webp`
}
```

Change to:
```ts
export function makeImageKey(userId: string, ext: string = 'webp'): string {
  return `${userId}/${crypto.randomUUID()}.${ext}`
}
```

Leave every other export in this file untouched.

- [ ] **Step 2: Write `server/api/import.post.ts`**

```ts
const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
}
const SOURCE_ORIGIN = 'https://smalldiecastcorvettes.com/'
const MAX_BYTES = 8 * 1024 * 1024

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

  const body = await readBody<{ sourceUrl?: string }>(event)
  const sourceUrl = body?.sourceUrl
  if (!sourceUrl || !sourceUrl.startsWith(SOURCE_ORIGIN)) {
    throw createError({ statusCode: 400, statusMessage: `sourceUrl must start with ${SOURCE_ORIGIN}` })
  }

  const sourceRes = await fetch(sourceUrl)
  if (!sourceRes.ok) {
    throw createError({ statusCode: 502, statusMessage: `Failed to fetch source image: ${sourceRes.status}` })
  }

  const contentType = sourceRes.headers.get('content-type')?.split(';')[0]?.trim() ?? ''
  const ext = ALLOWED_CONTENT_TYPES[contentType]
  if (!ext) {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported image type' })
  }

  const buffer = Buffer.from(await sourceRes.arrayBuffer())
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'Image too large (max 8MB) or empty' })
  }

  const cfg = useRuntimeConfig()
  const key = makeImageKey(userId, ext)
  const client = getR2Client()
  const res = await client.fetch(objectUrl(cfg.r2.endpoint, cfg.r2.bucket, key), {
    method: 'PUT',
    body: buffer,
    headers: { 'Content-Type': contentType },
  })
  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: `R2 upload failed: ${res.status}` })
  }

  return { key, url: `${cfg.public.imageBaseUrl}/${key}` }
})
```

- [ ] **Step 3: Extend `app/composables/useImageUpload.ts`**

Read the current file first (it exports `upload`/`remove` from a `useImageUpload()` function). Add a new function inside `useImageUpload()`, alongside the existing ones:

```ts
async function importFromUrl(sourceUrl: string): Promise<UploadResult> {
  const jwt = await getJwt()
  if (!jwt) throw new Error('Not signed in')
  return await $fetch<UploadResult>('/api/import', {
    method: 'POST',
    body: { sourceUrl },
    headers: { Authorization: `Bearer ${jwt}` },
  })
}
```

Add `importFromUrl` to the object returned by `useImageUpload()`.

- [ ] **Step 4: Typecheck and commit**

Run: `npx tsc -b --force` → 0 errors. Run: `npm test` → unaffected (same count as before).

```bash
git add server/api/import.post.ts server/utils/r2.ts app/composables/useImageUpload.ts
git commit --no-gpg-sign -m "feat: add server-side image import from smalldiecastcorvettes.com into R2"
```

---

### Task 3: `Item`/`useItems` extension + `extractYearFromName` helper

**Goal:** Thread `sourceVariantId` through the `Item` type/row-mapping, and add the pure year-extraction helper the Add form will use.

**Files:**
- Modify: `app/utils/catalog.ts`
- Modify: `app/composables/useItems.ts`
- Modify: `app/utils/catalog.test.ts`
- Modify: `app/composables/useItems.test.ts`

**Acceptance Criteria:**
- [ ] `Item` interface gets `sourceVariantId: string | null`.
- [ ] `extractYearFromName(name: string): number | null` matches a confident 4-digit year (`19xx`/`20xx`) anywhere in the string, returns `null` if none found. Does NOT attempt to resolve 2-digit years (e.g. `"63 corvette"`, `"09 corvette stingray concept"`) — genuinely ambiguous between eras, left as `null` on purpose.
- [ ] `useItems.ts`'s `ItemRow` gets `source_variant_id: string | null`; `fromRow` maps it to `sourceVariantId` (passthrough, `null` stays `null`); `toPatch` maps `sourceVariantId` → `source_variant_id` when provided.
- [ ] `npx tsc -b --force` and `npm test` pass.

**Verify:** `npm test -- catalog` and `npm test -- useItems` → all pass, including new cases.

**Steps:**

- [ ] **Step 1: Edit `app/utils/catalog.ts`**

Read the file first to find the exact current `Item` interface (it currently ends with `imgKey: string | null; attributes: Record<string, unknown>` or similar — match the exact current field list you see, don't guess). Add one field to the interface:

```ts
  sourceVariantId: string | null
```

Add this new exported pure function (place it near other small pure helpers, e.g. next to `fmtMoney`/`fmtDate`):

```ts
export function extractYearFromName(name: string): number | null {
  const match = name.match(/\b(19|20)\d{2}\b/)
  return match ? Number(match[0]) : null
}
```

- [ ] **Step 2: Edit `app/composables/useItems.ts`**

Add to `ItemRow` (after `img_key: string | null`):
```ts
  source_variant_id: string | null
```

Add to `fromRow`'s returned object (after `imgKey: row.img_key`):
```ts
    sourceVariantId: row.source_variant_id ?? null,
```

Add to `toPatch`, alongside the other `if (input.x !== undefined)` lines:
```ts
  if (input.sourceVariantId !== undefined) patch.source_variant_id = input.sourceVariantId
```

- [ ] **Step 3: Update `app/utils/catalog.test.ts`**

Read the file first. The `item()` helper factory builds a full `Item` — add `sourceVariantId: null,` to its default object (before the `...overrides` spread), so every existing test keeps working unchanged.

Add a new `describe` block:
```ts
describe('extractYearFromName', () => {
  it('extracts a confident 4-digit year', () => {
    expect(extractYearFromName('1953 corvette')).toBe(1953)
    expect(extractYearFromName('1997 corvette')).toBe(1997)
  })
  it('returns null for ambiguous 2-digit year-like names', () => {
    expect(extractYearFromName('63 corvette')).toBeNull()
    expect(extractYearFromName('09 corvette stingray concept')).toBeNull()
  })
  it('returns null when there is no year at all', () => {
    expect(extractYearFromName('custom corvette')).toBeNull()
  })
})
```

Add `extractYearFromName` to the file's existing top import line from `./catalog`.

- [ ] **Step 4: Update `app/composables/useItems.test.ts`**

Read the file first. Add `source_variant_id: null,` to the base `row: ItemRow` fixture, and `sourceVariantId: null,` to the `fromRow` test's expected `toEqual` object.

Add one new test to the `fromRow` describe block:
```ts
  it('preserves a real source_variant_id', () => {
    expect(fromRow({ ...row, source_variant_id: 'variant-1' }).sourceVariantId).toBe('variant-1')
  })
```

Add one new test to the `toPatch` describe block:
```ts
  it('maps sourceVariantId to source_variant_id', () => {
    expect(toPatch({ sourceVariantId: 'variant-1' })).toEqual({ source_variant_id: 'variant-1' })
  })
```

- [ ] **Step 5: Run tests, typecheck, commit**

Run: `npm test -- catalog` and `npm test -- useItems` → all pass. Run: `npx tsc -b --force` → 0 errors.

```bash
git add app/utils/catalog.ts app/composables/useItems.ts app/utils/catalog.test.ts app/composables/useItems.test.ts
git commit --no-gpg-sign -m "feat: add Item.sourceVariantId and extractYearFromName helper"
```

---

### Task 4: `useWishlist.ts` composable

**Goal:** A `wishlist_items` CRUD composable mirroring `useItems.ts`'s exact shape.

**Files:**
- Create: `app/composables/useWishlist.ts`
- Create: `app/composables/useWishlist.test.ts`

**Acceptance Criteria:**
- [ ] `WishlistItemRow`/`WishlistItem` types match the schema: `id`, `userId`(only in row as `user_id`, not exposed on the client type — matches how `Item` never exposes `user_id` either), `title`, `estimatedPrice: number`, `sourceUrl: string`, `notes: string`, `imgKey: string | null`, `sourceVariantId: string | null`.
- [ ] `fromRow`/`toPatch` follow `useItems.ts`'s exact conventions (nullable numeric passthrough via `Number(x) || 0`, nullable text defaults to `''`, `imgKey`/`sourceVariantId` stay `null`-passthrough).
- [ ] `useWishlist()` exposes `items` (a `useState('wishlist:list', ...)` array, reactive), `loading`, `fetchAll`, `create`, `update`, `remove` — same signatures/behavior as `useItems()`.
- [ ] `npx tsc -b --force` and `npm test` pass.

**Verify:** `npm test -- useWishlist` → all pass.

**Steps:**

- [ ] **Step 1: Write `app/composables/useWishlist.ts`**

```ts
export interface WishlistItemRow {
  id: string
  user_id: string
  title: string
  estimated_price: string | number | null
  source_url: string | null
  notes: string | null
  img_key: string | null
  source_variant_id: string | null
  created_at: string
  updated_at: string
}

export interface WishlistItem {
  id: string
  title: string
  estimatedPrice: number
  sourceUrl: string
  notes: string
  imgKey: string | null
  sourceVariantId: string | null
}

export function fromRow(row: WishlistItemRow): WishlistItem {
  return {
    id: row.id,
    title: row.title,
    estimatedPrice: Number(row.estimated_price) || 0,
    sourceUrl: row.source_url ?? '',
    notes: row.notes ?? '',
    imgKey: row.img_key,
    sourceVariantId: row.source_variant_id,
  }
}

export function toPatch(input: Partial<WishlistItem>): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.estimatedPrice !== undefined) patch.estimated_price = input.estimatedPrice
  if (input.sourceUrl !== undefined) patch.source_url = input.sourceUrl
  if (input.notes !== undefined) patch.notes = input.notes
  if (input.imgKey !== undefined) patch.img_key = input.imgKey
  if (input.sourceVariantId !== undefined) patch.source_variant_id = input.sourceVariantId
  return patch
}

export function useWishlist() {
  const neon = useNeon()
  const items = useState<WishlistItem[]>('wishlist:list', () => [])
  const loading = useState<boolean>('wishlist:loading', () => false)

  async function fetchAll() {
    loading.value = true
    const { data, error } = await neon.from('wishlist_items').select('*').order('created_at', { ascending: false })
    loading.value = false
    if (error) throw error
    items.value = (data as WishlistItemRow[]).map(fromRow)
  }

  async function create(input: Omit<WishlistItem, 'id'>) {
    const { data, error } = await neon.from('wishlist_items').insert(toPatch(input)).select().single()
    if (error) throw error
    const item = fromRow(data as WishlistItemRow)
    items.value = [item, ...items.value]
    return item
  }

  async function update(id: string, patch: Partial<WishlistItem>) {
    const { data, error } = await neon.from('wishlist_items').update(toPatch(patch)).eq('id', id).select().single()
    if (error) throw error
    const updated = fromRow(data as WishlistItemRow)
    items.value = items.value.map((i) => (i.id === id ? updated : i))
    return updated
  }

  async function remove(id: string) {
    const { error } = await neon.from('wishlist_items').delete().eq('id', id)
    if (error) throw error
    items.value = items.value.filter((i) => i.id !== id)
  }

  return { items, loading, fetchAll, create, update, remove }
}
```

- [ ] **Step 2: Write `app/composables/useWishlist.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { fromRow, toPatch, type WishlistItemRow } from './useWishlist'

const row: WishlistItemRow = {
  id: 'wish-1', user_id: 'user-1', title: 'Corvette C8 1:18', estimated_price: '150.00',
  source_url: 'https://smalldiecastcorvettes.com/car/334_HW_CORVETTE_C7_Z06.html', notes: 'Waiting for a sale',
  img_key: 'user-1/abc.jpg', source_variant_id: 'variant-1',
  created_at: '2020-01-01T00:00:00Z', updated_at: '2020-01-01T00:00:00Z',
}

describe('fromRow', () => {
  it('maps snake_case DB columns to the camelCase WishlistItem shape', () => {
    expect(fromRow(row)).toEqual({
      id: 'wish-1', title: 'Corvette C8 1:18', estimatedPrice: 150,
      sourceUrl: 'https://smalldiecastcorvettes.com/car/334_HW_CORVETTE_C7_Z06.html',
      notes: 'Waiting for a sale', imgKey: 'user-1/abc.jpg', sourceVariantId: 'variant-1',
    })
  })
  it('defaults null price/text fields for a manual entry with no source', () => {
    const manual = { ...row, estimated_price: null, source_url: null, notes: null, img_key: null, source_variant_id: null }
    const mapped = fromRow(manual)
    expect(mapped.estimatedPrice).toBe(0)
    expect(mapped.sourceUrl).toBe('')
    expect(mapped.notes).toBe('')
    expect(mapped.imgKey).toBeNull()
    expect(mapped.sourceVariantId).toBeNull()
  })
})

describe('toPatch', () => {
  it('maps only the provided camelCase fields to snake_case columns', () => {
    expect(toPatch({ title: 'New Title', estimatedPrice: 200 })).toEqual({ title: 'New Title', estimated_price: 200 })
  })
  it('omits fields that were not provided', () => {
    expect(toPatch({ notes: 'A note' })).toEqual({ notes: 'A note' })
  })
})
```

- [ ] **Step 3: Run tests, typecheck, commit**

Run: `npm test -- useWishlist` → all pass. Run: `npx tsc -b --force` → 0 errors.

```bash
git add app/composables/useWishlist.ts app/composables/useWishlist.test.ts
git commit --no-gpg-sign -m "feat: add useWishlist composable"
```

---

### Task 5: `useDiecastReference.ts` — add `fetchVariant(id)`

**Goal:** A single-variant lookup, needed by the Add form's `fromVariant` flow.

**Files:**
- Modify: `app/composables/useDiecastReference.ts`

**Acceptance Criteria:**
- [ ] `fetchVariant(id: string): Promise<DiecastVariant | null>` added, same shape as the existing `fetchModel(id)` (`.eq('id', id).maybeSingle()`, throws on `error`, returns `null` if no row).
- [ ] `npx tsc -b --force` passes; `npm test` unaffected (no new pure mapping function introduced — `fetchVariant` reuses the existing `fromVariantRow`, matching why `fetchModel`/`fetchModels` have no dedicated tests either, only the pure row-mappers do).

**Verify:** `npx tsc -b --force` → 0 errors.

**Steps:**

- [ ] **Step 1: Read the current file, then add `fetchVariant`**

Add this function inside `useDiecastReference()`, alongside `fetchVariants`:

```ts
  async function fetchVariant(id: string): Promise<DiecastVariant | null> {
    const { data, error } = await neon.from('diecast_variants').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? fromVariantRow(data as DiecastVariantRow) : null
  }
```

Add `fetchVariant` to the object returned by `useDiecastReference()`.

- [ ] **Step 2: Typecheck and commit**

Run: `npx tsc -b --force` → 0 errors. Run: `npm test` → unaffected.

```bash
git add app/composables/useDiecastReference.ts
git commit --no-gpg-sign -m "feat: add fetchVariant to useDiecastReference"
```

---

### Task 6: Diecast Reference page rewrite (browse everything, dedup-aware)

**Ordering note:** this task deletes `app/components/DiecastLookupPicker.vue`, which `app/pages/add.vue` currently references via Nuxt's auto-imported-components mechanism (no explicit script import — Nuxt resolves `<DiecastLookupPicker>` in the template directly from `app/components/`). **Task 7 must be completed and committed before this task runs** — Task 7 removes that template usage from `add.vue`. If this task runs first, `add.vue` will reference a deleted component and the build will break until Task 7 lands. Do not dispatch this task and Task 7 in parallel; run Task 7 first.

**Goal:** Replace the two-page browse structure with one page showing every scraped picture, tabbed by manufacturer, grouped by model, always-visible captions, "already added" detection with click-through, and a one-click "add to Wishlist" per picture.

**Files:**
- Modify: `app/pages/diecast-reference/index.vue` (full rewrite)
- Delete: `app/pages/diecast-reference/[id].vue`
- Delete: `app/components/DiecastLookupPicker.vue`

**Acceptance Criteria:**
- [ ] Page fetches all models via `fetchModels()`, groups them by `manufacturer` for tabs. Tabs render even with only one manufacturer today.
- [ ] Variants are fetched lazily per active tab (only the models belonging to the currently-open manufacturer tab get their variants fetched, cached per-model afterward) — not all variants for all manufacturers up front.
- [ ] Within a tab, one section per model (model name as a heading), a grid of that model's variant thumbnails, each with its caption always visible underneath.
- [ ] Already-added detection: reads `useItems()`'s `items` and `useWishlist()`'s `items` (fetching each via `fetchAll()` if not already loaded), builds a lookup from `sourceVariantId` → `{ type, id }`. A thumbnail whose variant id is in that lookup shows a small "In Collection" or "In Wishlist" badge and links to `/collection/{id}` or `/wishlist/{id}` instead of being clickable-to-add.
- [ ] An unadded thumbnail is a `NuxtLink` to `/add?fromVariant={variantId}`, plus a small separate "+ Wishlist" button that calls `importFromUrl(variant.imageUrl)` then `useWishlist().create(...)` directly (no navigation), disabling itself while in flight and re-rendering as the "In Wishlist" badge on success.
- [ ] `app/pages/diecast-reference/[id].vue` and `app/components/DiecastLookupPicker.vue` no longer exist.
- [ ] `npx tsc -b --force` passes; `npm test` unaffected.

**Verify:** `npx tsc -b --force` → 0 errors; manual click-through deferred to Task 9.

**Steps:**

- [ ] **Step 1: Delete the superseded files**

```bash
git rm app/pages/diecast-reference/\[id\].vue app/components/DiecastLookupPicker.vue
```

- [ ] **Step 2: Rewrite `app/pages/diecast-reference/index.vue`**

```vue
<template>
  <div class="wrap" style="padding: 34px 26px 70px;">
    <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">Reference</div>
    <h2 style="font-size: clamp(38px, 6.5vw, 68px); line-height: 0.9; margin-bottom: 18px;">Diecast Reference</h2>
    <p style="font-style: italic; color: var(--muted); font-size: 16.5px; margin: 0 0 24px; max-width: 640px;">
      Every known diecast Corvette release, sourced from <a href="https://smalldiecastcorvettes.com" target="_blank" rel="noopener">smalldiecastcorvettes.com</a>. Click a picture to add it to your archive.
    </p>

    <div class="no-print" style="display: flex; gap: 8px; border-bottom: 2px solid var(--ink); margin-bottom: 24px;">
      <button
        v-for="m in manufacturers"
        :key="m"
        type="button"
        class="link-tab"
        :style="{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: m === activeManufacturer ? '3px solid var(--orange)' : '3px solid transparent', fontWeight: m === activeManufacturer ? 700 : 400 }"
        @click="activeManufacturer = m"
      >{{ m }}</button>
    </div>

    <div v-for="model in modelsForActiveTab" :key="model.id" style="margin-bottom: 36px;">
      <div class="kicker" style="color: var(--orange); margin-bottom: 12px;">{{ model.name }}</div>
      <div class="mag-grid">
        <div v-for="v in variantsByModel[model.id] ?? []" :key="v.id" class="editorial-card">
          <div class="editorial-card-photo photo-frame">
            <img :src="v.imageUrl" :alt="v.caption || model.name" class="editorial-card-img" />
            <div v-if="addedLookup.get(v.id)" style="position: absolute; top: 8px; left: 8px; background: var(--ink); color: var(--paper); font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; padding: 3px 7px; font-family: var(--font-cond);">
              {{ addedLookup.get(v.id)?.type === 'collection' ? 'In Collection' : 'In Wishlist' }}
            </div>
          </div>
          <div style="padding: 10px 12px; font-size: 13.5px; line-height: 1.4;">
            <p v-if="v.caption" style="margin: 0 0 8px;">{{ v.caption }}</p>
            <NuxtLink
              v-if="addedLookup.get(v.id)"
              :to="addedLookup.get(v.id)?.type === 'collection' ? `/collection/${addedLookup.get(v.id)?.id}` : `/wishlist/${addedLookup.get(v.id)?.id}`"
              class="btn ghost"
              style="font-size: 11px; padding: 5px 10px; display: inline-block;"
            >View entry →</NuxtLink>
            <div v-else style="display: flex; gap: 8px;">
              <NuxtLink :to="`/add?fromVariant=${v.id}`" class="btn primary" style="font-size: 11px; padding: 5px 10px;">+ Collection</NuxtLink>
              <button
                type="button"
                class="btn ghost"
                style="font-size: 11px; padding: 5px 10px;"
                :disabled="wishlistBusy.has(v.id)"
                :style="{ opacity: wishlistBusy.has(v.id) ? 0.5 : 1 }"
                @click="addToWishlist(v, model)"
              >{{ wishlistBusy.has(v.id) ? 'Adding…' : '+ Wishlist' }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <p v-if="!loadingModels && models.length === 0" style="font-style: italic; color: var(--muted);">No reference models yet — run the scraper.</p>
  </div>
</template>

<script setup lang="ts">
import type { DiecastModel, DiecastVariant } from '~/composables/useDiecastReference'

const { fetchModels, fetchVariants } = useDiecastReference()
const { items: collectionItems, fetchAll: fetchCollectionItems } = useItems()
const { items: wishlistItemsList, fetchAll: fetchWishlistItems, create: createWishlistItem } = useWishlist()
const { importFromUrl } = useImageUpload()

const models = ref<DiecastModel[]>([])
const loadingModels = ref(false)
const variantsByModel = ref<Record<string, DiecastVariant[]>>({})
const fetchedModelIds = new Set<string>()
const wishlistBusy = ref<Set<string>>(new Set())

loadingModels.value = true
try {
  models.value = await fetchModels()
} catch (err) {
  console.warn('Failed to load diecast reference models:', err)
} finally {
  loadingModels.value = false
}

try {
  if (!collectionItems.value.length) await fetchCollectionItems()
} catch (err) {
  console.warn('Failed to load collection items for dedup check:', err)
}
try {
  if (!wishlistItemsList.value.length) await fetchWishlistItems()
} catch (err) {
  console.warn('Failed to load wishlist items for dedup check:', err)
}

const manufacturers = computed(() => [...new Set(models.value.map((m) => m.manufacturer))])
const activeManufacturer = ref<string>('')
watch(manufacturers, (list) => {
  if (!activeManufacturer.value && list.length) activeManufacturer.value = list[0]!
}, { immediate: true })

const modelsForActiveTab = computed(() => models.value.filter((m) => m.manufacturer === activeManufacturer.value))

watch(modelsForActiveTab, async (modelsInTab) => {
  const toFetch = modelsInTab.filter((m) => !fetchedModelIds.has(m.id))
  for (const model of toFetch) {
    fetchedModelIds.add(model.id)
    try {
      variantsByModel.value[model.id] = await fetchVariants(model.id)
    } catch (err) {
      console.warn(`Failed to load variants for ${model.name}:`, err)
    }
  }
}, { immediate: true })

const addedLookup = computed(() => {
  const map = new Map<string, { type: 'collection' | 'wishlist'; id: string }>()
  for (const item of collectionItems.value) {
    if (item.sourceVariantId) map.set(item.sourceVariantId, { type: 'collection', id: item.id })
  }
  for (const item of wishlistItemsList.value) {
    if (item.sourceVariantId) map.set(item.sourceVariantId, { type: 'wishlist', id: item.id })
  }
  return map
})

async function addToWishlist(variant: DiecastVariant, model: DiecastModel) {
  if (wishlistBusy.value.has(variant.id)) return
  wishlistBusy.value = new Set(wishlistBusy.value).add(variant.id)
  try {
    const imported = await importFromUrl(variant.imageUrl)
    await createWishlistItem({
      title: model.name, estimatedPrice: 0, sourceUrl: model.sourceUrl,
      notes: variant.caption ?? '', imgKey: imported.key, sourceVariantId: variant.id,
    })
  } catch (err) {
    console.warn('Failed to add reference picture to wishlist:', err)
  } finally {
    const next = new Set(wishlistBusy.value)
    next.delete(variant.id)
    wishlistBusy.value = next
  }
}
</script>
```

- [ ] **Step 3: Typecheck and confirm nothing else references the deleted files**

Run: `grep -rn "DiecastLookupPicker\|diecast-reference/\[id\]" app/` → expect **zero matches**. If `app/pages/add.vue` still shows a match, STOP — Task 7 has not landed yet and you must not proceed with this task until it has (see the Ordering note above).

Run: `npx tsc -b --force` → 0 errors.

Run: `npm test` → unaffected.

- [ ] **Step 4: Commit**

```bash
git add -A app/pages/diecast-reference app/components/DiecastLookupPicker.vue
git commit --no-gpg-sign -m "feat: rewrite diecast reference as one browse-and-import page with dedup detection"
```

---

### Task 7: Add form — remove picker, add `fromVariant` import+prefill flow

**Goal:** Remove the old picker integration; when arriving via `?fromVariant=<id>`, import the photo into R2, prefill fields, and persist the dedup link on save.

**Files:**
- Modify: `app/pages/add.vue`

**Acceptance Criteria:**
- [ ] The "🔍 Look up a reference model" button, its wrapper div, the `<DiecastLookupPicker>` usage, the `useDiecastReference`/`DiecastModel` import, and the `showDiecastPicker`/`diecastModels`/`openDiecastPicker`/`applyDiecastModel` code are all removed.
- [ ] On setup, if `route.query.fromVariant` is present: fetch the variant and its parent model; set `previewUrl` immediately to the variant's live `imageUrl` (instant visual feedback); in the background call `importFromUrl(variant.imageUrl)`, and on success set `uploadedKey` to the real R2 key and swap `previewUrl` to the imported R2 URL; on failure, `console.warn` and leave the form photo-less (non-fatal, matches this app's established pattern).
- [ ] Prefill only empty fields: `form.title` (if empty) = model name, `form.maker` (if empty) = manufacturer, `form.year` (if empty) = `extractYearFromName(model.name)` when non-null. `form.story` gets a `Reference: <model.sourceUrl>` line appended (same non-clobbering append rule the old picker used).
- [ ] A `sourceVariantId` value (the variant's id) is threaded through to `create()` so the saved item carries the dedup link.
- [ ] `npx tsc -b --force` passes; `npm test` unaffected.

**Verify:** `npx tsc -b --force` → 0 errors; manual click-through deferred to Task 9.

**Steps:**

- [ ] **Step 1: Read the current `app/pages/add.vue` in full first**

Confirm it still has exactly the picker-related lines described in this plan's Context (the button before "General", the `<DiecastLookupPicker>` at the end of the template, the import line, and the `showDiecastPicker`/`diecastModels`/`openDiecastPicker`/`applyDiecastModel` block) — if Task 6 already ran and removed `DiecastLookupPicker.vue`, this file will currently fail to typecheck/import; that's expected, this task fixes it.

- [ ] **Step 2: Remove the picker from the template**

Delete this block entirely (the button before "General"):
```html
        <div v-if="form.category === 'DIECAST'" class="no-print" style="margin-bottom: 18px;">
          <button type="button" class="btn ghost" style="font-size: 12px; padding: 7px 13px; border-color: var(--ink);" @click="openDiecastPicker">🔍 Look up a reference model</button>
        </div>
```

Delete this line (the picker modal, alongside `<SlotPicker>`):
```html
    <DiecastLookupPicker v-if="showDiecastPicker" :models="diecastModels" @close="showDiecastPicker = false" @pick="applyDiecastModel" />
```

- [ ] **Step 3: Remove the picker from the script**

Delete this import line entirely:
```ts
import { useDiecastReference, type DiecastModel } from '~/composables/useDiecastReference'
```

Delete this whole block:
```ts
const { fetchModels: fetchDiecastModels } = useDiecastReference()
const showDiecastPicker = ref(false)
const diecastModels = ref<DiecastModel[]>([])

async function openDiecastPicker() {
  if (!diecastModels.value.length) {
    try {
      diecastModels.value = await fetchDiecastModels('Hot Wheels')
    } catch (err) {
      console.warn('Failed to load diecast reference models:', err)
    }
  }
  showDiecastPicker.value = true
}

function applyDiecastModel(m: DiecastModel) {
  if (!form.title.trim()) form.title = m.name
  if (!form.maker.trim()) form.maker = m.manufacturer
  const referenceLine = `Reference: ${m.sourceUrl}`
  form.story = form.story.trim() ? `${form.story}\n${referenceLine}` : referenceLine
  showDiecastPicker.value = false
}
```

- [ ] **Step 4: Add the `fromVariant` import+prefill flow**

Add this import at the top of the script (the catalog import line already exists — add `extractYearFromName` to it, don't duplicate the line):
```ts
import { CATEGORIES, CATEGORY_FIELDS, CATEGORY_HAS_GENERATION, CAR_CATEGORIES, GENERATIONS, GEN_ORDER, DIECAST_GRADE_SCALE, DIECAST_GRADE_SCALE_ATTRIBUTION, gradeLabel, extractYearFromName, type Category, type Generation, type FieldDef } from '~/utils/catalog'
```

Add this block right after the existing `pendingFile`/`previewUrl`/`uploading`/`uploadedKey` declarations (reuses `uploadedKey`, `previewUrl` — do not redeclare them):
```ts
const route = useRoute()
const { fetchVariant, fetchModel } = useDiecastReference()
const { importFromUrl } = useImageUpload()
const sourceVariantId = ref<string | null>(null)

const fromVariantId = route.query.fromVariant
if (typeof fromVariantId === 'string') {
  try {
    const variant = await fetchVariant(fromVariantId)
    if (variant) {
      sourceVariantId.value = variant.id
      previewUrl.value = variant.imageUrl
      const model = await fetchModel(variant.modelId)
      if (model) {
        if (!form.title.trim()) form.title = model.name
        if (!form.maker.trim()) form.maker = model.manufacturer
        const year = extractYearFromName(model.name)
        if (year && !String(form.year).trim()) form.year = String(year)
        const referenceLine = `Reference: ${model.sourceUrl}`
        form.story = form.story.trim() ? `${form.story}\n${referenceLine}` : referenceLine
      }
      try {
        const imported = await importFromUrl(variant.imageUrl)
        uploadedKey = imported.key
        previewUrl.value = imported.url
      } catch (err) {
        console.warn('Failed to import reference photo into R2:', err)
      }
    }
  } catch (err) {
    console.warn('Failed to load reference variant for prefill:', err)
  }
}
```

Note: this file already imports/uses `useItems`, `useImageUpload`, `useDocumentUpload`, `useItemDocuments`, `useItemLinks` as auto-imported composables (no explicit import statements for any of them) — `useDiecastReference` needs to stay auto-imported the same way (do not add an explicit import for it beyond the type-only pieces you might need; `fetchVariant`/`fetchModel` come from calling `useDiecastReference()` directly, matching how `useItems()` is already called elsewhere in this file).

- [ ] **Step 5: Persist `sourceVariantId` on save**

In `onSave()`, find the `create({...})` call and add `sourceVariantId: sourceVariantId.value,` to the object passed in (anywhere in the object literal, e.g. right after `imgKey: uploadedKey,`).

- [ ] **Step 6: Typecheck, test, commit**

Run: `npx tsc -b --force` → 0 errors. Run: `npm test` → unaffected.

```bash
git add app/pages/add.vue
git commit --no-gpg-sign -m "feat: replace Add-form picker with fromVariant import+prefill flow"
```

---

### Task 8: Wishlist pages + modal + nav

**Goal:** A browsable wishlist with manual-add support, mirroring `collection/index.vue`/`collection/[id].vue`'s established patterns.

**Files:**
- Create: `app/pages/wishlist/index.vue`
- Create: `app/pages/wishlist/[id].vue`
- Create: `app/components/WishlistAddModal.vue`
- Modify: `app/components/SectionTabs.vue`

**Acceptance Criteria:**
- [ ] `/wishlist` fetches `useWishlist().fetchAll()` if empty, renders a `.mag-grid` of `.editorial-card`s (photo, title, estimated price if > 0, "Sourced" badge if `sourceUrl` present), each linking to `/wishlist/[id]`, plus a "+ Add to Wishlist" button opening `WishlistAddModal`.
- [ ] `WishlistAddModal.vue` (`.modal-scrim`/`.modal-card` pattern): file-upload photo (reuses `useImageUpload().upload`, real user upload, not `importFromUrl`), title (required), estimated price, source link, notes. Emits `close` and `saved` (after successfully calling `useWishlist().create(...)`).
- [ ] `/wishlist/[id]` shows the entry (photo, title, price formatted via the existing `fmtMoney` from `catalog.ts`, source link as a real clickable `<a>` if present, notes), a not-found state matching `collection/[id].vue`'s pattern, and a delete control that removes the row via `useWishlist().remove(id)` then cleans up its R2 photo via `useImageUpload().remove(imgKey)` if present (mirroring `collection/[id].vue`'s `onDelete` exactly), then navigates to `/wishlist`.
- [ ] `SectionTabs.vue` gets a new tab `{ id: 'wishlist', label: 'Wishlist', num: '06', to: '/wishlist' }`, `isActive` matching `route.path.startsWith('/wishlist')`.
- [ ] `npx tsc -b --force` passes; `npm test` unaffected.

**Verify:** `npx tsc -b --force` → 0 errors; manual click-through deferred to Task 9.

**Steps:**

- [ ] **Step 1: Write `app/components/WishlistAddModal.vue`**

```vue
<template>
  <div class="modal-scrim no-print" @click="$emit('close')">
    <div class="modal-card" @click.stop>
      <div style="background: var(--orange); color: var(--paper); padding: 12px 18px; display: flex; justify-content: space-between; align-items: center;">
        <span class="kicker" style="letter-spacing: 0.18em; font-size: 12px;">Add to Wishlist</span>
        <button class="icon-btn" style="background: transparent; color: var(--paper); border-color: var(--paper);" @click="$emit('close')">✕</button>
      </div>
      <div style="padding: 18px; display: flex; flex-direction: column; gap: 14px;">
        <label style="display: block;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Photo</span>
          <input type="file" accept="image/*" @change="onFile" />
        </label>
        <label style="display: block;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Name *</span>
          <input v-model="title" placeholder="e.g. 1967 L88 Coupe" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16px; width: 100%;" />
        </label>
        <label style="display: block;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Estimated Price ($)</span>
          <input v-model="estimatedPrice" type="number" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16px; width: 100%;" />
        </label>
        <label style="display: block;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Source Link</span>
          <input v-model="sourceUrl" placeholder="https://…" style="border-bottom: 1.5px solid var(--rule); padding: 5px 2px; font-size: 16px; width: 100%;" />
        </label>
        <label style="display: block;">
          <span class="kicker" style="color: var(--muted); font-size: 10px; display: block; margin-bottom: 3px;">Notes</span>
          <textarea v-model="notes" rows="2" style="border-bottom: 1.5px solid var(--rule); padding: 6px 2px; font-size: 15px; width: 100%;" />
        </label>
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button class="btn ghost" @click="$emit('close')">Cancel</button>
          <button class="btn primary" :disabled="!title.trim() || saving" @click="onSave">{{ saving ? 'Saving…' : 'Add' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{ close: []; saved: [] }>()
const { upload } = useImageUpload()
const { create } = useWishlist()

const pendingFile = ref<File | null>(null)
const title = ref('')
const estimatedPrice = ref('')
const sourceUrl = ref('')
const notes = ref('')
const saving = ref(false)

function onFile(e: Event) {
  pendingFile.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

async function onSave() {
  if (!title.value.trim() || saving.value) return
  saving.value = true
  try {
    let imgKey: string | null = null
    if (pendingFile.value) {
      const result = await upload(pendingFile.value)
      imgKey = result.key
    }
    await create({
      title: title.value, estimatedPrice: Number(estimatedPrice.value) || 0,
      sourceUrl: sourceUrl.value, notes: notes.value, imgKey, sourceVariantId: null,
    })
    emit('saved')
  } finally {
    saving.value = false
  }
}
</script>
```

- [ ] **Step 2: Write `app/pages/wishlist/index.vue`**

```vue
<template>
  <div class="wrap" style="padding: 34px 26px 70px;">
    <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">Section Five</div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 18px;">
      <h2 style="font-size: clamp(38px, 6.5vw, 68px); line-height: 0.9;">Wishlist</h2>
      <button class="btn primary no-print" @click="showModal = true">+ Add to Wishlist</button>
    </div>

    <div class="mag-grid">
      <NuxtLink v-for="w in items" :key="w.id" :to="`/wishlist/${w.id}`" class="editorial-card" style="text-decoration: none; color: inherit;">
        <div class="editorial-card-photo photo-frame">
          <img v-if="w.imgKey" :src="`${imageBaseUrl}/${w.imgKey}`" :alt="w.title" class="editorial-card-img" />
          <div v-else class="editorial-card-placeholder">No photo yet</div>
        </div>
        <div style="padding: 10px 12px;">
          <div style="font-family: var(--font-display); font-weight: 700; font-size: 17px; line-height: 1.1; margin-bottom: 4px;">{{ w.title }}</div>
          <div v-if="w.estimatedPrice > 0" class="kicker" style="color: var(--muted); font-size: 11px;">{{ fmtMoney(w.estimatedPrice) }}</div>
        </div>
      </NuxtLink>
    </div>
    <p v-if="items.length === 0" style="font-style: italic; color: var(--muted);">Nothing on your wishlist yet.</p>

    <WishlistAddModal v-if="showModal" @close="showModal = false" @saved="showModal = false" />
  </div>
</template>

<script setup lang="ts">
import { fmtMoney } from '~/utils/catalog'

const { items, fetchAll } = useWishlist()
const showModal = ref(false)
const cfg = useRuntimeConfig()
const imageBaseUrl = cfg.public.imageBaseUrl

if (!items.value.length) {
  try {
    await fetchAll()
  } catch (err) {
    console.warn('Failed to load wishlist items:', err)
  }
}
</script>
```

- [ ] **Step 3: Write `app/pages/wishlist/[id].vue`**

```vue
<template>
  <div v-if="item" class="wrap" style="padding: 26px 26px 70px;">
    <NuxtLink to="/wishlist" class="link-tab no-print" style="color: var(--orange); margin-bottom: 20px; display: inline-block;">← Back to Wishlist</NuxtLink>
    <button class="link-tab no-print" style="color: var(--muted); margin-bottom: 20px; margin-left: 16px; background: none; border: none;" @click="onDelete">Remove from Wishlist</button>

    <h2 style="font-size: clamp(34px, 5vw, 52px); line-height: 0.92; margin-bottom: 20px;">{{ item.title }}</h2>

    <div class="editorial-card-photo photo-frame" style="max-width: 420px; margin-bottom: 18px;">
      <img v-if="item.imgKey" :src="`${imageBaseUrl}/${item.imgKey}`" :alt="item.title" class="editorial-card-img" />
      <div v-else class="editorial-card-placeholder">No photo yet</div>
    </div>

    <p v-if="item.estimatedPrice > 0" style="font-size: 18px; margin: 0 0 10px;">Estimated: {{ fmtMoney(item.estimatedPrice) }}</p>
    <a v-if="item.sourceUrl" :href="item.sourceUrl" target="_blank" rel="noopener" class="btn ghost" style="display: inline-flex; margin-bottom: 14px;">View source →</a>
    <p v-if="item.notes" style="font-style: italic; line-height: 1.5;">{{ item.notes }}</p>
  </div>
  <div v-else class="wrap" style="padding: 60px 26px;">
    <p style="font-style: italic; color: var(--muted);">That wishlist entry doesn't exist.</p>
    <NuxtLink to="/wishlist" class="btn" style="margin-top: 16px;">← Back to Wishlist</NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { fmtMoney } from '~/utils/catalog'

const route = useRoute()
const { items, fetchAll, remove: removeWishlistItem } = useWishlist()
const { remove: removeImage } = useImageUpload()
const cfg = useRuntimeConfig()
const imageBaseUrl = cfg.public.imageBaseUrl

if (!items.value.length) {
  try {
    await fetchAll()
  } catch (err) {
    console.warn('Failed to load wishlist items:', err)
  }
}

const item = computed(() => items.value.find((i) => i.id === route.params.id) || null)

async function onDelete() {
  if (!item.value) return
  if (!window.confirm(`Remove "${item.value.title}" from your wishlist? This can't be undone.`)) return
  const imgKey = item.value.imgKey
  await removeWishlistItem(item.value.id)
  if (imgKey) {
    try {
      await removeImage(imgKey)
    } catch (err) {
      console.warn('Failed to remove R2 image after wishlist delete:', err)
    }
  }
  await navigateTo('/wishlist')
}
</script>
```

- [ ] **Step 4: Update `app/components/SectionTabs.vue`**

Read the current file first. Add one entry to the `tabs` array (after the `diecast-reference` entry):
```ts
  { id: 'wishlist', label: 'Wishlist', num: '06', to: '/wishlist' },
```

Add one branch to `isActive`, alongside the `diecast-reference` branch:
```ts
  if (id === 'wishlist') return route.path.startsWith('/wishlist')
```

- [ ] **Step 5: Typecheck, test, commit**

Run: `npx tsc -b --force` → 0 errors. Run: `npm test` → unaffected.

```bash
git add app/pages/wishlist app/components/WishlistAddModal.vue app/components/SectionTabs.vue
git commit --no-gpg-sign -m "feat: add Wishlist pages, add-modal, and nav entry"
```

---

### Task 9: Full verification pass (live click-through, R2 import, dedup, RLS)

**Goal:** Confirm the whole redesign works end-to-end against the real live site, database, and R2 bucket.

**Files:** none (verification only).

**Acceptance Criteria:**
- [ ] `npx tsc -b --force` → 0 errors.
- [ ] `npm test` → all pass (existing + all new tests from Tasks 3, 4).
- [ ] `npm run build` → completes with no errors.
- [ ] Live: on `/diecast-reference`, an unadded picture's "+ Collection" link lands on `/add` with a real preview photo (initially the live hotlink, then swapped to the imported R2 URL), Title/Maker/Year/Notes prefilled from the source model.
- [ ] Live: saving that Add form produces an `items` row whose `img_key` points at a real R2 object (not the external URL) and whose `source_variant_id` matches the clicked variant (confirm via Neon MCP `run_sql`).
- [ ] Live: revisiting `/diecast-reference` shows that exact picture now badged "In Collection", and its "View entry →" link opens the correct item.
- [ ] Live: clicking "+ Wishlist" on a different unadded picture creates a `wishlist_items` row with a real R2 `img_key` (confirm via Neon MCP), without navigating away from the reference page, and the picture becomes badged "In Wishlist" on the same page without a full reload.
- [ ] Live: manually adding a Wishlist entry via `WishlistAddModal` (own photo, no source) saves, displays on `/wishlist` and its detail page, and deletes cleanly (confirm the R2 object is actually gone after delete, via a HEAD request or Neon-independent check against the R2 bucket key).
- [ ] Live RLS: a second, fresh test account sees an empty `/wishlist` and shows no "already added" badges on the same reference pictures the first account added (dedup state is correctly per-user).

**Verify:** All bullets above pass; report any failures with exact output before considering this task complete.

**Steps:**

- [ ] **Step 1: Automated checks**

Run `npx tsc -b --force`, `npm test`, `npm run build` → expect all clean.

- [ ] **Step 2: Live click-through via curl + a real JWT**

Reuse the established technique from this project's earlier features: sign up a test account against the live Neon Auth endpoint, capture its JWT via `/get-session`, then drive the same requests the UI would make:
1. `GET` a real `diecast_variants` row's id + `image_url` from the Data API (or Neon MCP `run_sql`) to use as the test variant.
2. `POST /api/import` with that JWT and `{ sourceUrl: <that image_url> }` → confirm `{ key, url }` comes back and the key is under that user's own prefix.
3. `POST` an `items` row via the Data API with `img_key` = the returned key and `source_variant_id` = the variant's id (simulating what the Add form's save does) → confirm 201.
4. Re-fetch that `items` row and confirm `source_variant_id` matches.
5. Repeat a similar flow inserting directly into `wishlist_items` with a different variant, confirming the row and its `img_key`.
6. Sign up a second fresh test account, confirm its own `items`/`wishlist_items` queries return empty (RLS unaffected by any of this).

- [ ] **Step 3: Manual smoke test via the dev server**

Start the dev server, sign in as the first test account, visit `/diecast-reference`, click through "+ Collection" on a fresh (not-yet-used-in-step-2) picture, confirm the Add form behaves as described, save it, revisit `/diecast-reference` and confirm the "In Collection" badge appears and links correctly. Repeat for "+ Wishlist" on another picture. Add one manual Wishlist entry via the modal and confirm its full life cycle (view, delete with R2 cleanup).

- [ ] **Step 4: Report and clean up**

If any step surfaces a bug, fix it in the relevant task's files, re-verify, and commit the fix with a message describing what was wrong. Delete any test items/wishlist entries/accounts created purely for verification. Once everything passes, no further commit is needed for this task itself.

---

## Self-review notes

- **Spec coverage:** every numbered requirement from the Context is covered — picker removal (Task 7), one-page browse-by-tab-then-model with always-visible captions (Task 6), click-to-import-and-prefill (Tasks 2, 3, 7), already-added detection + click-through (Tasks 3, 6), Wishlist with one-click-from-reference and manual add (Tasks 4, 6, 8).
- **Type consistency checked:** `sourceVariantId` (camelCase) / `source_variant_id` (snake_case) used identically across `Item`, `useItems.ts`, `WishlistItem`, `useWishlist.ts`, and the diecast-reference page's `addedLookup`. `DiecastVariant`/`DiecastModel` field names (`imageUrl`, `sourceUrl`, `manufacturer`, `name`, `caption`, `modelId`) match their existing definitions in `useDiecastReference.ts` exactly — no new/renamed fields invented there.
- **No placeholders:** every step has complete, copy-pasteable code; Task 9's live-verification steps name concrete requests/responses to check, not vague "make sure it works" language.
