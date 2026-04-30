# News Agent Project — Setup Guide & Learning Notes

## Project Overview

An AI-powered newsroom management system. The core agent takes a topic, calls Claude Code CLI to write a professional news article, and pushes it to TinaCMS as a draft. A full-stack web app lets you manage tasks, review articles, and control the agent through a dashboard.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      frontend/                          │
│   React + Vite + TanStack Router + TanStack Query       │
│   login → dashboard (task table + create task form)     │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (JWT auth)
┌────────────────────────▼────────────────────────────────┐
│                        api/                             │
│   Express 5 + better-sqlite3 + Zod + bcrypt + JWT       │
│                                                         │
│   POST /auth/register   POST /auth/login                │
│   GET  /api/tasks       POST /api/tasks                 │
│   PUT  /api/tasks/:id   DELETE /api/tasks/:id           │
└────────────────────────┬────────────────────────────────┘
                         │ reads/writes newsroom.db
┌────────────────────────▼────────────────────────────────┐
│                      agents/                            │
│   Python — agent_runner.py reads pending tasks          │
│   and dispatches them to the right agent function       │
│                                                         │
│   write_article.py  → calls Claude Code CLI (-p mode)   │
│   editorial_config.py  → AP style system prompt        │
│   markdown_to_tina.py  → markdown → TinaCMS JSON        │
│   database.py  → SQLite abstraction layer               │
└────────────────────────┬────────────────────────────────┘
                         │
                   TinaCMS GraphQL API
              (creates draft at localhost:4001)
```

---

## File Structure

```
news-agent/
├── newsroom.db             # SQLite database (created on first run)
├── agents/
│   ├── agent_runner.py     # Reads pending tasks, dispatches to agents
│   ├── write_article.py    # Calls Claude CLI, pushes result to TinaCMS
│   ├── editorial_config.py # AP style system prompt + TinaCMS config
│   ├── markdown_to_tina.py # Markdown → TinaCMS rich-text JSON converter
│   └── database.py         # SQLite CRUD functions (Python side)
├── api/
│   ├── server.js           # Entry point — starts Express on port 3000
│   ├── app.js              # Express app, routes, error handler
│   ├── db.js               # SQLite connection (better-sqlite3)
│   ├── routes/
│   │   ├── authRoutes.js   # POST /auth/register, /auth/login
│   │   └── taskRoutes.js   # CRUD /api/tasks (JWT protected)
│   ├── controllers/
│   │   ├── authController.js
│   │   └── taskController.js
│   ├── middleware/
│   │   ├── auth.js         # JWT verification middleware
│   │   └── validate.js     # Zod request validation middleware
│   ├── schemas/
│   │   ├── authSchema.js
│   │   └── tasksSchemas.js
│   └── utils/
│       └── AppError.js     # Custom error class with statusCode
├── frontend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── __root.tsx       # Root layout
│   │   │   ├── index.tsx        # Redirect to login or dashboard
│   │   │   ├── login.tsx        # Login / register page
│   │   │   └── dashboard.tsx    # Task table + create task form
│   │   ├── components/          # shadcn/ui components
│   │   ├── hooks/               # React Query hooks
│   │   └── lib/                 # Utilities (cn, api client)
│   └── vite.config.ts
├── venv/                   # Python virtual environment
└── README.md
```

---

## Setup

### Python (agents)

```bash
# From project root
python3 -m venv venv
source venv/bin/activate.fish   # Fish shell
# or: source venv/bin/activate  # Bash/Zsh

pip install python-dotenv requests
```

Initialize the database (first time only):

```bash
cd agents
python database.py
```

### API

```bash
cd api
npm install
npm run dev    # starts on port 3000 with nodemon
```

### Frontend

```bash
cd frontend
npm install
npm run dev    # starts Vite dev server on port 5173
```

---

## Running the Agent

1. Make sure your Astro + TinaCMS dev server is running (port 4001)
2. Create a task via the dashboard, or add one directly:

```bash
cd agents
python -c "from database import add_task; add_task('write_article', {'topic': 'renewable energy in Nova Scotia'})"
```

3. Run the agent runner:

```bash
python agent_runner.py
```

The runner picks up all `pending` tasks, calls Claude Code CLI, pushes the article to TinaCMS, and marks tasks as `done` or `failed`. You then review and publish from the TinaCMS admin panel.

---

## API Reference

All `/api/*` routes require a `Authorization: Bearer <token>` header. Get the token from `POST /auth/login`.

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Create account |
| POST | /auth/login | Get JWT token |
| GET | /api/tasks | List all tasks |
| POST | /api/tasks | Create a task |
| PUT | /api/tasks/:id | Update a task |
| DELETE | /api/tasks/:id | Delete a task |

---

## Key Concepts

### Agent Runner Dispatch Pattern

The runner uses a dictionary to map task types to agent functions:

```python
AGENTS = {
    "write_article": write_article,
    # "edit_article": edit_article,  # add more here later
}
```

Adding a new agent is one line. The runner doesn't need to know what each agent does.

### Claude Code Print Mode (`-p`)

Non-interactive mode for scripting. The agent passes a prompt, Claude generates the article to stdout, and exits. Uses your Pro subscription — no separate API key needed.

### Task Lifecycle

```
pending → running → done
                 → failed
```

Tasks are created via the API or directly in Python. The runner processes them and writes results back to the same SQLite file both sides share.

### TinaCMS Rich-Text Format

TinaCMS stores body content as a JSON tree, not plain markdown. `markdown_to_tina.py` handles the conversion. Required because the project uses the GraphQL API approach rather than file-based editing.

### JWT Authentication

The Express API issues a JWT on login. All task routes require it. The frontend stores the token and sends it as a Bearer header via TanStack Query.

---

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, TypeScript, TailwindCSS 4, shadcn/ui |
| Routing | TanStack Router (file-based) |
| Data fetching | TanStack Query |
| API | Express 5, Node.js |
| Database | SQLite via better-sqlite3 (JS) / sqlite3 (Python) |
| Validation | Zod |
| Auth | bcrypt + JWT |
| Agent | Python 3.14, Claude Code CLI |

---

## Future Phases

- **Phase 2:** Add web search so the agent researches before writing
- **Phase 3:** Multi-agent orchestration (editor, writer, social media agents)
- **Phase 4:** Express triggers `agent_runner.py` automatically when a task is created
- **Phase 5:** Automated scheduling with cron jobs on Raspberry Pi
