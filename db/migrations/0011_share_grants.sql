-- Custom SQL migration file, put your code below! --
grant select, insert, update, delete on public.user_settings to authenticated;
revoke all on public.user_settings from anonymous;

grant select on public.items to anonymous;
grant select on public.wishlist_items to anonymous;
grant select on public.item_links to anonymous;
grant select on public.item_documents to anonymous;