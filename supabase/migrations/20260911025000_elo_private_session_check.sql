-- Managed Supabase does not let postgres delegate USAGE on the auth schema.
-- Delegate only a boolean session check through an application-owned schema.
-- No Auth rows or tokens are exposed to the runtime or browser roles.
CREATE SCHEMA elo_private;
REVOKE ALL ON SCHEMA elo_private FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA elo_private TO elo_backend;

CREATE FUNCTION elo_private.session_active(p_session_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.sessions AS s
    WHERE s.id = p_session_id AND s.user_id = p_user_id
      AND (s.not_after IS NULL OR s.not_after > CURRENT_TIMESTAMP)
  );
$$;
REVOKE ALL ON FUNCTION elo_private.session_active(uuid,uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION elo_private.session_active(uuid,uuid) TO elo_backend;
REVOKE SELECT (id,user_id,not_after) ON auth.sessions FROM elo_backend;

COMMENT ON FUNCTION elo_private.session_active(uuid,uuid) IS
  'Server-only session existence, owner and expiry check. Caller must first verify the access token with Supabase Auth.';
