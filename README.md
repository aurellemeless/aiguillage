# Aiguillage

[![Version](https://img.shields.io/badge/version-1.3.0-informational.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A personal job-application tracker: paste a job posting, the app generates a
tailored CV and cover letter (via Claude Code), you review and approve them,
and each application then moves along its own track — status, follow-ups,
history — toward its destination.

> **Note:** the interface language (French/English) is switchable from the
> sidebar and also controls the language of the generated CV and cover
> letter.

This project is built for **local** use — there's no authentication or
network multi-tenancy. It supports several local profiles though (useful if
more than one person in your household job-hunts with it), each with its own
fully separate board, tasks, and generated documents. It's open source so
others can reuse it, adapt it, or take inspiration from it with their own
profile.

## Screenshots

|                          Dashboard                          |                        Kanban board                         |                       Application detail                       |
| :-----------------------------------------------------------: | :-----------------------------------------------------------: | :----------------------------------------------------------: |
| ![Dashboard](docs/screenshots/dashboard.jpg) | ![Kanban board](docs/screenshots/kanban.jpg) | ![Application detail panel](docs/screenshots/drawer.jpg) |

*(Screenshots use sample data — not a real job search.)*

## Features

- Analyzes a plain-text job posting with Claude Code (headless), based on
  your profile, to propose a tailored CV and cover letter.
- Review and edit the proposed content before generating documents, with a
  live CV preview.
- Generates `.docx` documents (dedicated Python service).
- Analysis and generation run as background tasks (a "Tâches" page + sidebar
  badge track their status), so you can start one on your laptop, close the
  tab, and pick the review back up from your phone on the same Wi-Fi.
- Several local profiles, switchable from the sidebar, each with its own
  fully separate Kanban board, dashboard, tasks, and generated documents —
  useful if more than one person uses the app.
- Dashboard: active applications, awaiting response, ongoing interviews,
  response rate, follow-ups due, recent activity.
- Kanban view (drag a card to another column to change its status) and list
  view.
- Detail panel per application: status, the original job posting (handy for
  interview prep), generated documents, status-change history, free-form
  notes.
- CLI tracking (`tracker/tracker_cli.py`) alongside the dashboard.
- French/English interface switch, also used as the generation language for
  the CV and cover letter — with an option to generate both languages at
  once (two separate files per document).
- Profile editor with a proper form (identity, skills, experience,
  education, certifications, languages, personal projects) instead of raw
  JSON, and can also be filled in by importing an existing CV (PDF or DOCX).
- Excel export of all applications and their full status-change history, for
  analysis outside the app.
- QR code printed in the terminal when the dev server is ready, to open the
  board straight from your phone.
- Responsive UI, usable on mobile.

## Requirements

- [Claude Code](https://claude.com/claude-code) installed and authenticated
  on the command line (`claude`) — used headless to analyze job postings.
- Node.js 20+ and npm.
- Python 3.10+.

## Setup

1. **Clone the repo, then create your profile.** Start the app and use the
   **Profile** page to create a profile, then either fill it in by hand or
   import your existing CV (PDF/DOCX) — it extracts your information and
   lets you review it before saving. Add more profiles the same way if more
   than one person will use the app; switch between them from the sidebar.
   Profiles live under `profile/profiles/` and hold personal data: the whole
   folder is git-ignored and should never be committed.

2. **CV generation service** (`services/cv-generator`):

   ```bash
   cd services/cv-generator
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Dashboard** (`dashboard/`):

   ```bash
   cd dashboard
   npm install
   ```

4. **Tracking database** (`tracker/`):

   ```bash
   cd tracker
   python3 db.py init   # creates data/applications.db from schema.sql
   ```

## Running

```bash
./start.sh
```

Starts the CV generation service (port 8000) then the dashboard
(`http://localhost:3000`).

The dashboard's dev server also prints a QR code in the terminal once it's
ready, linking straight to the Candidatures board on your phone (same
Wi-Fi).

## Tracking applications from the CLI

```bash
cd tracker
python3 tracker_cli.py add --company "Acme" --role "Full Stack Dev" --status draft
python3 tracker_cli.py list
```

## Project structure

```
dashboard/               Next.js — dashboard, Kanban, application wizard
services/cv-generator/   FastAPI + python-docx — .docx generation
tracker/                 Python CLI + SQLite schema for tracking
profile/                 Your profile(s) (profiles/*.json, git-ignored)
data/                    SQLite database + generated documents (git-ignored)
```

## License

This project is distributed under the [MIT](LICENSE) license.
