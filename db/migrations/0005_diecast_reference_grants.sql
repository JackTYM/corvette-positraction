-- Custom SQL migration file, put your code below! --
revoke all on public.diecast_models from authenticated;
revoke all on public.diecast_variants from authenticated;

grant select on public.diecast_models to authenticated;
grant select on public.diecast_variants to authenticated;

revoke all on public.diecast_models from anonymous;
revoke all on public.diecast_variants from anonymous;
