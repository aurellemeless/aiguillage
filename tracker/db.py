import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "applications.db"
SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"
MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def apply_migrations(conn: sqlite3.Connection) -> None:
    """Brings an existing database up to date with schema.sql's current
    shape. Each statement is applied individually so a column already added
    on a previous run (or by a fresh schema.sql on a new install) is simply
    skipped, never aborting the rest of the migration."""
    for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
        lines = (line for line in path.read_text().splitlines() if not line.strip().startswith("--"))
        sql = "\n".join(lines)
        for statement in sql.split(";"):
            statement = statement.strip()
            if not statement:
                continue
            try:
                conn.execute(statement)
            except sqlite3.OperationalError as err:
                if "duplicate column name" not in str(err):
                    raise


def init_db() -> None:
    conn = get_connection()
    conn.executescript(SCHEMA_PATH.read_text())
    apply_migrations(conn)
    conn.commit()
    conn.close()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "init":
        init_db()
        print(f"Base initialisée : {DB_PATH}")
    else:
        print("Usage: python3 db.py init")
