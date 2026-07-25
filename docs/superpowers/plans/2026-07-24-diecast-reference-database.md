# Diecast Reference Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browsable/searchable reference database of diecast Corvette models scraped from `smalldiecastcorvettes.com` (Hot Wheels only, pilot scope), plus a search-and-prefill helper on the Add form.

**Architecture:** Two new shared (not user-owned) tables — `diecast_models`/`diecast_variants` — populated by a standalone Node scraper script that never runs inside the live app. A read-only composable and two new pages expose the data; a small picker component reuses that data to prefill the Add form's Title/Maker/Notes fields when cataloging a Diecast item. Images are hotlinked to the source site, never re-hosted.

**Tech Stack:** Drizzle ORM (schema/migration only, as elsewhere in this app), `postgres` npm package (already a dev dependency) for the scraper's DB writes, new `cheerio` dev dependency for HTML parsing, Neon Data API + Vue for the app-facing read side.

**User decisions (already made):**
- Purpose: reference catalog **and** Add-form autofill (both) — not one or the other.
- Images: link to the original site, do not re-host in R2.
- Scope: pilot with Hot Wheels only (~52 model pages confirmed by direct fetch, not ~60 as first estimated) — no other manufacturer is scraped in this plan.
- The site has no `robots.txt` and no API — it's a hand-built, old-school HTML site (unquoted attributes, malformed nested tables). Real raw HTML was fetched directly (not through an AI summarizer) and is saved as test fixtures at `scripts/diecast-scraper/fixtures/manufacturer-list.html` and `scripts/diecast-scraper/fixtures/model-detail.html` — these are actual bytes from the live site, already committed to the repo, and every parsing task below is tested against them.
- The site provides no explicit "title" per model page — the model name must be derived from the URL slug (e.g. `car/4_HW_1953_corvette.html` → `"1953 corvette"`). This is a real limitation of the source data, not a simplification we chose.
- Each detail page can show a variant with up to 2 images (front/back). This plan captures only the first (primary) image per variant row — the secondary angle is skipped to keep the schema simple (1 variant row = 1 image + 1 caption). This is a deliberate scope decision, not an oversight.

---

## Context every task needs

- **Typecheck command is `npx tsc -b --force`** — `npx tsc --noEmit` is a silent no-op in this project (solution-style tsconfig). Never use it.
- Runtime data access in Vue/Nuxt code always goes through `useNeon()` → `neon.from('table')...`, a PostgREST-style builder (`.select()`, `.eq()`, `.insert()`, `.maybeSingle()`, `.order()`), returning `{ data, error }` — never throws, callers check `error` and throw manually. Drizzle (`db/schema.ts`, `drizzle-kit`) is schema/migration tooling only, never used at runtime in Vue/Nitro code.
- The **scraper is different**: it's a standalone Node script, never imported by the app, and writes directly via the `postgres` npm package using `DATABASE_URL` (bypassing RLS as the table owner — the same connection already used by `drizzle-kit migrate`). It is not type-checked by `npx tsc -b --force` (plain `.mjs`, no `tsconfig` reference) and is not part of the Nuxt build.
- `db/schema.ts` currently defines `items`, `walls`, `itemLinks`, `itemDocuments` — all user-owned, all RLS'd via `crudPolicy({ role: authenticatedRole, read: authUid(table.userId), modify: authUid(table.userId) })` from `drizzle-orm/neon`. The new tables in this plan are **not** user-owned (no `user_id` column) so they use the lower-level `pgPolicy()` from `drizzle-orm/pg-core` directly instead — confirmed available in the installed `drizzle-orm@0.45.2` (`node -e "console.log(typeof require('drizzle-orm/pg-core').pgPolicy)"` → `function`).
- `vitest.config.ts` has `include: ['**/*.test.ts']` with no path restriction — a `.test.ts` file anywhere in the repo (including `scripts/`) is picked up by `npm test`.
- Commit after each task with `git commit --no-gpg-sign` (no signing key configured, unsigned is fine per repo convention).

---

### Task 1: Database schema — `diecast_models`/`diecast_variants`, RLS, migration

**Goal:** Add the two new reference tables to `db/schema.ts` with select-only RLS for `authenticated`, generate and apply the migration, verify on the live Neon branch.

**Files:**
- Modify: `db/schema.ts`
- Create: `db/migrations/000X_*.sql` (auto-named by `drizzle-kit generate`)
- Create: `db/migrations/000X_diecast_reference_grants.sql` (custom migration)

**Acceptance Criteria:**
- [ ] `diecast_models` table: `id uuid pk default gen_random_uuid()`, `manufacturer text not null`, `name text not null`, `source_url text not null unique`, `cover_image_url text` (nullable — the first variant's image, denormalized so the index page can show a thumbnail without an N+1 query), `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`. RLS enabled, `select`-only policy for `authenticated` using `pgPolicy` (`using: sql\`true\``).
- [ ] `diecast_variants` table: `id uuid pk default gen_random_uuid()`, `model_id uuid not null references diecast_models(id) on delete cascade`, `caption text` (nullable), `image_url text not null`, `sort_order integer not null default 0`, `created_at timestamptz not null default now()`. Same RLS pattern, plus an index on `model_id`.
- [ ] `authenticated` role has `select` (only) granted on both tables via a custom migration; `anonymous` has nothing.
- [ ] `npx tsc -b --force` passes with zero errors.

**Verify:** `mcp__plugin_neon-plugin_neon__run_sql` (project `mute-rice-52151718`, database `neondb`) confirming both tables exist, both have a `select`-only policy for `authenticated`, and `information_schema.role_table_grants` shows only `SELECT` for `authenticated` and nothing for `anonymous`.

**Steps:**

- [ ] **Step 1: Edit `db/schema.ts`**

Add `pgPolicy` to the `drizzle-orm/pg-core` import line (it currently imports `pgTable, uuid, text, integer, smallint, numeric, boolean, date, timestamp, jsonb, index, unique, check`):

```ts
import {
  pgTable, uuid, text, integer, smallint, numeric, boolean, date, timestamp, jsonb, index, unique, check, pgPolicy,
} from 'drizzle-orm/pg-core'
```

At the end of the file, after the existing `itemDocuments` table, add:

```ts
export const diecastModels = pgTable(
  'diecast_models',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    manufacturer: text('manufacturer').notNull(),
    name: text('name').notNull(),
    sourceUrl: text('source_url').notNull().unique(),
    coverImageUrl: text('cover_image_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    pgPolicy('diecast_models_select_authenticated', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS()

export const diecastVariants = pgTable(
  'diecast_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    modelId: uuid('model_id').notNull().references(() => diecastModels.id, { onDelete: 'cascade' }),
    caption: text('caption'),
    imageUrl: text('image_url').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('diecast_variants_model_id_idx').on(table.modelId),
    pgPolicy('diecast_variants_select_authenticated', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS()
```

- [ ] **Step 2: Generate the migration**

Run: `npm run db:generate`
Expected: a new `db/migrations/000X_*.sql` with `CREATE TABLE diecast_models`, `CREATE TABLE diecast_variants`, the FK, the index, and both `CREATE POLICY ... FOR SELECT TO authenticated USING (true)` statements.

- [ ] **Step 3: Write the grants migration**

Run: `npx drizzle-kit generate --custom --name diecast_reference_grants`, then edit the resulting file to exactly:

```sql
-- Custom SQL migration file, put your code below! --
grant select on public.diecast_models to authenticated;
grant select on public.diecast_variants to authenticated;

revoke all on public.diecast_models from anonymous;
revoke all on public.diecast_variants from anonymous;
```

- [ ] **Step 4: Apply and verify**

Run: `npm run db:migrate`. Then call `mcp__plugin_neon-plugin_neon__run_sql` (project `mute-rice-52151718`, database `neondb`) with:
```sql
select tablename, policyname, cmd, roles from pg_policies where tablename in ('diecast_models','diecast_variants');
select table_name, grantee, privilege_type from information_schema.role_table_grants where table_name in ('diecast_models','diecast_variants');
```
Expected: one `SELECT` policy per table with `roles = {authenticated}`; grants show only `SELECT` for `authenticated`, nothing for `anonymous`.

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc -b --force` → 0 errors.

```bash
git add db/schema.ts db/migrations
git commit --no-gpg-sign -m "feat: add diecast_models/diecast_variants reference tables with select-only RLS"
```

---

### Task 2: Scraper HTML parsing module (pure functions, tested against real fixtures)

**Goal:** Pure, dependency-free (besides `cheerio`) parsing functions that turn the site's raw HTML into structured data, tested against real saved fixtures — no network or DB access in this task.

**Files:**
- Create: `scripts/diecast-scraper/parse.mjs`
- Create: `scripts/diecast-scraper/parse.test.ts`
- Test fixtures already exist at `scripts/diecast-scraper/fixtures/manufacturer-list.html` and `scripts/diecast-scraper/fixtures/model-detail.html` (real bytes fetched directly from the live site — do not regenerate or "clean up" them, they must stay byte-faithful to the actual site for the tests to mean anything).
- New dev dependency: `cheerio` (add to `package.json` via `npm install --save-dev cheerio`).

**Acceptance Criteria:**
- [ ] `extractModelLinks(listHtml)` returns every unique `car/*.html` relative URL found in a manufacturer listing page.
- [ ] `deriveNameFromUrl(href)` turns a URL like `car/4_HW_1953_corvette.html` into `"1953 corvette"` (strip the leading numeric id, strip a short (≤3 char) manufacturer-code token, underscores → spaces).
- [ ] `parseModelPage(detailHtml, manufacturer)` returns `{ variants: [{ caption, imageUrl, sortOrder }] }` — one entry per variant row that has a real (non-placeholder) primary image, in document order. Rows whose only image is `carnotfound.jpg` are skipped entirely. The redundant `"<MANUFACTURER> CORVETTES"` header line inside each caption is stripped. `imageUrl` is resolved to an absolute URL against `https://smalldiecastcorvettes.com/`.
- [ ] Tested against the real fixtures — `manufacturer-list.html` yields exactly 52 unique links; `model-detail.html` (the `4_HW_1953_corvette.html` page) yields exactly 7 variants (every row's first image is real; `carnotfound.jpg` placeholders only ever occupy the second image slot in this fixture, so no row is skipped).
- [ ] `npx tsc -b --force` and `npm test` pass.

**Verify:** `npm test -- parse` → all pass.

**Steps:**

- [ ] **Step 1: Install cheerio**

Run: `npm install --save-dev cheerio`

- [ ] **Step 2: Read the fixtures first**

Read `scripts/diecast-scraper/fixtures/manufacturer-list.html` and `scripts/diecast-scraper/fixtures/model-detail.html` in full before writing the parser — the exact structure (unquoted `href`/`src` attributes, `<div class="car-description">` inside a `<tr>` alongside two `<td>` image slots, `carnotfound.jpg` placeholders) must match what the code below assumes. If the fixture content differs from what's described here, trust the fixture and adjust the parser/tests accordingly — the fixture is ground truth, not this plan's prose.

Confirmed by direct grep against the committed fixture (`grep -c 'class="car-description"' scripts/diecast-scraper/fixtures/model-detail.html` → `7`, and `grep -c carnotfound` → `5`): `model-detail.html` contains exactly **7** `<div class="car-description">` blocks (rows), in this order: "Showcase #1 2 car set" (`car_14_1.jpg`/`car_14_2.jpg`), "Corvette 50th anniversary lll" (`car_35_1.jpg`/`car_35_2.jpg`), "RR WHITEWALLS / ADULT COLLECTIBLES" (`car_36_1.jpg`), "RR BLACKWALLS / ADULT COLLECTIBLES" (`car_37_1.jpg`), "YELLOW / ADULT COLLECTIBLES" (`car_40_1.jpg`), "TOMARTS GUIDE" (`car_39_1.jpg`), "HAULIN HEAT SET" (`car_38_1.jpg`). The `carnotfound.jpg` placeholder appears exactly 5 times, always in the *second* image slot (rows 3–7 have no second photo) — every row's *first* image is real, so **expect exactly 7 variants** from `parseModelPage(detailHtml, 'Hot Wheels')` on this fixture.

- [ ] **Step 3: Write `scripts/diecast-scraper/parse.mjs`**

```js
import * as cheerio from 'cheerio'

export function extractModelLinks(listHtml) {
  const $ = cheerio.load(listHtml)
  const hrefs = new Set()
  $('a[href^="car/"]').each((_, el) => {
    const href = $(el).attr('href')
    if (href) hrefs.add(href.trim())
  })
  return [...hrefs]
}

export function deriveNameFromUrl(href) {
  const file = href.split('/').pop().replace(/\.html?$/i, '')
  const withoutId = file.replace(/^\d+_/, '')
  const parts = withoutId.split('_').filter(Boolean)
  if (parts.length > 1 && parts[0].length <= 3) parts.shift()
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

const PLACEHOLDER_IMAGE = 'carnotfound.jpg'
const SITE_ORIGIN = 'https://smalldiecastcorvettes.com/'

function captionLinesFrom(el, $, manufacturer) {
  const innerHtml = $(el).html() || ''
  const text = innerHtml.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim()
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const manufacturerLine = `${manufacturer.toUpperCase()} CORVETTES`
  return lines.filter((l) => l.toUpperCase() !== manufacturerLine)
}

export function parseModelPage(detailHtml, manufacturer) {
  const $ = cheerio.load(detailHtml)
  const variants = []
  $('div.car-description').each((i, el) => {
    const row = $(el).closest('tr')
    const firstRealImg = row.find('img').filter((_, img) => {
      const src = $(img).attr('src') || ''
      return !src.includes(PLACEHOLDER_IMAGE)
    }).first()
    const src = firstRealImg.attr('src')
    if (!src) return
    const imageUrl = new URL(src, SITE_ORIGIN).toString()
    const captionLines = captionLinesFrom(el, $, manufacturer)
    const caption = captionLines.length ? captionLines.join(', ') : null
    variants.push({ caption, imageUrl, sortOrder: i })
  })
  return { variants }
}
```

- [ ] **Step 4: Write `scripts/diecast-scraper/parse.test.ts`**

Fill in the exact expected values by reading the two fixture files yourself first (Step 2) — do not guess. At minimum:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { extractModelLinks, deriveNameFromUrl, parseModelPage } from './parse.mjs'

const fixturesDir = fileURLToPath(new URL('./fixtures/', import.meta.url))
const listHtml = readFileSync(fixturesDir + 'manufacturer-list.html', 'utf-8')
const detailHtml = readFileSync(fixturesDir + 'model-detail.html', 'utf-8')

describe('extractModelLinks', () => {
  it('extracts every unique car/*.html link from the real manufacturer listing fixture', () => {
    const links = extractModelLinks(listHtml)
    expect(links).toContain('car/4_HW_1953_corvette.html')
    expect(links.length).toBe(new Set(links).size) // no duplicates
    expect(links.every((l) => l.startsWith('car/') && l.endsWith('.html'))).toBe(true)
  })
})

describe('deriveNameFromUrl', () => {
  it('strips the numeric id and short manufacturer code, converts underscores to spaces', () => {
    expect(deriveNameFromUrl('car/4_HW_1953_corvette.html')).toBe('1953 corvette')
  })
  it('handles a double-underscore slug', () => {
    expect(deriveNameFromUrl('car/36_HW__63_corvette.html')).toBe('63 corvette')
  })
})

describe('parseModelPage', () => {
  it('extracts one variant per row with a real primary image, skipping the redundant manufacturer caption line', () => {
    const { variants } = parseModelPage(detailHtml, 'Hot Wheels')
    expect(variants.length).toBe(7)
    const first = variants[0]
    expect(first.imageUrl).toBe('https://smalldiecastcorvettes.com/imgitems/car_14_1.jpg')
    expect(first.caption).toContain('Showcase #1')
    expect(first.caption?.toUpperCase()).not.toContain('HOT WHEELS CORVETTES')
  })
})
```

Adjust the exact assertions (especially the total variant count) once you've actually read the fixture per Step 2 — this plan's count may be off by one and the test must match the real fixture, not this prose.

- [ ] **Step 5: Run tests and typecheck**

Run: `npm test -- parse` → all pass.
Run: `npx tsc -b --force` → 0 errors (this file isn't part of the Nuxt/tsconfig project graph, so it shouldn't introduce any — confirm it doesn't).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json scripts/diecast-scraper/parse.mjs scripts/diecast-scraper/parse.test.ts scripts/diecast-scraper/fixtures
git commit --no-gpg-sign -m "feat: add pure HTML-parsing functions for the diecast scraper"
```

---

### Task 3: Scraper network + DB-writer script

**Goal:** A standalone script that crawls the live Hot Wheels manufacturer page, parses every model page via Task 2's pure functions, and upserts into `diecast_models`/`diecast_variants`.

**Files:**
- Create: `scripts/scrape-diecast.mjs`
- Modify: `package.json` (add `"scrape:diecast": "node scripts/scrape-diecast.mjs"` script)

**Acceptance Criteria:**
- [ ] Fetches `https://smalldiecastcorvettes.com/manufac/Hot_Wheels_Corvettes.html`, extracts model links via `extractModelLinks`.
- [ ] For each model link, fetches the detail page, derives the name via `deriveNameFromUrl`, parses variants via `parseModelPage`, and upserts: one `diecast_models` row (keyed by `source_url`, on conflict updates `name`/`cover_image_url`/`updated_at`) with `cover_image_url` set to the first variant's `imageUrl` (or `null` if no variants), then deletes and re-inserts that model's `diecast_variants` rows.
- [ ] Sleeps ~500ms between each detail-page fetch.
- [ ] One failing model page (network error, unexpected HTML) is caught and logged, and does not stop the rest of the run.
- [ ] Re-running the whole script twice does not create duplicate `diecast_models` rows (upsert-by-`source_url` works).
- [ ] `npx tsc -b --force` unaffected (plain `.mjs`, not part of the TS project).

**Verify:** Manual run: `npm run scrape:diecast` against the live site and the real `DATABASE_URL` — covered fully in Task 7's verification pass, not re-run here to avoid hitting the live site twice during development. This task's own check is that the script is *correct by inspection and self-review* plus a syntax/import smoke check.

**Steps:**

- [ ] **Step 1: Write `scripts/scrape-diecast.mjs`**

```js
import 'dotenv/config'
import postgres from 'postgres'
import { extractModelLinks, deriveNameFromUrl, parseModelPage } from './diecast-scraper/parse.mjs'

const SITE_ORIGIN = 'https://smalldiecastcorvettes.com/'
const MANUFACTURER = 'Hot Wheels'
const MANUFACTURER_LIST_URL = `${SITE_ORIGIN}manufac/Hot_Wheels_Corvettes.html`
const REQUEST_DELAY_MS = 500

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; corvette-positraction-scraper/1.0)' } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} fetching ${url}`)
  return res.text()
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL)
  try {
    console.log(`Fetching manufacturer list: ${MANUFACTURER_LIST_URL}`)
    const listHtml = await fetchText(MANUFACTURER_LIST_URL)
    const links = extractModelLinks(listHtml)
    console.log(`Found ${links.length} model links`)

    let succeeded = 0
    let failed = 0

    for (const href of links) {
      const sourceUrl = new URL(href, SITE_ORIGIN).toString()
      try {
        const detailHtml = await fetchText(sourceUrl)
        const name = deriveNameFromUrl(href)
        const { variants } = parseModelPage(detailHtml, MANUFACTURER)
        const coverImageUrl = variants[0]?.imageUrl ?? null

        const [model] = await sql`
          insert into diecast_models (manufacturer, name, source_url, cover_image_url, updated_at)
          values (${MANUFACTURER}, ${name}, ${sourceUrl}, ${coverImageUrl}, now())
          on conflict (source_url) do update set
            name = excluded.name,
            cover_image_url = excluded.cover_image_url,
            updated_at = now()
          returning id
        `

        await sql`delete from diecast_variants where model_id = ${model.id}`
        if (variants.length > 0) {
          await sql`
            insert into diecast_variants ${sql(
              variants.map((v) => ({ model_id: model.id, caption: v.caption, image_url: v.imageUrl, sort_order: v.sortOrder })),
              'model_id', 'caption', 'image_url', 'sort_order',
            )}
          `
        }

        succeeded++
        console.log(`  ✓ ${name} (${variants.length} variants)`)
      } catch (err) {
        failed++
        console.warn(`  ✗ Failed on ${sourceUrl}:`, err.message)
      }
      await sleep(REQUEST_DELAY_MS)
    }

    console.log(`Done. ${succeeded} succeeded, ${failed} failed.`)
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Add the package.json script**

Add to the `"scripts"` block: `"scrape:diecast": "node scripts/scrape-diecast.mjs"`.

- [ ] **Step 3: Self-review, syntax check, typecheck**

Run: `node --check scripts/scrape-diecast.mjs` → no output means valid syntax.
Run: `npx tsc -b --force` → 0 errors (confirm this new plain-`.mjs` file doesn't get pulled into the TS project graph and doesn't break the build).
Re-read the full script once against Task 2's actual `parse.mjs` exports to confirm the import names match exactly.

- [ ] **Step 4: Commit**

```bash
git add scripts/scrape-diecast.mjs package.json
git commit --no-gpg-sign -m "feat: add diecast reference scraper (network + DB upsert)"
```

---

### Task 4: `useDiecastReference.ts` composable

**Goal:** Read-only Data-API composable for the reference tables, matching the existing composable conventions.

**Files:**
- Create: `app/composables/useDiecastReference.ts`
- Create: `app/composables/useDiecastReference.test.ts`

**Acceptance Criteria:**
- [ ] `fromModelRow`/`fromVariantRow` map snake_case DB rows to camelCase shapes.
- [ ] `useDiecastReference()` exposes `fetchModels(manufacturer?)` (all models, optionally filtered by manufacturer, ordered by name), `fetchModel(id)` (single model or `null`), `fetchVariants(modelId)` (ordered by `sort_order`).
- [ ] `npx tsc -b --force` and `npm test` pass.

**Verify:** `npm test -- useDiecastReference` → all pass.

**Steps:**

- [ ] **Step 1: Write `app/composables/useDiecastReference.ts`**

```ts
export interface DiecastModelRow {
  id: string
  manufacturer: string
  name: string
  source_url: string
  cover_image_url: string | null
  created_at: string
  updated_at: string
}

export interface DiecastModel { id: string; manufacturer: string; name: string; sourceUrl: string; coverImageUrl: string | null }

export function fromModelRow(row: DiecastModelRow): DiecastModel {
  return { id: row.id, manufacturer: row.manufacturer, name: row.name, sourceUrl: row.source_url, coverImageUrl: row.cover_image_url }
}

export interface DiecastVariantRow {
  id: string
  model_id: string
  caption: string | null
  image_url: string
  sort_order: number
  created_at: string
}

export interface DiecastVariant { id: string; modelId: string; caption: string | null; imageUrl: string; sortOrder: number }

export function fromVariantRow(row: DiecastVariantRow): DiecastVariant {
  return { id: row.id, modelId: row.model_id, caption: row.caption, imageUrl: row.image_url, sortOrder: row.sort_order }
}

export function useDiecastReference() {
  const neon = useNeon()

  async function fetchModels(manufacturer?: string): Promise<DiecastModel[]> {
    let query = neon.from('diecast_models').select('*').order('name', { ascending: true })
    if (manufacturer) query = query.eq('manufacturer', manufacturer)
    const { data, error } = await query
    if (error) throw error
    return (data as DiecastModelRow[]).map(fromModelRow)
  }

  async function fetchModel(id: string): Promise<DiecastModel | null> {
    const { data, error } = await neon.from('diecast_models').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? fromModelRow(data as DiecastModelRow) : null
  }

  async function fetchVariants(modelId: string): Promise<DiecastVariant[]> {
    const { data, error } = await neon.from('diecast_variants').select('*').eq('model_id', modelId).order('sort_order', { ascending: true })
    if (error) throw error
    return (data as DiecastVariantRow[]).map(fromVariantRow)
  }

  return { fetchModels, fetchModel, fetchVariants }
}
```

Note: `useNeon` is a Nuxt auto-import (from `app/composables/useNeon.ts`) — no explicit import needed, matching `useItems.ts`'s style.

- [ ] **Step 2: Write `app/composables/useDiecastReference.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { fromModelRow, fromVariantRow, type DiecastModelRow, type DiecastVariantRow } from './useDiecastReference'

const modelRow: DiecastModelRow = {
  id: 'model-1', manufacturer: 'Hot Wheels', name: '1953 corvette', source_url: 'https://smalldiecastcorvettes.com/car/4_HW_1953_corvette.html',
  cover_image_url: 'https://smalldiecastcorvettes.com/imgitems/car_14_1.jpg', created_at: '2020-01-01T00:00:00Z', updated_at: '2020-01-01T00:00:00Z',
}

describe('fromModelRow', () => {
  it('maps snake_case DB columns to the camelCase DiecastModel shape', () => {
    expect(fromModelRow(modelRow)).toEqual({
      id: 'model-1', manufacturer: 'Hot Wheels', name: '1953 corvette',
      sourceUrl: 'https://smalldiecastcorvettes.com/car/4_HW_1953_corvette.html',
      coverImageUrl: 'https://smalldiecastcorvettes.com/imgitems/car_14_1.jpg',
    })
  })
})

const variantRow: DiecastVariantRow = {
  id: 'variant-1', model_id: 'model-1', caption: 'Showcase #1 2 car set, license plate 1953, RR Whitewall Tires',
  image_url: 'https://smalldiecastcorvettes.com/imgitems/car_14_1.jpg', sort_order: 0, created_at: '2020-01-01T00:00:00Z',
}

describe('fromVariantRow', () => {
  it('maps snake_case DB columns to the camelCase DiecastVariant shape', () => {
    expect(fromVariantRow(variantRow)).toEqual({
      id: 'variant-1', modelId: 'model-1', caption: 'Showcase #1 2 car set, license plate 1953, RR Whitewall Tires',
      imageUrl: 'https://smalldiecastcorvettes.com/imgitems/car_14_1.jpg', sortOrder: 0,
    })
  })
  it('preserves a null caption', () => {
    expect(fromVariantRow({ ...variantRow, caption: null }).caption).toBeNull()
  })
})
```

- [ ] **Step 3: Run tests, typecheck, commit**

Run: `npm test -- useDiecastReference` → all pass. Run: `npx tsc -b --force` → 0 errors.

```bash
git add app/composables/useDiecastReference.ts app/composables/useDiecastReference.test.ts
git commit --no-gpg-sign -m "feat: add useDiecastReference composable"
```

---

### Task 5: Reference catalog pages + picker component + nav

**Goal:** Browsable/searchable reference UI: an index grid, a per-model detail view, and a reusable picker component (used by Task 6).

**Files:**
- Create: `app/components/DiecastLookupPicker.vue`
- Create: `app/pages/diecast-reference/index.vue`
- Create: `app/pages/diecast-reference/[id].vue`
- Modify: `app/components/SectionTabs.vue`

**Acceptance Criteria:**
- [ ] `DiecastLookupPicker.vue` takes a `models: DiecastModel[]` prop, renders a text filter (client-side substring match on `name`, case-insensitive) over a scrollable list, emits `pick` with the selected `DiecastModel` and `close`.
- [ ] `/diecast-reference` fetches all models via `fetchModels()`, groups by `manufacturer`, renders each as a card with `coverImageUrl` (hotlinked `<img>`, plain `<div>` fallback text if null) + `name`, linking to `/diecast-reference/[id]`.
- [ ] `/diecast-reference/[id]` fetches the model via `fetchModel(id)` and its variants via `fetchVariants(id)`; renders every variant's hotlinked image + caption, plus a "View on smalldiecastcorvettes.com →" link to `sourceUrl`. Shows a not-found state if the model doesn't exist (matching `collection/[id].vue`'s pattern).
- [ ] `SectionTabs.vue` gets a new tab linking to `/diecast-reference`, active-matched via `route.path.startsWith('/diecast-reference')`.
- [ ] `npx tsc -b --force` passes; `npm test` unaffected (no new test files expected — this project doesn't test `.vue` files).

**Verify:** `npx tsc -b --force` → 0 errors; manual click-through deferred to Task 7.

**Steps:**

- [ ] **Step 1: Write `app/components/DiecastLookupPicker.vue`**

```vue
<template>
  <div class="modal-scrim no-print" @click="$emit('close')">
    <div class="modal-card" @click.stop>
      <div style="background: var(--orange); color: var(--paper); padding: 12px 18px; display: flex; justify-content: space-between; align-items: center;">
        <span class="kicker" style="letter-spacing: 0.18em; font-size: 12px;">Look Up a Reference Model</span>
        <button class="icon-btn" style="background: transparent; color: var(--paper); border-color: var(--paper);" @click="$emit('close')">✕</button>
      </div>
      <div style="padding: 10px 14px; border-bottom: 1.5px solid var(--rule);">
        <input v-model="filter" placeholder="Search by name…" style="width: 100%; border: none; font-size: 15px; padding: 6px 2px; background: none;" />
      </div>
      <div style="max-height: 60vh; overflow-y: auto;">
        <div v-if="filtered.length === 0" style="padding: 30px 20px; text-align: center; font-style: italic; color: var(--muted);">
          No matching reference models.
        </div>
        <button v-for="m in filtered" :key="m.id" class="pick-row" @click="$emit('pick', m)">
          <span style="flex: 1; text-align: left; min-width: 0;">
            <span style="font-family: var(--font-display); font-weight: 700; font-size: 16px; display: block; line-height: 1;">{{ m.name }}</span>
            <span style="font-family: var(--font-cond); font-size: 11.5px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em;">{{ m.manufacturer }}</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DiecastModel } from '~/composables/useDiecastReference'

const props = defineProps<{ models: DiecastModel[] }>()
defineEmits<{ pick: [model: DiecastModel]; close: [] }>()

const filter = ref('')
const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase()
  if (!q) return props.models
  return props.models.filter((m) => m.name.toLowerCase().includes(q))
})
</script>
```

- [ ] **Step 2: Write `app/pages/diecast-reference/index.vue`**

```vue
<template>
  <div class="wrap" style="padding: 34px 26px 70px;">
    <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">Reference</div>
    <h2 style="font-size: clamp(38px, 6.5vw, 68px); line-height: 0.9; margin-bottom: 18px;">Diecast Reference</h2>
    <p style="font-style: italic; color: var(--muted); font-size: 16.5px; margin: 0 0 24px; max-width: 640px;">
      A catalog of known diecast Corvette releases, sourced from <a href="https://smalldiecastcorvettes.com" target="_blank" rel="noopener">smalldiecastcorvettes.com</a>. Currently Hot Wheels only.
    </p>

    <div v-for="(models, manufacturer) in grouped" :key="manufacturer" style="margin-bottom: 32px;">
      <div class="kicker" style="color: var(--orange); margin-bottom: 12px;">{{ manufacturer }}</div>
      <div class="mag-grid">
        <NuxtLink v-for="m in models" :key="m.id" :to="`/diecast-reference/${m.id}`" class="editorial-card" style="text-decoration: none; color: inherit;">
          <div class="editorial-card-photo photo-frame">
            <img v-if="m.coverImageUrl" :src="m.coverImageUrl" :alt="m.name" class="editorial-card-img" />
            <div v-else class="editorial-card-placeholder">No photo yet</div>
          </div>
          <div style="padding: 10px 12px;">
            <div style="font-family: var(--font-display); font-weight: 700; font-size: 17px; line-height: 1.1;">{{ m.name }}</div>
          </div>
        </NuxtLink>
      </div>
    </div>
    <p v-if="!loading && models.length === 0" style="font-style: italic; color: var(--muted);">No reference models yet — run the scraper.</p>
  </div>
</template>

<script setup lang="ts">
import type { DiecastModel } from '~/composables/useDiecastReference'

const { fetchModels } = useDiecastReference()
const models = ref<DiecastModel[]>([])
const loading = ref(false)
loading.value = true
try {
  models.value = await fetchModels()
} catch (err) {
  console.warn('Failed to load diecast reference models:', err)
} finally {
  loading.value = false
}

const grouped = computed(() => {
  const out: Record<string, DiecastModel[]> = {}
  for (const m of models.value) {
    if (!out[m.manufacturer]) out[m.manufacturer] = []
    out[m.manufacturer]!.push(m)
  }
  return out
})
</script>
```

Note: `.editorial-card`/`.editorial-card-photo`/`.editorial-card-img`/`.editorial-card-placeholder`/`.mag-grid` classes already exist in `app/assets/css/main.css` (used by `EditorialCard.vue`) — reuse them as-is, do not invent new CSS.

- [ ] **Step 3: Write `app/pages/diecast-reference/[id].vue`**

```vue
<template>
  <div v-if="model" class="wrap" style="padding: 26px 26px 70px;">
    <NuxtLink to="/diecast-reference" class="link-tab no-print" style="color: var(--orange); margin-bottom: 20px; display: inline-block;">← Back to Reference</NuxtLink>

    <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">{{ model.manufacturer }}</div>
    <h2 style="font-size: clamp(34px, 5vw, 52px); line-height: 0.92; margin-bottom: 20px;">{{ model.name }}</h2>

    <div class="mag-grid">
      <div v-for="v in variants" :key="v.id" class="editorial-card">
        <div class="editorial-card-photo photo-frame">
          <img :src="v.imageUrl" :alt="v.caption || model.name" class="editorial-card-img" />
        </div>
        <div v-if="v.caption" style="padding: 10px 12px; font-size: 14px; line-height: 1.4;">{{ v.caption }}</div>
      </div>
    </div>
    <p v-if="variants.length === 0" style="font-style: italic; color: var(--muted); margin-top: 16px;">No known variants for this model yet.</p>

    <a :href="model.sourceUrl" target="_blank" rel="noopener" class="btn ghost" style="margin-top: 24px; display: inline-flex;">View on smalldiecastcorvettes.com →</a>
  </div>
  <div v-else class="wrap" style="padding: 60px 26px;">
    <p style="font-style: italic; color: var(--muted);">That reference model doesn't exist.</p>
    <NuxtLink to="/diecast-reference" class="btn" style="margin-top: 16px;">← Back to Reference</NuxtLink>
  </div>
</template>

<script setup lang="ts">
import type { DiecastModel, DiecastVariant } from '~/composables/useDiecastReference'

const route = useRoute()
const { fetchModel, fetchVariants } = useDiecastReference()

const model = ref<DiecastModel | null>(null)
const variants = ref<DiecastVariant[]>([])
try {
  model.value = await fetchModel(route.params.id as string)
  if (model.value) variants.value = await fetchVariants(model.value.id)
} catch (err) {
  console.warn('Failed to load diecast reference model:', err)
}
</script>
```

- [ ] **Step 4: Update `app/components/SectionTabs.vue`**

Current file:
```ts
const tabs = [
  { id: 'toc', label: 'Contents', num: '01', to: '/' },
  { id: 'collection', label: 'The Collection', num: '02', to: '/collection' },
  { id: 'garage', label: 'The Garage', num: '03', to: '/garage' },
  { id: 'add', label: 'Index a Find', num: '04', to: '/add' },
]
function isActive(id: string): boolean {
  if (id === 'toc') return route.path === '/'
  if (id === 'collection') return route.path.startsWith('/collection')
  return route.path === `/${id}`
}
```

Change to:
```ts
const tabs = [
  { id: 'toc', label: 'Contents', num: '01', to: '/' },
  { id: 'collection', label: 'The Collection', num: '02', to: '/collection' },
  { id: 'garage', label: 'The Garage', num: '03', to: '/garage' },
  { id: 'add', label: 'Index a Find', num: '04', to: '/add' },
  { id: 'diecast-reference', label: 'Diecast Reference', num: '05', to: '/diecast-reference' },
]
function isActive(id: string): boolean {
  if (id === 'toc') return route.path === '/'
  if (id === 'collection') return route.path.startsWith('/collection')
  if (id === 'diecast-reference') return route.path.startsWith('/diecast-reference')
  return route.path === `/${id}`
}
```

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc -b --force` → 0 errors. Run: `npm test` → unaffected, same count as before.

```bash
git add app/components/DiecastLookupPicker.vue app/pages/diecast-reference app/components/SectionTabs.vue
git commit --no-gpg-sign -m "feat: add diecast reference catalog pages and lookup picker"
```

---

### Task 6: Add-form autofill integration

**Goal:** Wire `DiecastLookupPicker` into the Add form for Diecast items only.

**Files:**
- Modify: `app/pages/add.vue`

**Acceptance Criteria:**
- [ ] A "🔍 Look up a reference model" button appears only when `form.category === 'DIECAST'`, placed before the "General" section.
- [ ] Clicking it lazily fetches Hot Wheels models (only once — cached in a ref, not re-fetched on every click) and opens `DiecastLookupPicker`.
- [ ] Picking a model prefills `form.title` and `form.maker` **only if currently empty** (never overwrites something the user already typed), and appends `"Reference: <sourceUrl>"` to `form.story` (on its own line, preserving anything already there).
- [ ] Does not touch `pendingFile`/`uploadedKey` or any part of the photo-upload pipeline.
- [ ] `npx tsc -b --force` passes; `npm test` unaffected.

**Verify:** `npx tsc -b --force` → 0 errors; manual click-through deferred to Task 7.

**Steps:**

- [ ] **Step 1: Read the current `app/pages/add.vue` first** to confirm it hasn't drifted from the state left by the prior "Expand Categories" and "Custom dropdown" work (it has a `General` kicker heading, a `CATEGORY_HAS_GENERATION[form.category] || CAR_CATEGORIES.includes(form.category) || fields.length` gated "Details" section, and a `visibleFields`/`isFieldVisible` mechanism for `showWhen`-gated fields).

- [ ] **Step 2: Add the button to the template**

Right before the `<div class="kicker" ...>General</div>` line, add:

```html
<div v-if="form.category === 'DIECAST'" class="no-print" style="margin-bottom: 18px;">
  <button type="button" class="btn ghost" style="font-size: 12px; padding: 7px 13px; border-color: var(--ink);" @click="openDiecastPicker">🔍 Look up a reference model</button>
</div>
```

At the very end of the template, alongside the existing `<SlotPicker v-if="showLinkPicker" ... />`, add:

```html
<DiecastLookupPicker v-if="showDiecastPicker" :models="diecastModels" @close="showDiecastPicker = false" @pick="applyDiecastModel" />
```

- [ ] **Step 3: Add the script logic**

Add this import alongside the existing catalog import (do not remove anything from the existing import line):

```ts
import { useDiecastReference, type DiecastModel } from '~/composables/useDiecastReference'
```

Add near the other `ref`/composable-destructure declarations:

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

- [ ] **Step 4: Typecheck, test, commit**

Run: `npx tsc -b --force` → 0 errors. Run: `npm test` → unaffected.

```bash
git add app/pages/add.vue
git commit --no-gpg-sign -m "feat: add diecast reference lookup to the Add form"
```

---

### Task 7: Full verification pass (run the real scraper, live smoke test)

**Goal:** Confirm the whole feature works end-to-end — this is the first task that actually runs the scraper against the live site and the live database.

**Files:** none (verification only).

**Acceptance Criteria:**
- [ ] `npx tsc -b --force` → 0 errors.
- [ ] `npm run build` → completes with no errors.
- [ ] `npm test` → all tests pass (existing + all new tests from Tasks 2 and 4).
- [ ] `npm run scrape:diecast` run once against the live site → completes, logs a success count in the same ballpark as the 52 links found during planning (allow for the live count to have changed slightly since), logs any per-page failures without stopping the run.
- [ ] Re-running `npm run scrape:diecast` a second time does not duplicate `diecast_models` rows (confirm row count via Neon MCP `run_sql` before and after the second run — same count).
- [ ] Manual: visit `/diecast-reference`, confirm real scraped models render with working hotlinked thumbnails (or a graceful fallback if the source site blocks hotlinking — see note below); open one model's detail page, confirm variants + captions + the "View on source" link render.
- [ ] Manual: on `/add` with category Diecast, click "🔍 Look up a reference model", pick one, confirm Title/Maker/Notes prefill correctly and the photo-upload UI is untouched.
- [ ] Confirm via Neon MCP that `diecast_models`/`diecast_variants` are readable by an authenticated test account (reuse the curl+JWT technique from earlier in this project) and that RLS still isolates the user-owned tables (`items`, `item_links`, `item_documents`) — the new tables being globally readable must not have weakened anything else.

**Verify:** All bullets above pass; report any failures with exact output before considering this task complete.

**Steps:**

- [ ] **Step 1: Automated checks**

Run: `npx tsc -b --force`, `npm test`, `npm run build` → expect all clean.

- [ ] **Step 2: Run the real scraper**

Run: `npm run scrape:diecast`. Watch the log output for the success/fail counts. If a meaningful fraction of pages fail, investigate one failure directly (fetch that URL, compare its HTML shape against the fixtures from Task 2 — the site is old and inconsistent, some pages may have a slightly different layout than the two sampled during planning) before treating the run as complete.

Query via Neon MCP: `select count(*) from diecast_models; select count(*) from diecast_variants;` — note the counts.

Run `npm run scrape:diecast` again. Re-run the same count query — expect identical counts (proving the upsert is idempotent, not additive).

- [ ] **Step 3: Manual smoke test**

Start the dev server, sign in, visit `/diecast-reference` and a model detail page, then `/add` with category Diecast to exercise the lookup picker. If images fail to load (broken `<img>`), check the browser's network tab for a 403/hotlink-block response from `smalldiecastcorvettes.com` — if the site blocks hotlinking by `Referer` header, note this as a finding to report back (the plan's chosen approach — link, don't re-host — assumed hotlinking would work; if it doesn't, that's a real constraint to surface, not something to silently route around).

- [ ] **Step 4: RLS confirmation**

Reuse the established curl+JWT technique: sign up a test account, capture its JWT via `/get-session`, `GET` `diecast_models`/`diecast_variants` from the Data API with that JWT (expect real rows back — this table is intentionally globally readable), then re-confirm `items`/`item_links`/`item_documents` are still isolated per-account as before (expect empty results for a fresh account's `items` query).

- [ ] **Step 5: Report and clean up**

If any step surfaces a bug, fix it in the relevant task's files, re-verify, and commit the fix with a message describing what was wrong. Once everything passes, no further commit is needed for this task itself.

---

## Self-review notes

- **Spec coverage:** every element of the approved plan is covered — schema/RLS (Task 1), parsing (Task 2, tested against real fixtures, not invented HTML), network+DB scraper (Task 3), read composable (Task 4), reference UI + nav (Task 5), Add-form autofill (Task 6), live end-to-end verification including the hotlinking risk and RLS non-regression (Task 7).
- **Type consistency checked:** `DiecastModel`/`DiecastVariant` field names (`sourceUrl`, `coverImageUrl`, `modelId`, `imageUrl`, `sortOrder`) are identical across Tasks 4, 5, and 6's code.
- **No placeholders:** every step has complete, copy-pasteable code; the one place this plan explicitly says "verify against the real fixture, don't trust this prose" (Task 2 Step 2's variant count) is a deliberate acknowledgment that the fixture is ground truth, not a placeholder — the fixture file itself is real and already committed.
