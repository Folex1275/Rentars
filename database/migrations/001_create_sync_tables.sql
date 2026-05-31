-- Migration: 001_create_sync_tables
-- Creates the sync_log table for tracking blockchain ↔ database sync operations.

CREATE TABLE IF NOT EXISTS sync_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('property', 'booking')),
  entity_id   TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  error_message TEXT,
  synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying recent sync history by entity
CREATE INDEX IF NOT EXISTS idx_sync_log_entity
  ON sync_log (entity_type, entity_id, synced_at DESC);

-- Index for querying failed syncs
CREATE INDEX IF NOT EXISTS idx_sync_log_status
  ON sync_log (status, synced_at DESC);

-- Auto-cleanup: remove sync log entries older than 30 days to prevent unbounded growth.
-- Run via a scheduled job or pg_cron extension.
-- DELETE FROM sync_log WHERE synced_at < NOW() - INTERVAL '30 days';
