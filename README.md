# News Agent Project — Setup Guide & Learning Notes

## Project Overview

An AI-powered news agent that:

1. Takes a topic as input
2. Calls Claude Code CLI to write a professional news article
3. Converts the markdown body to TinaCMS rich-text format
4. Pushes the article to TinaCMS as a draft via GraphQL API
5. You review and publish from the admin panel

The agent runs on your Mac alongside your Astro + TinaCMS site.

---

## Architecture

```
python write_article.py "your topic"
    │
    ├── write_article.py         Main script — orchestrates the workflow
    │       │
    │       ├── editorial_config.py   Editorial guidelines (AP style system prompt)
    │       │
    │       └── markdown_to_tina.py   Converts markdown → TinaCMS rich-text JSON
    │
    ├── Claude Code CLI (-p mode)    Generates the article using your Pro subscription
    │
    └── TinaCMS GraphQL API          Creates a draft post at localhost:4001
            │
            ▼
    You review in TinaCMS admin panel → publish when ready
```

---

## File Structure

```
news-agent/
├── .env                    # Environment variables (currently unused, kept for future keys)
├── venv/                   # Virtual environment (don't edit anything in here)
├── write_article.py        # Main agent script
├── editorial_config.py     # System prompt, editorial guidelines, TinaCMS config
├── markdown_to_tina.py     # Markdown to TinaCMS rich-text converter
└── README.md               # Project description
```

---

## Setup Steps

### 1. Check Python Version

```bash
python3 --version
# Result: Python 3.14.3
```

### 2. Create Project & Virtual Environment

```bash
mkdir ~/Documents/projects/news-agent
cd ~/Documents/projects/news-agent
python3 -m venv venv
```

### 3. Activate Virtual Environment

**For Fish shell** (what we use):

```bash
source venv/bin/activate.fish
```

**For Bash/Zsh:**

```bash
source venv/bin/activate
```

**Error encountered:** Running `source venv/bin/activate` in Fish shell fails because the default activate script uses Bash syntax. Python creates shell-specific scripts: `activate` (Bash), `activate.fish` (Fish), `activate.csh` (C shell).

### 4. Install Dependencies

```bash
pip install python-dotenv requests
```

### 5. Verify Claude Code CLI

```bash
claude --version
```

Claude Code must be installed and authenticated via your Pro subscription.

### 6. Run the Agent

Make sure your Astro dev server is running first, then:

```bash
python write_article.py "renewable energy in Nova Scotia"
```

---

## Key Concepts

### What is an Agent?

A regular API call: "Here's a prompt, give me a response."
An agent: "Here's a goal, figure out the steps, use tools, keep going until done."

Our agent is simple — single step, single tool. But the pattern scales to multi-step, multi-tool agents later.

### Claude Code Print Mode (-p)

Claude Code's non-interactive mode. It receives a prompt, generates output, prints to stdout, and exits. Perfect for scripting. Uses your Pro subscription — no separate API key needed.

### TinaCMS Rich-Text Format

TinaCMS stores body content as a JSON tree, not plain markdown. The `markdown_to_tina.py` module converts between the two formats. This is necessary because we chose the GraphQL API approach.

### Inverted Pyramid (AP Style)

The standard structure for news writing: most important information first (who, what, when, where, why), supporting details next, background last. A reader who only reads the first paragraph should understand the story.

### GraphQL

A query language for APIs. Unlike REST (where you hit different URLs for different things), GraphQL uses a single endpoint and you specify exactly what you want. TinaCMS uses GraphQL for all content operations.

### Virtual Environment

An isolated Python installation for a single project. Libraries installed inside don't affect other projects.

### Subprocess

Python's way of running terminal commands from code. We use it to call `claude -p` from our Python script.

---

## Future Phases

- **Phase 2:** Add web search so the agent researches before writing
- **Phase 3:** Multi-agent orchestration (editor, writer, social media agents)
- **Phase 4:** Flask web interface with a topic input form
- **Phase 5:** Automated scheduling with cron jobs on Raspberry Pi

---
