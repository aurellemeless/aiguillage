-- Offer discovery: scanning France Travail for offers matching the active
-- profile, scored with the same fit assessment used in the wizard.
CREATE TABLE IF NOT EXISTS discovered_offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_slug TEXT NOT NULL,
    source TEXT NOT NULL,
    external_id TEXT NOT NULL,
    url TEXT,
    title TEXT NOT NULL,
    company TEXT,
    location TEXT,
    contract_type TEXT,
    posted_date TEXT,
    raw_text TEXT NOT NULL,
    fit_score INTEGER NOT NULL,
    fit_decision TEXT NOT NULL,
    fit_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new', -- new | dismissed | applied
    application_id INTEGER REFERENCES applications(id),
    discovered_at TEXT NOT NULL,
    UNIQUE (profile_slug, source, external_id)
);

-- Folded into the existing per-profile settings table rather than a new one.
ALTER TABLE profile_settings ADD COLUMN search_keywords TEXT NOT NULL DEFAULT '[]';
ALTER TABLE profile_settings ADD COLUMN search_location TEXT;
ALTER TABLE profile_settings ADD COLUMN search_min_fit_score INTEGER NOT NULL DEFAULT 70;
ALTER TABLE profile_settings ADD COLUMN search_sources TEXT NOT NULL DEFAULT '["france_travail"]';
ALTER TABLE profile_settings ADD COLUMN last_scan_at TEXT;
ALTER TABLE profile_settings ADD COLUMN last_scan_status TEXT;
ALTER TABLE profile_settings ADD COLUMN last_scan_error TEXT;
ALTER TABLE profile_settings ADD COLUMN last_scan_found INTEGER;
ALTER TABLE profile_settings ADD COLUMN last_scan_new INTEGER;
