-- V10: Add role column to users table for JWT-based admin auth (M-admin-header)
-- Replaces X-Admin-Secret header-based authentication
ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER';

-- Set admin role by email (owner only)
-- Usage: UPDATE users SET role = 'ADMIN' WHERE email = 'owner@example.com';
