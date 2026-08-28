# Changelog

All notable changes to this project are documented in this file.

## [1.0.0] — 2026-08-28

First public release.

### Added

- Dashboard: active applications, awaiting response, ongoing interviews,
  response rate, follow-ups due, recent activity.
- Kanban board with drag-and-drop to change an application's status, plus a
  list view.
- Detail panel per application: status, generated documents, full
  status-change history, free-form notes.
- Guided wizard to analyze a pasted job posting with Claude Code and generate
  a tailored CV and cover letter (`.docx`), with a live preview before
  generation.
- Profile setup from an existing CV (PDF or DOCX): upload it, review the
  extracted data, and save it as `profile/profile.json`.
- Search across applications by company or role.
- Excel export of all applications and their full status-change history.
- French/English interface switch, also used as the generation language for
  the CV and cover letter.
- CLI tracking (`tracker/tracker_cli.py`) alongside the dashboard.
- MIT license; project open-sourced under the name **Aiguillage**.
