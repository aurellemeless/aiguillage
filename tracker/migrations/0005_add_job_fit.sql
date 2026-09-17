-- Job-fit assessment produced by Claude Code alongside the CV/letter
-- analysis, stored on the application for later reference.
ALTER TABLE applications ADD COLUMN fit_score INTEGER;
ALTER TABLE applications ADD COLUMN fit_decision TEXT;
ALTER TABLE applications ADD COLUMN fit_json TEXT;
