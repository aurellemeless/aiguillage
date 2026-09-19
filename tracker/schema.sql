CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    offer_source TEXT,
    offer_text TEXT,
    offer_date TEXT,
    application_date TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    next_followup_date TEXT,
    followup_delay_days INTEGER NOT NULL DEFAULT 10,
    notes TEXT,
    recruiter_contact TEXT,
    cv_file_path TEXT,
    cover_letter_file_path TEXT,
    cv_version INTEGER NOT NULL DEFAULT 1,
    profile_slug TEXT NOT NULL DEFAULT 'default',
    fit_score INTEGER,
    fit_decision TEXT,
    fit_json TEXT
);

CREATE TABLE IF NOT EXISTS status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL REFERENCES applications(id),
    status TEXT NOT NULL,
    changed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wizard_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    status TEXT NOT NULL, -- analyzing | ready | generating | done | error
    language TEXT NOT NULL,
    offer_text TEXT NOT NULL,
    also_other_language INTEGER NOT NULL DEFAULT 0,
    generate_cover_letter INTEGER NOT NULL DEFAULT 1,
    result_json TEXT,
    error_message TEXT,
    application_id INTEGER REFERENCES applications(id),
    cv_path TEXT,
    cover_letter_path TEXT,
    profile_slug TEXT NOT NULL DEFAULT 'default'
);

CREATE TABLE IF NOT EXISTS followups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL REFERENCES applications(id),
    followed_up_at TEXT NOT NULL,
    note TEXT
);

CREATE TABLE IF NOT EXISTS profile_settings (
    profile_slug TEXT PRIMARY KEY,
    default_followup_delay_days INTEGER NOT NULL DEFAULT 10,
    search_keywords TEXT NOT NULL DEFAULT '[]',
    search_location TEXT,
    search_min_fit_score INTEGER NOT NULL DEFAULT 70,
    search_sources TEXT NOT NULL DEFAULT '["france_travail"]',
    last_scan_at TEXT,
    last_scan_status TEXT,
    last_scan_error TEXT,
    last_scan_found INTEGER,
    last_scan_new INTEGER
);

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
    status TEXT NOT NULL DEFAULT 'new',
    application_id INTEGER REFERENCES applications(id),
    discovered_at TEXT NOT NULL,
    UNIQUE (profile_slug, source, external_id)
);
