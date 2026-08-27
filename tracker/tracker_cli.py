#!/usr/bin/env python3
import argparse
from datetime import date, datetime, timedelta

from db import get_connection, init_db

# Status values are kept in French: they are user-facing content shown in the
# CLI output and (later) the dashboard UI, not code identifiers.
STATUSES = [
    "Brouillon",
    "Envoyé",
    "Réponse reçue",
    "Entretien RH",
    "Entretien technique",
    "Offre reçue",
    "Refusé",
    "Sans réponse/Abandonné",
]

# Statuses for which a follow-up makes sense (waiting on a response).
PENDING_STATUSES = {"Envoyé"}


def business_days_between(start: date, end: date) -> int:
    if start >= end:
        return 0
    days = 0
    current = start
    while current < end:
        current += timedelta(days=1)
        if current.weekday() < 5:
            days += 1
    return days


def cmd_add(args):
    conn = get_connection()
    today = date.today().isoformat()
    application_date = args.application_date or today
    cur = conn.execute(
        """
        INSERT INTO applications
            (company, role, offer_source, offer_date, application_date,
             status, followup_delay_days, notes, recruiter_contact,
             cv_file_path, cover_letter_file_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            args.company,
            args.role,
            args.offer_source,
            args.offer_date,
            application_date,
            args.status,
            args.followup_delay_days,
            args.notes,
            args.recruiter_contact,
            args.cv_path,
            args.cover_letter_path,
        ),
    )
    application_id = cur.lastrowid
    conn.execute(
        "INSERT INTO status_history (application_id, status, changed_at) VALUES (?, ?, ?)",
        (application_id, args.status, datetime.now().isoformat(timespec="seconds")),
    )
    conn.commit()
    conn.close()
    print(f"Candidature #{application_id} créée : {args.company} — {args.role} ({args.status})")


def cmd_update_status(args):
    if args.status not in STATUSES:
        raise SystemExit(f"Statut inconnu '{args.status}'. Valeurs possibles : {', '.join(STATUSES)}")
    conn = get_connection()
    row = conn.execute("SELECT id FROM applications WHERE id = ?", (args.id,)).fetchone()
    if row is None:
        raise SystemExit(f"Aucune candidature avec l'id {args.id}")
    conn.execute("UPDATE applications SET status = ? WHERE id = ?", (args.status, args.id))
    if args.notes:
        conn.execute("UPDATE applications SET notes = ? WHERE id = ?", (args.notes, args.id))
    conn.execute(
        "INSERT INTO status_history (application_id, status, changed_at) VALUES (?, ?, ?)",
        (args.id, args.status, datetime.now().isoformat(timespec="seconds")),
    )
    conn.commit()
    conn.close()
    print(f"Candidature #{args.id} -> statut '{args.status}'")


def cmd_list(args):
    conn = get_connection()
    query = "SELECT * FROM applications"
    params = []
    if args.status:
        query += " WHERE status = ?"
        params.append(args.status)
    query += " ORDER BY application_date DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()

    today = date.today()
    for row in rows:
        followup_due = False
        if row["status"] in PENDING_STATUSES and row["application_date"]:
            try:
                application_date = date.fromisoformat(row["application_date"])
                business_days = business_days_between(application_date, today)
                followup_due = business_days >= (row["followup_delay_days"] or 10)
            except ValueError:
                followup_due = False

        if args.followup_due and not followup_due:
            continue

        badge = " [A RELANCER]" if followup_due else ""
        print(
            f"#{row['id']} — {row['company']} — {row['role']} — "
            f"{row['status']} (envoyé le {row['application_date']}){badge}"
        )


def cmd_init(args):
    init_db()
    print("Base initialisée.")


def build_parser():
    parser = argparse.ArgumentParser(description="Suivi des candidatures")
    sub = parser.add_subparsers(dest="command", required=True)

    p_init = sub.add_parser("init", help="Initialise la base SQLite")
    p_init.set_defaults(func=cmd_init)

    p_add = sub.add_parser("add", help="Ajoute une candidature")
    p_add.add_argument("--company", required=True)
    p_add.add_argument("--role", required=True)
    p_add.add_argument("--offer-source")
    p_add.add_argument("--offer-date")
    p_add.add_argument("--application-date", help="Défaut : aujourd'hui")
    p_add.add_argument("--status", default="Brouillon", choices=STATUSES)
    p_add.add_argument("--followup-delay-days", type=int, default=10)
    p_add.add_argument("--notes")
    p_add.add_argument("--recruiter-contact")
    p_add.add_argument("--cv-path")
    p_add.add_argument("--cover-letter-path")
    p_add.set_defaults(func=cmd_add)

    p_update = sub.add_parser("update-status", help="Change le statut d'une candidature")
    p_update.add_argument("--id", type=int, required=True)
    p_update.add_argument("--status", required=True, choices=STATUSES)
    p_update.add_argument("--notes")
    p_update.set_defaults(func=cmd_update_status)

    p_list = sub.add_parser("list", help="Liste les candidatures")
    p_list.add_argument("--status", choices=STATUSES)
    p_list.add_argument("--followup-due", action="store_true", help="N'afficher que les candidatures à relancer")
    p_list.set_defaults(func=cmd_list)

    return parser


if __name__ == "__main__":
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)
