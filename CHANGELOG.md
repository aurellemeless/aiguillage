# Changelog

All notable changes to this project are documented in this file.

## [1.2.0] — 2026-09-06

### Added

- Analysis and document generation now run as background tasks, tracked in a
  new "Tâches" page and a sidebar badge: start one on your laptop, close the
  tab, and resume the review from any device on the same network.
- Multiple profiles: track entirely separate candidates, each with its own
  Kanban board, dashboard, tasks, and generated documents. Switchable from
  the sidebar, with a "set as default" option for the one that should load
  first on a new device.
- Responsive layout, including an off-canvas sidebar with a hamburger menu,
  so the dashboard is usable on mobile.

### Fixed

- `claude -p` calls waited a few seconds per run for a stdin input that
  never came, before proceeding — its input is now closed immediately.
- Several card layouts (experience/skills rows, the profile import card, the
  Kanban toolbar, task/follow-up cards) overflowed the viewport on mobile.
- Retrying a job after a generation failure was permanently blocked by a
  misleading "already launched" error.
- Generation could fail outright after the multi-profile change, due to a
  profile-scoped path being embedded in the output filename instead of only
  the output directory.

## [1.1.0] — 2026-09-02

### Added

- Profile page: edit `profile/profile.json` directly through a form (identity,
  skills, experience, education, certifications, languages, personal
  projects, and an advanced section for skill-depth nuances) instead of raw
  JSON, with add/remove on every repeatable section. Importing from a CV
  fills this same form.
- Wizard option to generate the CV and cover letter in French and English at
  once, producing two separate documents from a single job posting.
- QR code printed in the terminal when running the dashboard in dev mode,
  linking to the board so it can be opened on a phone on the same Wi-Fi.
- Responsive layout: off-canvas sidebar with a hamburger menu on mobile, and
  forms, the Kanban toolbar, and the profile import card adapted for small
  screens.
- Screenshots in the README.

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
