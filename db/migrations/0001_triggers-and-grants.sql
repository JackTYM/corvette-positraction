-- Custom SQL migration file, put your code below! --
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at before update on public.items
  for each row execute function public.set_updated_at();

drop trigger if exists walls_set_updated_at on public.walls;
create trigger walls_set_updated_at before update on public.walls
  for each row execute function public.set_updated_at();

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.items to authenticated;
grant select, insert, update, delete on public.walls to authenticated;

revoke all on public.items from anonymous;
revoke all on public.walls from anonymous;
