-- Custom SQL migration file, put your code below! --
-- Note: public.is_share_enabled(uuid) (see 0012_share_helper_function.sql) is necessarily
-- exposed as a public RPC endpoint (POST /rpc/is_share_enabled) as a side effect of granting
-- anonymous EXECUTE for RLS policy evaluation. This lets anyone check whether a specific
-- known/guessed UUID currently has sharing enabled, even for an account whose shared tables
-- are otherwise empty. Accepted as low-severity residual risk: it doesn't reveal an account's
-- identity, and UUID secrecy is already this app's security model for e.g. R2 image keys.

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();