# write_article.py
# AI news agent — takes a topic, writes an article via Claude Code CLI,
# pushes to TinaCMS as draft.
#
# Usage:
#   python write_article.py "your topic here"
#
# Requirements:
#   pip install python-dotenv requests
#   Claude Code CLI installed and authenticated (claude --version to check)
#   Astro dev server running (TinaCMS at localhost:4001)

# ─── IMPORTS ────────────────────────────────────────────────────────

import sys
import json
import re
import subprocess
import requests
from datetime import datetime, timezone

# Import our modules
from markdown_to_tina import markdown_to_rich_text
from editorial_config import SYSTEM_PROMPT, TINA_GRAPHQL_URL, CREATE_POST_MUTATION

# ─── GET THE TOPIC ──────────────────────────────────────────────────

if len(sys.argv) < 2:
    print("Usage: python write_article.py \"your topic here\"")
    print("Example: python write_article.py \"renewable energy in Nova Scotia\"")
    sys.exit(1)

topic = sys.argv[1]
print(f"Writing article about: {topic}")
print("---")

# ─── GENERATE ARTICLE WITH CLAUDE CODE CLI ──────────────────────────

print("Calling Claude Code CLI...")

try:
    result = subprocess.run(
        [
            "claude",
            "-p", f"Write a news article about: {topic}",
            "--system-prompt", SYSTEM_PROMPT,
            "--output-format", "json",
            "--max-turns", "1",
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )

    if result.returncode != 0:
        print(f"Error running Claude Code: {result.stderr}")
        sys.exit(1)

    raw_output = result.stdout

except FileNotFoundError:
    print("Error: 'claude' command not found.")
    print("Make sure Claude Code CLI is installed: npm install -g @anthropic-ai/claude-code")
    sys.exit(1)
except subprocess.TimeoutExpired:
    print("Error: Claude Code took too long to respond (>120 seconds)")
    sys.exit(1)
except Exception as e:
    print(f"Error calling Claude Code: {e}")
    sys.exit(1)

# ─── PARSE THE RESPONSE ────────────────────────────────────────────

try:
    claude_response = json.loads(raw_output)
    article_text = claude_response.get("result", raw_output)
except json.JSONDecodeError:
    article_text = raw_output

# Clean up markdown code blocks if present
if isinstance(article_text, str):
    article_text = article_text.strip()
    if article_text.startswith("```"):
        lines = article_text.split("\n")
        article_text = "\n".join(lines[1:-1])

try:
    article = json.loads(article_text)
except json.JSONDecodeError as e:
    print(f"Error: Claude didn't return valid JSON")
    print(f"Raw response was: {article_text[:500]}")
    sys.exit(1)

print(f"Article generated: {article['title']}")

# ─── CONVERT AND PUSH TO TINACMS ───────────────────────────────────

body_rich_text = markdown_to_rich_text(article["body"])

print("Pushing to TinaCMS as draft...")

slug = re.sub(r'[^a-z0-9]+', '-', article["title"].lower()).strip('-')
relative_path = f"{slug}.md"
current_date = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

variables = {
    "relativePath": relative_path,
    "params": {
        "title": article["title"],
        "summary": article["summary"],
        "author": article.get("author", "AI News Agent"),
        "status": "draft",
        "tags": article.get("tags", []),
        "date": current_date,
        "body": body_rich_text,
    }
}

try:
    tina_response = requests.post(
        TINA_GRAPHQL_URL,
        json={"query": CREATE_POST_MUTATION, "variables": variables},
        headers={"Content-Type": "application/json"},
    )
    tina_data = tina_response.json()

    if "errors" in tina_data:
        print(f"TinaCMS error: {tina_data['errors']}")
        sys.exit(1)

    print(f"Draft created successfully!")
    print(f"")
    print(f"   Title:    {article['title']}")
    print(f"   Author:   {article.get('author', 'AI News Agent')}")
    print(f"   Tags:     {', '.join(article.get('tags', []))}")
    print(f"   Status:   draft")
    print(f"   File:     {relative_path}")
    print(f"")
    print(f"   View it at: http://localhost:4321/admin/index.html#/collections/edit/post/{slug}")

except requests.exceptions.ConnectionError:
    print(f"Error: Could not connect to TinaCMS at {TINA_GRAPHQL_URL}")
    print(f"Make sure your Astro dev server is running.")
    sys.exit(1)
except Exception as e:
    print(f"Error pushing to TinaCMS: {e}")
    sys.exit(1)