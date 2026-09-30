-- Migration 00012: Auth Helpers

SET search_path = public;

CREATE OR REPLACE FUNCTION update_last_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE profiles
    SET last_login_at = now()
    WHERE id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION keepalive()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN 'ok';
END;
$$;
