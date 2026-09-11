-- A dedicated server login inherits the existing Elo permissions. It never owns
-- tables, bypasses RLS, or receives administrative access to Supabase Auth.
CREATE ROLE elo_app NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 10;
GRANT elo_backend TO elo_app;

-- Generate deployment secrets inside PostgreSQL, so no password is included in
-- source control or the migration history. Vault keeps the encryption key stable
-- across Render rebuilds. Plain PostgreSQL test environments leave NOLOGIN set.
DO $elo_credentials$
DECLARE
  database_password text;
  messaging_key text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault') THEN
    IF EXISTS (SELECT 1 FROM vault.secrets WHERE name IN
      ('elo_app_database_password', 'elo_messaging_encryption_key')) THEN
      RAISE EXCEPTION 'Elo deployment secrets already exist; do not rotate implicitly';
    END IF;
    IF has_schema_privilege('elo_app', 'vault', 'USAGE') OR
       has_table_privilege('elo_app', 'vault.decrypted_secrets', 'SELECT') THEN
      RAISE EXCEPTION 'The application role must not have access to Vault';
    END IF;
    database_password := encode(extensions.gen_random_bytes(32), 'hex');
    messaging_key := encode(extensions.gen_random_bytes(32), 'hex');
    PERFORM vault.create_secret(database_password, 'elo_app_database_password',
      'Private PostgreSQL login for the Elo Render server');
    PERFORM vault.create_secret(messaging_key, 'elo_messaging_encryption_key',
      'Stable 32-byte encryption key for Elo messaging credentials; do not rotate without re-encryption');
    PERFORM set_config('password_encryption', 'scram-sha-256', true);
    EXECUTE format('ALTER ROLE elo_app LOGIN PASSWORD %L', database_password);
  ELSE
    RAISE NOTICE 'Vault is unavailable: elo_app remains NOLOGIN; no deployment secrets were created';
  END IF;
END
$elo_credentials$;
