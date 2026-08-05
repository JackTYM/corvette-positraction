# Case Renaming, Collection/Wishlist Sort, Tab Reorder, Wishlist-in-Garage — Design Spec

**Date:** 2026-08-05
**Status:** Approved, ready for implementation planning

## Problem

Four small-to-medium usability gaps, requested together:

1. Renaming a Garage display case isn't discoverable — the feature exists but is mislabeled as "resize."
2. Collection and Wishlist have no sort control; both are stuck in fixed `created_at desc` order, while Garage already has a working sort pattern.
3. The section tab order (`Contents, Collection, Garage, Index a Find, Diecast Reference, Wishlist`) doesn't match the order the user actually wants to browse in.
4. Garage — the wall-of-display-cases planner — only shows owned collection cars. Wishlisted cars can't be placed to plan where they'd go once bought.

## Scope

**In scope:** all four items below, each independently shippable.

**Out of scope:** preserving a wishlist item's Garage placement across conversion to a collection item (the existing `fromWishlist` conversion flow creates a new item id; the old placement disappearing from the wall on conversion is accepted, matching how a deleted collection item already disappears from the wall today). No database schema changes anywhere in this spec.

## A. Case renaming (relabeling only)

Renaming already works today: `DisplayCase.vue`'s "resize" button opens `CaseForm.vue` with the case's current `{name, cols, rows}` prefilled, including an editable name field — it's just labeled as a resize-only action.

- `app/components/garage/DisplayCase.vue`: the icon-button labeled `resize` (currently `<button class="icon-btn" @click="$emit('edit', index)">resize</button>`) becomes `edit`.
- `app/components/garage/CaseForm.vue`: the modal title `{{ initial ? 'Resize This Case' : 'Build a Display Case' }}` becomes `{{ initial ? 'Edit This Case' : 'Build a Display Case' }}`. The save button label (`{{ initial ? 'Save Size' : 'Build It' }}`) stays `Save Size` → becomes `Save Changes` for the edit case, since the form now visibly edits more than size.

No logic changes — `editCase()` in `garage.vue` already merges the full `{name, cols, rows}` on save.

## B. Sort for Collection & Wishlist

Both `app/pages/collection/index.vue` and `app/pages/wishlist/index.vue` currently render items straight from `useItems()`/`useWishlist()` in DB fetch order (`created_at desc`), with no sort UI. Garage's existing pattern (`garage.vue`'s "Re-file the whole wall by" button row, driven by `ARRANGE`/`ARRANGE_LABELS` from `catalog.ts`) is reused directly:

- **Collection page:** full `ARRANGE_LABELS` button row (release year / date acquired / generation / color / type / value) — collection `Item` rows have every field these comparators need.
- **Wishlist page:** a subset — **release year, date acquired, value** only. Wishlist items don't have `generation`, `colorHex`/`colorName`, or `category`, so those three `ARRANGE` options are omitted rather than shown-but-broken. (`ARRANGE.release` and `ARRANGE.value` work as-is against a wishlist item's `year`-equivalent... see note below. `ARRANGE.date` works unchanged since wishlist items have `createdAt`.)

**Note on wishlist item shape vs. `Item`:** `ARRANGE.release` expects `.year` and `ARRANGE.value` expects `.value`; wishlist rows have neither natively (`estimatedPrice` instead of `value`, no `year` column at all — only whatever year is embedded in `title`). The Wishlist page's sort will operate on a lightweight local view of each wishlist row: `value` maps directly from `estimatedPrice`; `year` is derived from `title` via the existing `deriveGeneration(title).year` (the same helper from the prior generation-aware-sort feature, already handles both 4-digit and 2-digit-pivot years) with a `null`/blank fallback that sorts last, consistent with how ungenerationed titles already sort last elsewhere. This reuses `ARRANGE.release`/`ARRANGE.date`/`ARRANGE.value`'s existing comparator functions unmodified — just called against a `{year, acquired: createdAt, value: estimatedPrice}`-shaped object per wishlist row instead of a full `Item`.

Both pages: client-side sort after fetch (no query changes), default to `release` (matches Garage's default-highlighted "release" button), sort state is a local `ref`, not persisted.

## C. Tab reorder

`app/components/SectionTabs.vue`'s tab array changes from:

```
01 Contents        /
02 The Collection  /collection
03 The Garage      /garage
04 Index a Find    /add
05 Diecast Reference /diecast-reference
06 Wishlist        /wishlist
```

to:

```
01 The Collection  /collection
02 The Garage      /garage
03 Wishlist        /wishlist
04 Contents        /
05 Index a Find    /add
06 Diecast Reference /diecast-reference
```

Only the array order and `num` values change — labels, routes, and `isActive()` matching logic are untouched.

Four pages carry a `Section N` kicker that must be updated to match the new tab position (confirmed via grep — `app/pages/index.vue` and `app/pages/diecast-reference/index.vue` use a different kicker convention and are unaffected):

| File | Current text | New text (per new order) |
|---|---|---|
| `app/pages/collection/index.vue:3` | `Section Two` | `Section One` |
| `app/pages/garage.vue:3` | `Section Three` | `Section Two` |
| `app/pages/wishlist/index.vue:3` | `Section Six` | `Section Three` |
| `app/pages/add.vue:3` | `Section Three` (pre-existing bug — duplicates Garage's old number; should have read "Section Four") | `Section Five` |

## D. Wishlisted items in Garage

**Eligibility:** every wishlist item is treated as a candidate car for Garage — `wishlist_items` has no `category` column to filter on, and this app is Corvette-diecast-focused end to end (the wishlist's primary entry point is the "+ Wishlist" button on diecast-reference cars).

**Data flow — no schema change:** `walls.itemOrder` (`wall.order` client-side) stays a flat `string[]` of item ids. Collection items (`items` table) and wishlist items (`wishlist_items` table) are separate UUID-keyed tables, so ids don't collide in practice — a placed id's source (owned vs. wishlisted) is resolved client-side by which lookup map it's found in, never persisted as a tag.

`garage.vue` changes:
- Fetches both `useItems()` (existing) and `useWishlist()` (new).
- Builds a merged `byId` map: `{...item, owned: true}` for collection cars, `{...synthesizedFieldsFromWishlistItem, owned: false}` for wishlist items — see synthesis rules below.
- `carItems`, `unplaced`, `overflow`, `loose` computeds extend to the merged set instead of collection-only.
- `wallOps.ts` functions (`moveInOrder`, `fileByComparator`, `arrangeSlice`, `caseOffsets`) are unchanged — they already operate generically on `string[]` order arrays and a `byId` lookup map, with no assumption about which table an id came from.
- `openItem(item)` routes to `/wishlist/${item.id}` when `!item.owned`, `/collection/${item.id}` when `item.owned` (currently always the latter).

**Field synthesis for a wishlist item, to satisfy `ARRANGE`/`isCar`-shaped consumers:**
- `category: 'DIECAST'` (constant — Garage only ever shows cars, so this makes wishlist entries sort/filter identically to owned cars here).
- `generation`/`year`: derived from `title` via `deriveGeneration(title)` (reusing the helper from the prior generation-sort feature), falling back to `generation: '—'`, `year: ''` when unparseable.
- `colorName`/`colorHex`: left `undefined` — `colorOf()` already has a graceful `DEFAULT_COLOR` fallback for missing color data, no new handling needed.
- `value`: `estimatedPrice` (already numeric).
- Every other `Item` field not needed by Garage's rendering/sorting (condition, rarity, story, etc.) is simply omitted — Garage's card rendering only reads `title`/photo/year/generation/color, all of which are covered above.

**Visual distinction:** `DisplayCase.vue` and `TrayCar.vue` render a dashed border + a small "WISHLIST" badge (matching the existing "In Wishlist" badge styling from the diecast-reference page) on any card where `owned === false`. Owned cards render exactly as today.

**Loose tray:** wishlist cars not yet placed into a case appear in the existing "Not on the wall" tray alongside unplaced owned cars (not a separate tray), distinguished by the same badge/dashed-border treatment.

## Testing

- Unit tests for the wishlist-item → synthesized-`Item`-shape field mapping (title → generation/year via `deriveGeneration`, `estimatedPrice` → `value`), likely as a small pure function in `catalog.ts` (e.g. `wishlistItemAsCard(w: WishlistItem): Item`-shaped helper) so it's testable without Nuxt/Vue runtime, mirroring how `deriveGeneration`/`compareByGeneration` were done in the prior feature.
- Live browser verification (per this project's established practice): case rename via the relabeled "edit" button persists; Collection and Wishlist sort buttons reorder the grid correctly (including the Wishlist page's reduced option set); tab bar shows the new order/numbers and each tab still routes correctly; a wishlisted car can be dragged into a Garage case, shows the wishlist badge/dashed border, sorts correctly among owned cars when re-filing a case or the whole wall, and clicking it navigates to its wishlist detail page.
