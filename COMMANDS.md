# News Agent — Quick Reference Commands

## Database Setup

Run once to create the database and tasks table:

```bash
cd agents/
python database.py
```

This creates `newsroom.db` one level up in the project root.

---

## Adding Tasks

Add a task from the terminal:

```bash
python -c "from database import add_task; add_task('write_article', {'topic': 'your topic here'})"
```

Example:

```bash
python -c "from database import add_task; add_task('write_article', {'topic': 'solar energy in Nova Scotia'})"
```

---

## Running the Agent Runner

Process all pending tasks:

```bash
python agent_runner.py
```

Make sure your Astro dev server is running first (for TinaCMS).

---

## Checking Tasks

See all pending tasks:

```bash
python -c "from database import get_pending_tasks; print(get_pending_tasks())"
```

See all tasks (pending, running, done, failed):

```bash
python -c "from database import get_all_tasks; print(get_all_tasks())"
```

---

## Running the Writer Directly (Without the Runner)

You can still use the old way if you want to skip the database:

```bash
python write_article.py "your topic here"
```

---

## Useful Checks

Verify Claude Code CLI is installed:

```bash
claude --version
```

Check if the database file exists:

```bash
ls ../newsroom.db
```

---

## File Locations

All commands assume you are inside the `agents/` folder:

```
news-agent/
├── newsroom.db          ← created by database.py (in project root)
├── agents/              ← run commands from here
│   ├── database.py
│   ├── agent_runner.py
│   ├── write_article.py
│   ├── editorial_config.py
│   └── markdown_to_tina.py
├── api/                 ← Express backend (future)
├── frontend/            ← React dashboard (future)
└── venv/
```
