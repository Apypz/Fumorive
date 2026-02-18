-- Migration: Add name_manually_edited field to users table
-- Date: 2026-02-16
-- Purpose: Track if user has manually edited their full_name to prevent OAuth from overwriting it

-- Add name_manually_edited column
ALTER TABLE users 
ADD COLUMN name_manually_edited BOOLEAN DEFAULT FALSE;

-- Set default value for existing users (assume not manually edited)
UPDATE users 
SET name_manually_edited = FALSE 
WHERE name_manually_edited IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.name_manually_edited IS 'Track if user manually changed their name (prevents OAuth overwrite)';
