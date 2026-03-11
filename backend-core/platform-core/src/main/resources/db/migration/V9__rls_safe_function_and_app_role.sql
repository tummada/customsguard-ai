-- V9: RLS hardening — safe tenant function + non-superuser app role
--
-- ปัญหา: current_setting('app.current_tenant_id') จะ error ถ้า
-- non-superuser query โดยยังไม่ได้ set parameter → RLS ไม่ทำงานจริง
--
-- แก้ไข:
-- 1. สร้าง function current_tenant_id() ที่ return NULL แทน error
-- 2. อัพเดท RLS policies ทุก table ให้ใช้ function นี้
-- 3. สร้าง app role (non-superuser, ไม่ bypass RLS)

-- ==========================================================
-- 1. Safe tenant ID function
-- ==========================================================
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

-- ==========================================================
-- 2. Update RLS policies — ใช้ current_tenant_id() แทน current_setting()
-- ==========================================================
DO $$
DECLARE
  tbl TEXT;
  pol TEXT;
BEGIN
  FOR tbl, pol IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND qual::text LIKE '%current_setting%'
  LOOP
    EXECUTE format('DROP POLICY %I ON %I', pol, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (tenant_id = current_tenant_id())',
      pol, tbl
    );
    RAISE NOTICE 'Updated RLS policy: %.%', tbl, pol;
  END LOOP;
END
$$;

-- ==========================================================
-- 3. Create non-superuser app role (idempotent, skip if no privilege)
-- ==========================================================
DO $$ BEGIN
  -- Only create role if current user has CREATEROLE privilege
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND rolcreaterole = true) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vollos_app') THEN
      CREATE ROLE vollos_app LOGIN NOSUPERUSER NOBYPASSRLS;
      RAISE NOTICE 'Created role: vollos_app';
    END IF;
    -- Grant privileges to app role
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO vollos_app', current_database());
    GRANT USAGE ON SCHEMA public TO vollos_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vollos_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vollos_app;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO vollos_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vollos_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO vollos_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO vollos_app;
  ELSE
    RAISE NOTICE 'Skipping vollos_app role creation — current user lacks CREATEROLE privilege';
  END IF;
END $$;
