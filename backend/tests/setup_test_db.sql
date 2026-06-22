-- Create test database (run this manually once)
-- Then pytest will use this database for all tests

-- Create test database
CREATE DATABASE fumorive_test;

-- Connect to test database
\c fumorive_test

-- Enable UUID extension (required for User model)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable TimescaleDB extension (for EEG time-series data)
-- Note: This requires TimescaleDB to be installed
-- If not using TimescaleDB features in tests, this can be skipped
-- CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Grant permissions (adjust username if needed)
GRANT ALL PRIVILEGES ON DATABASE fumorive_test TO postgres;
