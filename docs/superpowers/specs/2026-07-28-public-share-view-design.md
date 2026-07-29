# Public Share View — Design Spec

**Date:** 2026-07-28
**Status:** Approved, ready for implementation planning

## Problem

Collectors want to share their archive with other people (family, other collectors, forums) without giving them an account or exposing the private app (Garage, Add/Edit flows, sign-in). This adds an opt-in, read-only public view of a user's Collection and Wishlist, reachable at `share.corvettepositraction.com/<user-uuid>`.

## Scope

**In scope:** a public, read-only view of a user's `items` (Collection) and `wishlist_items` (Wishlist), including each item's Documents and Linked Entries, full parity with the private view's fields (title, photo, category, condition, price paid, estimated value, notes, everything). An opt-in toggle on a new Settings page. RLS changes to allow anonymous reads only for users who've opted in.

**Out of scope:** Garage/walls, the Diecast Reference browser, and all Add/Edit/Remove flows are never reachable from the share subdomain. No redacted/curated field subset — sharing is all-or-nothing per the owner's choice to enable it at all.

## Architecture

`share.corvettepositraction.com` is added as a second Custom Domain on the existing Cloudflare Pages project (`corvettepositraction.com`'s deployment) — same codebase, same build, no new CI/deploy pipeline. A new Nitro server middleware (`server/middleware/share-host.ts`) inspects the request's `Host` header; when it starts with `share.`, it rewrites the request path so `share.corvettepositraction.com/<uuid>` and `share.corvettepositraction.com/<uuid>/item/<id>` resolve into a dedicated page tree in the same Nuxt app, rather than the normal app routes.

This was chosen over a second, separate minimal deployment because the bundle-size cost of shipping the full app's JS to anonymous visitors is negligible at this app's scale, and a single codebase avoids real ongoing maintenance overhead (duplicated styling, a second pipeline) for a marginal win. Security is enforced by RLS regardless of which approach is used — the client bundle having unused authenticated-app code in it is not a security exposure, since an anonymous visitor has no valid session/JWT to exercise it against.

## Routes

- `app/pages/share/[userId]/index.vue` — public landing page for that user: Collection grid + Wishlist grid, reusing `EditorialCard`/`mag-grid` styling with all edit/delete/add controls stripped. Fetches via the same unauthenticated Neon Data API client pattern already used for the public Diecast Reference catalog (no JWT sent — RLS's anonymous-role policy is the actual gate).
- `app/pages/share/[userId]/item/[itemId].vue` — read-only item detail page, full parity with `app/pages/collection/[id].vue` including Documents and Linked Entries, minus Edit/Remove.
- If the target user hasn't enabled sharing, or the UUID doesn't correspond to any user, RLS returns zero rows either way. The page shows one generic "This collection isn't public" message in both cases — the two situations are never distinguished in the UI or in response shape, so the URL space can't be used to enumerate which UUIDs belong to real accounts.

## Data model & RLS

New table `user_settings`:
- `user_id text primary key` (references the same `auth.user_id()` convention as every other table)
- `share_enabled boolean not null default false`
- `created_at`, `updated_at timestamptz`

RLS on `user_settings`: standard `crudPolicy` for `authenticatedRole`, scoped to the owner's own row (read/write) — same pattern as every other table. It is never read directly by the public share page.

`items`, `wishlist_items`, `item_links`, and `item_documents` each get one additional RLS policy, for Postgres's anonymous/unauthenticated role, of the shape:

```sql
using (exists (
  select 1 from user_settings
  where user_settings.user_id = <table>.user_id
    and user_settings.share_enabled = true
))
```

`item_links` and `item_documents` already carry their own denormalized `user_id` column (confirmed in `db/schema.ts`), so this check doesn't need to join through `items` — it's a direct, symmetrical policy across all four tables.

This means the share page needs zero application-level "is sharing on" branching: it just queries "this user's items" through the public Data API client, and gets real rows back if-and-only-if sharing is enabled. Turning sharing off is a single `UPDATE user_settings SET share_enabled = false` — every dependent table's exposure disappears immediately and atomically, with no risk of a page forgetting to check a flag somewhere.

**Correction to the original framing:** images are not, and structurally cannot be, gated by Postgres RLS — R2 has no row-level-security concept. Any `imgKey` is already fetchable via the public `image.corvettepositraction.com` CDN today, shared or not (protected only by the key being an unguessable UUID). Enabling sharing doesn't change image exposure; it just makes those URLs discoverable through an intended browsing flow rather than e.g. network-tab inspection on the owner's own private session.

## Settings page

New `app/pages/settings.vue`, linked as a small header link next to "Sign Out" — not a numbered `SEC.` nav tab, since this isn't a primary content section like Collection/Garage. Contents:
- A toggle: "Share my collection publicly," backed by `user_settings.share_enabled` (upsert on toggle).
- When enabled, the full `https://share.corvettepositraction.com/<user-id>` link, shown with a copy-to-clipboard button.

## Error handling & edge cases

- Empty/disabled share → generic "not public" message (see Routes section), never a distinct 404 vs. "disabled" state.
- A shared item that has since been deleted, or a linked/related item whose owner isn't the same shared user (shouldn't happen given `item_links` is always same-owner by construction, but defensively) → the detail page's per-item RLS-gated fetch naturally returns nothing and renders the same "not found" state as any missing item today.
- Toggling sharing off while someone has a share tab open → their next fetch (any navigation, or a future manual refresh) returns zero rows immediately; no caching layer to invalidate since the anonymous Data API reads aren't cached client-side beyond the page's own session state.

## Testing

- Unit tests for the new RLS-shaped query helpers (if any pure logic is extracted, e.g. a shared "map DB row to display item" function reused between the private and public views).
- Live verification (per this project's established practice of testing in a real browser, not just curl): enable sharing on a test account, confirm the share URL shows the right data anonymously (no auth cookie sent), confirm disabling sharing immediately blocks it, confirm Garage/Add/Edit routes are unreachable from the `share.` host, confirm a wrong/disabled UUID shows the generic message.
