-- Custom SQL migration file, put your code below! --
grant select, insert, update, delete on public.item_links to authenticated;
grant select, insert, update, delete on public.item_documents to authenticated;

revoke all on public.item_links from anonymous;
revoke all on public.item_documents from anonymous;