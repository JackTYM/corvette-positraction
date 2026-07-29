-- Custom SQL migration file, put your code below! --
-- This function exists because Postgres RLS policy USING subqueries execute with the
-- querying role's own table privileges, not the table owner's — so items/wishlist_items/
-- item_links/item_documents's anonymous policies can't directly subquery user_settings
-- (which anonymous has zero grants on). SECURITY DEFINER lets the check run with the
-- function owner's privileges instead, exposing only a boolean.
create or replace function public.is_share_enabled(target_user_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_settings
    where user_id = target_user_id and share_enabled = true
  );
$$;

revoke all on function public.is_share_enabled(text) from public;
grant execute on function public.is_share_enabled(text) to anonymous;
grant execute on function public.is_share_enabled(text) to authenticated;