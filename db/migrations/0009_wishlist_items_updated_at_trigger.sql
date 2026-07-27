-- Custom SQL migration file, put your code below! --
drop trigger if exists wishlist_items_set_updated_at on public.wishlist_items;
create trigger wishlist_items_set_updated_at before update on public.wishlist_items
  for each row execute function public.set_updated_at();