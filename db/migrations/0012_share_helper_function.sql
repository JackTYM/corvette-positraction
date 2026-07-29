-- Custom SQL migration file, put your code below! --
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