# Aiguillage

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A personal job-application tracker: paste a job posting, the app generates a
tailored CV and cover letter (via Claude Code), you review and approve them,
and each application then moves along its own track — status, follow-ups,
history — toward its destination.

> **Note:** the interface language (French/English) is switchable from the
> sidebar and also controls the language of the generated CV and cover
> letter.

This project is built for **local, single-user** use — there's no
authentication or multi-account support. It's open source so others can
reuse it, adapt it, or take inspiration from it with their own profile.

## Features

- Analyzes a plain-text job posting with Claude Code (headless), based on
  your profile (`profile/profile.json`), to propose a tailored CV and cover
  letter.
- Review and edit the proposed content before generating documents, with a
  live CV preview.
- Generates `.docx` documents (dedicated Python service).
- Dashboard: active applications, awaiting response, ongoing interviews,
  response rate, follow-ups due, recent activity.
- Kanban view (drag a card to another column to change its status) and list
  view.
- Detail panel per application: status, generated documents, status-change
  history, free-form notes.
- CLI tracking (`tracker/tracker_cli.py`) alongside the dashboard.
- French/English interface switch, also used as the generation language for
  the CV and cover letter.
- Profile setup from an existing CV (PDF or DOCX): upload it, review the
  extracted data, and save it as `profile/profile.json`.

## Requirements

- [Claude Code](https://claude.com/claude-code) installed and authenticated
  on the command line (`claude`) — used headless to analyze job postings.
- Node.js 20+ and npm.
- Python 3.10+.

## Setup

1. **Clone the repo, then create your profile.** Either copy the provided
   template and fill it in by hand:

   ```bash
   cp profile/profile-default.json profile/profile.json
   ```

   or start the app and use the **Profile** page to import your existing CV
   (PDF/DOCX) — it extracts your information and lets you review it before
   saving. Either way, `profile/profile.json` holds personal data: it's
   git-ignored and should never be committed.

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

## Tracking applications from the CLI

```bash
cd tracker
python3 tracker_cli.py add --company "Acme" --role "Full Stack Dev" --status Brouillon
python3 tracker_cli.py list
```

## Project structure

```
dashboard/               Next.js — dashboard, Kanban, application wizard
services/cv-generator/   FastAPI + python-docx — .docx generation
tracker/                 Python CLI + SQLite schema for tracking
profile/                 Your profile (profile.json, git-ignored)
data/                    SQLite database + generated documents (git-ignored)
```

## License

This project is distributed under the [MIT](LICENSE) license.
