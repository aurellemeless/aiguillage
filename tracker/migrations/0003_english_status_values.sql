-- Renames application status values from French display text to English
-- slugs, matching the rest of the schema's naming (wizard_jobs.status,
-- profile_slug, etc.). Display text is unaffected — it's driven by
-- STATUS_LABELS/statusLabel() in the dashboard and a display dict in the
-- CLI, not by these stored values. Safe to run more than once: once a row
-- is remapped its old value no longer matches, so the UPDATE is a no-op.
UPDATE applications SET status = 'draft' WHERE status = 'Brouillon';
UPDATE applications SET status = 'sent' WHERE status = 'Envoyé';
UPDATE applications SET status = 'response_received' WHERE status = 'Réponse reçue';
UPDATE applications SET status = 'hr_interview' WHERE status = 'Entretien RH';
UPDATE applications SET status = 'technical_interview' WHERE status = 'Entretien technique';
UPDATE applications SET status = 'offer_received' WHERE status = 'Offre reçue';
UPDATE applications SET status = 'rejected' WHERE status = 'Refusé';
UPDATE applications SET status = 'no_response_abandoned' WHERE status = 'Sans réponse/Abandonné';

UPDATE status_history SET status = 'draft' WHERE status = 'Brouillon';
UPDATE status_history SET status = 'sent' WHERE status = 'Envoyé';
UPDATE status_history SET status = 'response_received' WHERE status = 'Réponse reçue';
UPDATE status_history SET status = 'hr_interview' WHERE status = 'Entretien RH';
UPDATE status_history SET status = 'technical_interview' WHERE status = 'Entretien technique';
UPDATE status_history SET status = 'offer_received' WHERE status = 'Offre reçue';
UPDATE status_history SET status = 'rejected' WHERE status = 'Refusé';
UPDATE status_history SET status = 'no_response_abandoned' WHERE status = 'Sans réponse/Abandonné';
