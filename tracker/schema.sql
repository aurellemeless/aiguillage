CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    offer_source TEXT,
    offer_date TEXT,
    application_date TEXT,
    status TEXT NOT NULL DEFAULT 'Brouillon',
    next_followup_date TEXT,
    followup_delay_days INTEGER NOT NULL DEFAULT 10,
    notes TEXT,
    recruiter_contact TEXT,
    cv_file_path TEXT,
    cover_letter_file_path TEXT,
    cv_version INTEGER NOT NULL DEFAULT 1,
    profile_slug TEXT NOT NULL DEFAULT 'default'
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
