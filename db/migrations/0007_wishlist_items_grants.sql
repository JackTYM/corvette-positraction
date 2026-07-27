-- Custom SQL migration file, put your code below! --
grant select, insert, update, delete on public.wishlist_items to authenticated;

revoke all on public.wishlist_items from anonymous;
