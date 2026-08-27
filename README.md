# Aiguillage

[![Licence](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)

Outil personnel de suivi de candidatures : tu colles une offre d'emploi, l'app
génère un CV et une lettre de motivation adaptés (via Claude Code), tu relis
et valides, puis chaque candidature avance sur son propre rail — statuts,
relances, historique — jusqu'à sa destination.

Ce projet est pensé pour un usage **local et mono-utilisateur** — il n'y a
pas d'authentification ni de multi-compte. Il est publié en open source pour
que d'autres puissent le réutiliser, l'adapter ou s'en inspirer, en y mettant
leur propre profil.

## Fonctionnalités

- Analyse d'une offre collée en texte brut par Claude Code (headless), à
  partir de ton profil (`profile/profile.json`), pour proposer un CV et une
  lettre adaptés.
- Relecture et édition du contenu proposé avant génération, avec aperçu du
  CV en direct.
- Génération des documents `.docx` (service Python dédié).
- Tableau de bord : candidatures actives, en attente de réponse, entretiens
  en cours, taux de réponse, relances à faire, activité récente.
- Vue Kanban (glisser-déposer une candidature d'une colonne à l'autre pour
  changer son statut) et vue liste.
- Fiche détaillée par candidature : statut, documents générés, historique
  des changements de statut, notes libres.
- Suivi en CLI (`tracker/tracker_cli.py`) en complément du dashboard.

## Prérequis

- [Claude Code](https://claude.com/claude-code) installé et authentifié en
  ligne de commande (`claude`) — utilisé en mode headless pour analyser les
  offres.
- Node.js 20+ et npm.
- Python 3.10+.

## Installation

1. **Cloner le dépôt puis créer ton profil** à partir du modèle fourni :

   ```bash
   cp profile/profile-default.json profile/profile.json
   ```

   Remplis `profile/profile.json` avec tes propres informations (identité,
   compétences, expériences, formations...). Ce fichier contient des données
   personnelles : il est ignoré par git (`.gitignore`) et ne doit jamais être
   commité.

2. **Service de génération de CV** (`services/cv-generator`) :

   ```bash
   cd services/cv-generator
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Dashboard** (`dashboard/`) :

   ```bash
   cd dashboard
   npm install
   ```

4. **Base de suivi** (`tracker/`) :

   ```bash
   cd tracker
   python3 db.py init   # crée data/applications.db à partir de schema.sql
   ```

## Démarrage

```bash
./start.sh
```

Démarre le service de génération de CV (port 8000) puis le dashboard
(`http://localhost:3000`).

## Suivi des candidatures en CLI

```bash
cd tracker
python3 tracker_cli.py add --company "Acme" --role "Dev Full Stack" --status Brouillon
python3 tracker_cli.py list
```

## Structure du projet

```
dashboard/               Next.js — tableau de bord, Kanban, wizard de création
services/cv-generator/   FastAPI + python-docx — génération des .docx
tracker/                 CLI Python + schéma SQLite pour le suivi
profile/                 Ton profil (profile.json, ignoré par git)
data/                    Base SQLite + documents générés (ignorés par git)
```

## Licence

Ce projet est distribué sous licence [MIT](LICENSE).
