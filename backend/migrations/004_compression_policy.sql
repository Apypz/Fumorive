-- =============================================================================
-- Migration 004: TimescaleDB Compression Policies
-- Date: 2026-02-19
-- Purpose:
--   Enable native TimescaleDB columnar compression on all four hypertables.
--   Chunks older than the defined threshold are compressed automatically,
--   typically achieving 5–10× storage reduction with zero schema changes.
--
-- Prerequisites: Migration 003 must have been applied (hypertables must exist).
-- Safe to re-run: all SELECT calls use if_not_exists => TRUE.
-- =============================================================================


-- ============================================================
-- 1. EEG DATA — compress after 7 days
--    (256 Hz × 3 600 s/h × 24 h = ~22 M rows/day; compression critical)
-- ============================================================

ALTER TABLE eeg_data SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'session_id',   -- one segment per session
    timescaledb.compress_orderby   = 'timestamp DESC' -- queries scan newest first
);

SELECT add_compression_policy(
    'eeg_data',
    compress_after => INTERVAL '7 days',
    if_not_exists  => TRUE
);


-- ============================================================
-- 2. FACE DETECTION EVENTS — compress after 7 days
-- ============================================================

ALTER TABLE face_detection_events SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'session_id',
    timescaledb.compress_orderby   = 'timestamp DESC'
);

SELECT add_compression_policy(
    'face_detection_events',
    compress_after => INTERVAL '7 days',
    if_not_exists  => TRUE
);


-- ============================================================
-- 3. GAME EVENTS — compress after 7 days
-- ============================================================

ALTER TABLE game_events SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'session_id',
    timescaledb.compress_orderby   = 'timestamp DESC'
);

SELECT add_compression_policy(
    'game_events',
    compress_after => INTERVAL '7 days',
    if_not_exists  => TRUE
);


-- ============================================================
-- 4. ALERTS — compress after 30 days
--    Alerts are accessed more frequently for dashboard queries;
--    keep 30 days hot before compressing.
-- ============================================================

ALTER TABLE alerts SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'session_id',
    timescaledb.compress_orderby   = 'timestamp DESC'
);

SELECT add_compression_policy(
    'alerts',
    compress_after => INTERVAL '30 days',
    if_not_exists  => TRUE
);


-- ============================================================
-- 5. MANUAL COMPRESSION (back-fill older chunks if any exist)
--    Only compresses chunks that are already past the threshold.
--    Safe to run on an empty database — no rows = no chunks to compress.
-- ============================================================

SELECT compress_chunk(chunk, if_not_compressed => TRUE)
FROM   show_chunks('eeg_data',             older_than => INTERVAL '7 days')  AS chunk;

SELECT compress_chunk(chunk, if_not_compressed => TRUE)
FROM   show_chunks('face_detection_events', older_than => INTERVAL '7 days')  AS chunk;

SELECT compress_chunk(chunk, if_not_compressed => TRUE)
FROM   show_chunks('game_events',           older_than => INTERVAL '7 days')  AS chunk;

SELECT compress_chunk(chunk, if_not_compressed => TRUE)
FROM   show_chunks('alerts',                older_than => INTERVAL '30 days') AS chunk;


-- ============================================================
-- 6. VERIFY — query compression stats after running
--    (Uncomment and run manually to confirm)
-- ============================================================
-- SELECT hypertable_name,
--        total_chunks,
--        number_compressed_chunks,
--        pg_size_pretty(before_compression_total_bytes)  AS before,
--        pg_size_pretty(after_compression_total_bytes)   AS after
-- FROM   timescaledb_information.compression_settings
-- JOIN   chunk_compression_stats('eeg_data') ON TRUE
-- LIMIT  5;
