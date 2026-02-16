-- Rollback: Remove name_manually_edited field from users table
-- Date: 2026-02-16

-- Remove name_manually_edited column
ALTER TABLE users 
DROP COLUMN IF EXISTS name_manually_edited;
