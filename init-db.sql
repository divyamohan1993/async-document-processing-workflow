-- =============================================================================
-- Database Initialization Script
-- Runs automatically when the PostgreSQL container starts for the first time
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable trigram matching for text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create a read-only role for monitoring and reporting
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'readonly') THEN
        CREATE ROLE readonly;
    END IF;
END
$$;

-- Grant read-only access to the readonly role on public schema
GRANT USAGE ON SCHEMA public TO readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly;
