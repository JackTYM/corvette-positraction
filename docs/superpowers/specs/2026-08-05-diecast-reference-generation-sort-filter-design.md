# Diecast Reference — Generation-Aware Sort & Filter — Design Spec

**Date:** 2026-08-05
**Status:** Approved, ready for implementation planning

## Problem

The Diecast Reference page (`app/pages/diecast-reference/index.vue`) sorts models within a manufacturer tab using `estimateYearForSort`, which only understands 4-digit and 2-digit years parsed out of the model name. Many model names (especially Hot Wheels', e.g. `"C7 R"`, `"c6"`, `"CORVETTE C7 Z06"`) carry a generation code instead of a year, so they all collapse into the same "unparseable" bucket and fall back to the raw DB fetch order (`order by name asc`). Because that order is case-sensitive, uppercase-led names like `"C7 R"` sort ahead of lowercase ones like `"c6"` — so C7 models visibly display above C6 models, which reads as wrong to anyone browsing chronologically.

There's also no way to jump straight to a generation while browsing — you have to scroll through the whole (year-guessed) list.

## Scope

**In scope:** replacing the sort logic for `modelsForActiveTab` with a generation-and-year-aware comparator, and adding a generation filter (button row: All / C1–C8 / Unknown) that persists across manufacturer tab switches.

**Out of scope:** a year filter (explicitly declined — generation-only). Changing how manufacturer tabs themselves are ordered. Touching the Collection/Wishlist pages' existing `ARRANGE`/generation filter logic (`app/utils/catalog.ts` `TopLevelFilters` etc.) — this is a separate, already-working feature for a different data shape (`Item`, not `DiecastModel`).

## Generation/year parsing

New pure helper in `app/utils/catalog.ts`, next to `GENERATIONS`/`extractYearFromName`:

```ts
function deriveGeneration(name: string): { generation: Generation; year: number | null }
```

Resolution order (code-first, year-fallback):
1. **Explicit code:** match `\bC[1-8]\b` case-insensitively (e.g. `"C7 R"`, `"c6 convertible"`, `"Callaway C7"`). If found, that's the generation. Also attempt a year extraction on the same name (step 2's year logic) purely for sub-sorting — a code match doesn't block finding a year too.
2. **Year inference:** if no code, extract a year — reusing `extractYearFromName`'s 4-digit regex, then falling back to the existing 2-digit-with-pivot heuristic currently inlined in `diecast-reference/index.vue` as `estimateYearForSort` (moves to `catalog.ts` alongside this helper). Map the resulting year into a generation using the `GENERATIONS` year ranges already defined there.
3. **Neither:** generation is `'—'`, year is `null` — the existing "unknown" sentinel.

Explicit codes win over year-inference when both could apply, because the 2-digit pivot heuristic is a guess while a `C#` string in the name is a direct claim.

## Sort order

Comparator used for `modelsForActiveTab`, replacing `estimateYearForSort`:

1. **Primary:** generation order via the existing `GEN_ORDER` array (`['C1',...,'C8','—']`) — `'—'` is already last in that list, so fully-unknown models naturally sort to the end. This directly fixes the C6-above-C7 bug: recognized generations always sort in generation order regardless of name casing.
2. **Secondary:** year ascending within a generation. Models with a known generation but no parseable year (e.g. `"c6"` with no year in the name) sort after their dated peers within that same generation bucket (treat missing year as `+Infinity` for comparison purposes).
3. **Tertiary (fallback to alphanumeric):** case-insensitive name comparison, for any remaining ties (including the whole `'—'` bucket, and same-generation/no-year models against each other). This also fixes the secondary case-mismatch bug where `"C7 R"` sorted before `"c6"` purely because of casing.

## Generation filter

- New `activeGeneration` ref (values: `'All' | Generation`), independent of `activeManufacturer` — persists as the user switches manufacturer tabs, per product decision.
- Rendered as a button row (`link-tab` styling, matching the existing manufacturer tab row) directly below the manufacturer tabs, above the model grid.
- Buttons shown: `All`, plus only the generations (`C1`...`C8`, `Unknown`) that have at least one model *anywhere* in the full reference dataset (not scoped to the active manufacturer tab) — so the row doesn't jump around as tabs change. `'—'` is labeled `"Unknown"` in this UI (the `Generation` type's `'—'` sentinel is an internal/display value elsewhere in the app; here it gets a clearer label since users have no other context for what `'—'` means).
- Selecting a generation filters `modelsForActiveTab` to models whose derived generation matches exactly; `All` applies no filter; `Unknown` isolates models whose generation is `'—'`.

## Data flow / computation

- `deriveGeneration(model.name)` is computed once per model into a memoized `Map<modelId, { generation: Generation; year: number | null }>`, built as a `computed()` alongside the existing `models` ref — reused by both the sort comparator and the generation filter so names aren't re-parsed on every render or on every comparator call.
- `modelsForActiveTab` becomes: filter by `activeManufacturer` → filter by `activeGeneration` (if not `'All'`) → sort by the new comparator.

## Testing

- Unit tests for `deriveGeneration` (`catalog.ts`) covering: explicit code only, year only (4-digit), year only (2-digit pivot, both branches), code + year both present, neither present, and the real-world C6/C7 Hot Wheels names captured in this investigation (`"C7 R"`, `"C7 Z06 CONVERTIBLE"`, `"CORVETTE C7 Z06"`, `"c6"`, `"c6 convertible"`, `"c6-r"`, `"callaway c7"`) to confirm they now land in the correct generation and sort in the right order.
- Unit tests for the new sort comparator directly (generation ordering, year sub-ordering, alphanumeric fallback, case-insensitivity).
- Live verification in the browser: confirm the Hot Wheels tab now shows C6 models before C7 models, confirm the generation filter row shows only generations with data, confirm selecting a generation filters correctly and stays selected across a manufacturer tab switch, confirm "Unknown" isolates unparseable models.
