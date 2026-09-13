-- Tracks each follow-up sent for an application, and a per-profile default
-- delay used when a new application is created.
CREATE TABLE IF NOT EXISTS followups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL REFERENCES applications(id),
    followed_up_at TEXT NOT NULL,
    note TEXT
);

CREATE TABLE IF NOT EXISTS profile_settings (
    profile_slug TEXT PRIMARY KEY,
    default_followup_delay_days INTEGER NOT NULL DEFAULT 10
);
