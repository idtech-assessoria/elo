-- This optional Supabase event-trigger function is for DDL administration,
-- never a browser RPC. Revoking EXECUTE does not disable the event trigger.
DO $$ BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;
