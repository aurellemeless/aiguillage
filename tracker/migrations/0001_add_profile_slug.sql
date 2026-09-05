-- Adds multi-profile support.
-- A fresh install already gets this column from schema.sql.
-- This file brings an existing database up to date without losing any data.
-- Safe to run more than once: both the dashboard (db.ts) and the CLI
-- (db.py init) apply it automatically, ignoring the resulting
-- "duplicate column" error if it was already applied.
ALTER TABLE applications ADD COLUMN profile_slug TEXT NOT NULL DEFAULT 'default';
ALTER TABLE wizard_jobs ADD COLUMN profile_slug TEXT NOT NULL DEFAULT 'default';
