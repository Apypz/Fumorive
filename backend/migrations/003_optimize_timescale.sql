-- Migration 003: TimescaleDB Query Optimization
-- Date: 2026-02-18
-- Purpose: Convert tables to TimescaleDB hypertables, add continuous aggregates,
--          composite indexes, and materialized session summary view.
-- Week 5, Wednesday - Optimization

-- ============================================
-- PART 0: FIX PRIMARY KEYS & CONVERT TO HYPERTABLES
--
-- TimescaleDB requires that the partitioning column (timestamp) be part of
-- the primary key for tables with a unique PK. We drop the old integer PK
-- and replace it with a composite (id, timestamp) PK.
-- migrate_data => true preserves existing rows.
-- if_not_exists => true makes each step safe to re-run.
-- ============================================

-- ---- eeg_data ----
DO $$
BEGIN
    -- Only fix PK if timestamp is NOT already part of it
    IF NOT EXISTS (
        SELECT 1 FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = 'eeg_data'::regclass AND i.indisprimary AND a.attname = 'timestamp'
    ) THEN
        ALTER TABLE eeg_data DROP CONSTRAINT IF EXISTS eeg_data_pkey;
        ALTER TABLE eeg_data ADD PRIMARY KEY (id, timestamp);
    END IF;
END$$;

SELECT create_hypertable(
    'eeg_data', 'timestamp',
    migrate_data => true,
    if_not_exists => true
);

-- ---- face_detection_events ----
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = 'face_detection_events'::regclass AND i.indisprimary AND a.attname = 'timestamp'
    ) THEN
        ALTER TABLE face_detection_events DROP CONSTRAINT IF EXISTS face_detection_events_pkey;
        ALTER TABLE face_detection_events ADD PRIMARY KEY (id, timestamp);
    END IF;
END$$;

SELECT create_hypertable(
    'face_detection_events', 'timestamp',
    migrate_data => true,
    if_not_exists => true
);

-- ---- game_events ----
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = 'game_events'::regclass AND i.indisprimary AND a.attname = 'timestamp'
    ) THEN
        ALTER TABLE game_events DROP CONSTRAINT IF EXISTS game_events_pkey;
        ALTER TABLE game_events ADD PRIMARY KEY (id, timestamp);
    END IF;
END$$;

SELECT create_hypertable(
    'game_events', 'timestamp',
    migrate_data => true,
    if_not_exists => true
);

-- ---- alerts ----
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = 'alerts'::regclass AND i.indisprimary AND a.attname = 'timestamp'
    ) THEN
        ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_pkey;
        ALTER TABLE alerts ADD PRIMARY KEY (id, timestamp);
    END IF;
END$$;

SELECT create_hypertable(
    'alerts', 'timestamp',
    migrate_data => true,
    if_not_exists => true
);

-- ============================================
-- PART 1: COMPOSITE INDEXES
-- Improve WHERE session_id + ORDER BY timestamp queries (hot path for playback)
-- ============================================

-- EEG data: composite index on (session_id, timestamp) for range queries
CREATE INDEX IF NOT EXISTS idx_eeg_data_session_time
    ON eeg_data (session_id, timestamp DESC);

-- Face events: composite index
CREATE INDEX IF NOT EXISTS idx_face_events_session_time
    ON face_detection_events (session_id, timestamp DESC);

-- Game events: composite index
CREATE INDEX IF NOT EXISTS idx_game_events_session_time
    ON game_events (session_id, timestamp DESC);

-- Alerts: composite index
CREATE INDEX IF NOT EXISTS idx_alerts_session_time
    ON alerts (session_id, timestamp DESC);

-- Alerts: partial index for unacknowledged alerts (used by real-time dashboard)
CREATE INDEX IF NOT EXISTS idx_alerts_unacknowledged
    ON alerts (session_id, timestamp DESC)
    WHERE acknowledged = FALSE;

-- Sessions: index for listing user sessions sorted by date
CREATE INDEX IF NOT EXISTS idx_sessions_user_started
    ON sessions (user_id, started_at DESC);

-- Sessions: partial index for active sessions (used by EEG /latest-active)
CREATE INDEX IF NOT EXISTS idx_sessions_active
    ON sessions (started_at DESC)
    WHERE session_status = 'active';


-- ============================================
-- PART 2: TIMESCALEDB CONTINUOUS AGGREGATES
-- Pre-compute 1-minute band power averages for fast dashboard rendering
-- ============================================

-- Drop if re-running migration
DROP MATERIALIZED VIEW IF EXISTS eeg_1min_agg CASCADE;

CREATE MATERIALIZED VIEW eeg_1min_agg
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 minute', timestamp)  AS bucket,
    session_id,
    AVG(delta_power)                    AS avg_delta,
    AVG(theta_power)                    AS avg_theta,
    AVG(alpha_power)                    AS avg_alpha,
    AVG(beta_power)                     AS avg_beta,
    AVG(gamma_power)                    AS avg_gamma,
    AVG(theta_alpha_ratio)              AS avg_theta_alpha_ratio,
    AVG(eeg_fatigue_score)              AS avg_fatigue_score,
    AVG(signal_quality)                 AS avg_signal_quality,
    COUNT(*)                            AS sample_count
FROM eeg_data
GROUP BY bucket, session_id
WITH NO DATA;

-- Refresh policy: keep aggregate up-to-date for recent data
-- Refresh trailing 2 hours every 30 seconds (suitable for live sessions)
SELECT add_continuous_aggregate_policy(
    'eeg_1min_agg',
    start_offset => INTERVAL '2 hours',
    end_offset   => INTERVAL '30 seconds',
    schedule_interval => INTERVAL '30 seconds'
);

-- Index on the aggregate for fast session+time queries
CREATE INDEX IF NOT EXISTS idx_eeg_1min_agg_session_bucket
    ON eeg_1min_agg (session_id, bucket DESC);


-- 5-minute aggregate for longer time-range views (session summary / export)
DROP MATERIALIZED VIEW IF EXISTS eeg_5min_agg CASCADE;

CREATE MATERIALIZED VIEW eeg_5min_agg
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('5 minutes', timestamp) AS bucket,
    session_id,
    AVG(delta_power)                    AS avg_delta,
    AVG(theta_power)                    AS avg_theta,
    AVG(alpha_power)                    AS avg_alpha,
    AVG(beta_power)                     AS avg_beta,
    AVG(gamma_power)                    AS avg_gamma,
    AVG(theta_alpha_ratio)              AS avg_theta_alpha_ratio,
    AVG(eeg_fatigue_score)              AS avg_fatigue_score,
    COUNT(*)                            AS sample_count
FROM eeg_data
GROUP BY bucket, session_id
WITH NO DATA;

SELECT add_continuous_aggregate_policy(
    'eeg_5min_agg',
    start_offset => INTERVAL '12 hours',
    end_offset   => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '5 minutes'
);

CREATE INDEX IF NOT EXISTS idx_eeg_5min_agg_session_bucket
    ON eeg_5min_agg (session_id, bucket DESC);


-- ============================================
-- PART 3: TIMESCALEDB CHUNK INTERVALS
-- Tune chunk interval for expected data volume:
-- 256 Hz × 3600 s = ~921,600 rows/hour → 1-hour chunks are optimal
-- ============================================

SELECT set_chunk_time_interval('eeg_data', INTERVAL '1 hour');
SELECT set_chunk_time_interval('face_detection_events', INTERVAL '1 hour');
SELECT set_chunk_time_interval('game_events', INTERVAL '1 hour');
SELECT set_chunk_time_interval('alerts', INTERVAL '1 day');


-- ============================================
-- PART 4: SESSION SUMMARY MATERIALIZED VIEW
-- Used by dashboard: last X sessions with pre-computed stats
-- Refreshed manually (or via pg_cron) after session.complete
-- ============================================

DROP MATERIALIZED VIEW IF EXISTS session_summaries;

CREATE MATERIALIZED VIEW session_summaries AS
SELECT
    s.id                                                            AS session_id,
    s.user_id,
    s.session_name,
    s.session_status,
    s.started_at,
    s.ended_at,
    s.duration_seconds,
    s.avg_fatigue_score,
    s.max_fatigue_score,
    s.alert_count,

    -- EEG aggregate stats (from continuous aggregate if available, else raw)
    (
        SELECT AVG(avg_theta_alpha_ratio)
        FROM eeg_1min_agg
        WHERE session_id = s.id
    )                                                               AS overall_theta_alpha,

    -- Face event counts
    (SELECT COUNT(*) FROM face_detection_events f WHERE f.session_id = s.id AND f.eyes_closed = TRUE)   AS eyes_closed_count,
    (SELECT COUNT(*) FROM face_detection_events f WHERE f.session_id = s.id AND f.yawning = TRUE)       AS yawn_count,

    -- Alert breakdown
    (SELECT COUNT(*) FROM alerts a WHERE a.session_id = s.id AND a.alert_level = 'warning')     AS warning_count,
    (SELECT COUNT(*) FROM alerts a WHERE a.session_id = s.id AND a.alert_level = 'critical')    AS critical_count

FROM sessions s;

-- Unique index required for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_summaries_id
    ON session_summaries (session_id);

CREATE INDEX IF NOT EXISTS idx_session_summaries_user
    ON session_summaries (user_id, started_at DESC);


-- ============================================
-- PART 5: DATA RETENTION POLICY (optional, best-practice)
-- Auto-drop raw EEG chunks older than 90 days; keep aggregates
-- ============================================

SELECT add_retention_policy('eeg_data', INTERVAL '90 days', if_not_exists => TRUE);
SELECT add_retention_policy('face_detection_events', INTERVAL '90 days', if_not_exists => TRUE);
SELECT add_retention_policy('game_events', INTERVAL '90 days', if_not_exists => TRUE);


-- ============================================
-- INITIAL POPULATE of aggregates & summary view
-- ============================================

CALL refresh_continuous_aggregate('eeg_1min_agg', NULL, NULL);
CALL refresh_continuous_aggregate('eeg_5min_agg', NULL, NULL);
REFRESH MATERIALIZED VIEW CONCURRENTLY session_summaries;

-- Note: continuous aggregates (eeg_1min_agg, eeg_5min_agg) are TimescaleDB
-- internal views — COMMENT ON MATERIALIZED VIEW does not apply to them.
COMMENT ON MATERIALIZED VIEW session_summaries IS 'Pre-computed session stats for dashboard listing; refresh after session.complete';
