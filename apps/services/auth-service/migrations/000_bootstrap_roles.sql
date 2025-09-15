-- Bootstrap roles mínimos (ejecutar manualmente al inicio si no existen)
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'auth_app') THEN
      CREATE ROLE auth_app LOGIN PASSWORD 'auth_app_pass';
   END IF;
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'user_app') THEN
      CREATE ROLE user_app LOGIN PASSWORD 'user_app_pass';
   END IF;
END$$;

GRANT CONNECT ON DATABASE smartedify TO auth_app, user_app;
GRANT USAGE ON SCHEMA public TO auth_app, user_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users, user_roles, audit_security TO auth_app;
GRANT SELECT ON TABLE users TO user_app;

-- Ajustar privilegios futuros: revocar todo a PUBLIC
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE smartedify FROM PUBLIC;