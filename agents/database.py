# database.py
# The database abstraction layer for the newsroom task system.
#
# This file is the ONLY place in the project that talks to SQLite directly.
# Everything else — the runner, the Express API — calls functions from here.
# That means if you ever switch to PostgreSQL, you only rewrite this file.
#
# SQLite is not a server. It's a library that reads/writes a single file.
# Python has it built in — no pip install needed.

# ─── IMPORTS ────────────────────────────────────────────────────────

import sqlite3        # Built into Python — talks to SQLite databases
import json           # For converting Python dicts to/from JSON strings
import uuid           # For generating unique task IDs
from datetime import datetime, timezone  # For timestamps


# ─── DATABASE FILE PATH ────────────────────────────────────────────
# This is the actual file on disk. When this runs the first time,
# SQLite creates it automatically. After that, it just opens it.
# We put it in the project root (one level up from agents/).

DATABASE_PATH = "../newsroom.db"


# ─── HELPER: GET A CONNECTION ───────────────────────────────────────
# Every time we want to talk to the database, we need a "connection."
# Think of it like opening the file — you open it, do your work, close it.
#
# Why a helper function? Because we always want the same settings,
# and we don't want to repeat ourselves.

def get_connection():
    """
    Open a connection to the database file.
    Returns a connection object that we use to run SQL commands.
    """
    conn = sqlite3.connect(DATABASE_PATH)

    # This line makes SQLite return rows as dictionaries instead of tuples.
    # Without it: row = (1, "write_article", "pending")  — which field is which?
    # With it:    row = {"id": 1, "type": "write_article", "status": "pending"}
    conn.row_factory = sqlite3.Row

    return conn


# ─── FUNCTION 1: CREATE THE TABLE ──────────────────────────────────
# Run this once to set up the database structure.
# "IF NOT EXISTS" means it won't crash if you accidentally run it twice.

def create_tables():
    """
    Create the tasks table if it doesn't already exist.
    Call this once when setting up the project.
    """
    conn = get_connection()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            input TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            result TEXT,
            created_at TEXT NOT NULL,
            completed_at TEXT
        )
    """)

    # "commit" means "actually save this change."
    # SQLite doesn't save automatically — if you forget commit,
    # your changes disappear when the connection closes.
    conn.commit()

    conn.close()
    print("Database ready: tasks table created.")


# ─── FUNCTION 2: ADD A TASK ────────────────────────────────────────
# Creates a new task with status "pending."
# The runner will pick it up later.

def add_task(task_type, task_input):
    """
    Add a new task to the database.

    Args:
        task_type: What kind of job, e.g. "write_article"
        task_input: A dictionary with the details, e.g. {"topic": "solar energy"}

    Returns:
        The generated task ID (a unique string).
    """
    conn = get_connection()

    # uuid4() generates a random unique ID like "a3f2b8c1-..."
    # This guarantees no two tasks ever have the same ID,
    # even if they're created at the exact same moment.
    task_id = str(uuid.uuid4())

    # Get the current time in UTC (universal time, not local time).
    # UTC avoids confusion if you ever run this from different time zones
    # (like your Mac vs your Raspberry Pi).
    now = datetime.now(timezone.utc).isoformat()

    # json.dumps converts a Python dictionary into a JSON string.
    # SQLite stores text, not Python objects, so we need this conversion.
    # Example: {"topic": "solar energy"} → '{"topic": "solar energy"}'
    conn.execute(
        """
        INSERT INTO tasks (id, type, input, status, created_at)
        VALUES (?, ?, ?, 'pending', ?)
        """,
        (task_id, task_type, json.dumps(task_input), now)
    )

    # The ? placeholders above are important for security.
    # They prevent "SQL injection" — a type of attack where someone
    # puts malicious SQL inside the input data. The ? tells SQLite
    # "this is data, not a command." Always use ? instead of
    # putting variables directly in the SQL string.

    conn.commit()
    conn.close()

    return task_id


# ─── FUNCTION 3: GET PENDING TASKS ─────────────────────────────────
# The runner calls this to find work to do.

def get_pending_tasks():
    """
    Return all tasks with status 'pending'.
    These are tasks waiting to be picked up by the runner.

    Returns:
        A list of dictionaries, one per task.
    """
    conn = get_connection()

    rows = conn.execute(
        "SELECT * FROM tasks WHERE status = 'pending' ORDER BY created_at"
    ).fetchall()

    # sqlite3.Row objects look like dictionaries but aren't exactly.
    # Converting them to real dicts makes them easier to work with
    # (and easier to convert to JSON later for the Express API).
    tasks = [dict(row) for row in rows]

    # Parse the JSON strings back into Python dictionaries.
    # Remember: we stored them as JSON strings with json.dumps().
    # Now we convert them back with json.loads().
    for task in tasks:
        task["input"] = json.loads(task["input"])
        if task["result"]:
            task["result"] = json.loads(task["result"])

    conn.close()
    return tasks


# ─── FUNCTION 4: UPDATE A TASK ──────────────────────────────────────
# The runner calls this to mark a task as "running", "done", or "failed".

def update_task(task_id, status, result=None):
    """
    Update a task's status and optionally its result.

    Args:
        task_id: The unique ID of the task to update.
        status: New status — "running", "done", or "failed".
        result: Optional dictionary with the output (e.g. the article).
    """
    conn = get_connection()

    # If there's a result, convert it to a JSON string for storage.
    result_json = json.dumps(result) if result else None

    # Set completed_at only when the task is done or failed.
    completed_at = None
    if status in ("done", "failed"):
        completed_at = datetime.now(timezone.utc).isoformat()

    conn.execute(
        """
        UPDATE tasks
        SET status = ?, result = ?, completed_at = ?
        WHERE id = ?
        """,
        (status, result_json, completed_at, task_id)
    )

    conn.commit()
    conn.close()


# ─── FUNCTION 5: GET ALL TASKS ─────────────────────────────────────
# The dashboard calls this to display everything.

def get_all_tasks():
    """
    Return all tasks, newest first.
    Used by the dashboard to show the full task list.

    Returns:
        A list of dictionaries, one per task.
    """
    conn = get_connection()

    rows = conn.execute(
        "SELECT * FROM tasks ORDER BY created_at DESC"
    ).fetchall()

    tasks = [dict(row) for row in rows]

    for task in tasks:
        task["input"] = json.loads(task["input"])
        if task["result"]:
            task["result"] = json.loads(task["result"])

    conn.close()
    return tasks


# ─── RUN SETUP IF EXECUTED DIRECTLY ────────────────────────────────
# This block only runs when you execute "python database.py" directly.
# It does NOT run when another file imports from this module.
#
# This is a Python pattern you'll see everywhere:
#   if __name__ == "__main__":
#
# When Python runs a file directly, it sets __name__ to "__main__".
# When Python imports a file, __name__ is set to the module name instead.
# So this is how you say "do this only when I'm the main script."

if __name__ == "__main__":
    create_tables()

    # Add a test task so you can see it working
    test_id = add_task("write_article", {"topic": "test article about SQLite"})
    print(f"Test task created with ID: {test_id}")

    # Read it back
    pending = get_pending_tasks()
    print(f"Pending tasks: {len(pending)}")
    for task in pending:
        print(f"  - [{task['status']}] {task['type']}: {task['input']}")