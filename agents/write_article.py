# write_article.py
# AI news agent — writes articles via Claude Code CLI and pushes to TinaCMS.
#
# This file can be used in two ways:
#   1. Run directly:  python write_article.py "your topic here"
#   2. Import:        from write_article import write_article, push_to_tina
#
# The logic is split into two functions:
#   - write_article(topic)  → calls Claude, returns the article as a dict
#   - push_to_tina(article) → pushes an article dict to TinaCMS as a draft
#
# This separation lets the runner decide what happens between writing
# and publishing — e.g. an editor agent could review the article first.

# ─── IMPORTS ────────────────────────────────────────────────────────

import sys          # sys.argv lets us read command-line arguments; sys.exit() stops the script
import json         # json.loads() parses a JSON string → Python dict; json.dumps() does the reverse
import re           # regular expressions — used to sanitize the article title into a URL-safe slug
import subprocess   # lets Python run shell commands (here: the `claude` CLI) and capture their output
import requests     # HTTP library — used to POST the article to TinaCMS via its GraphQL API
from datetime import datetime, timezone  # datetime.now() gives the current time; timezone.utc pins it to UTC

# Our own helper modules in this project:
from markdown_to_tina import markdown_to_rich_text   # converts Markdown body text into TinaCMS rich-text JSON
from editorial_config import SYSTEM_PROMPT, TINA_GRAPHQL_URL, CREATE_POST_MUTATION
# SYSTEM_PROMPT       — the editorial instructions sent to Claude (tone, format, etc.)
# TINA_GRAPHQL_URL    — the URL of the local TinaCMS GraphQL endpoint
# CREATE_POST_MUTATION — the GraphQL mutation string used to create a new post


# ─── FUNCTION 1: WRITE AN ARTICLE ──────────────────────────────────
# This is your writer agent. It takes a topic, calls Claude, and
# returns the article. It doesn't know or care about TinaCMS.
#
# Why is this a function now instead of loose code?
# Before, write_article.py was a script — it ran top to bottom and that's it.
# Now the runner can import this function and call it whenever a
# "write_article" task appears in the database. Same logic, just reusable.

def write_article(topic):
    """
    Generate a news article about the given topic using Claude Code CLI.

    Args:
        topic: A string describing what to write about,
               e.g. "renewable energy in Nova Scotia"

    Returns:
        A dictionary with keys: title, summary, body, tags, author

    Raises:
        Exception: If Claude fails or returns invalid JSON.
    """
    print(f"Writing article about: {topic}")
    print("Calling Claude Code CLI...")

    # ── Call Claude ──────────────────────────────────────────────

    try:
        # subprocess.run() executes a command and waits for it to finish.
        # We pass a list so each argument is handled safely (no shell injection).
        result = subprocess.run(
            [
                "claude",
                "-p", f"Write a news article about: {topic}",  # -p is the prompt flag
                "--system-prompt", SYSTEM_PROMPT,               # editorial instructions for Claude
                "--output-format", "json",                      # ask Claude to return structured JSON
                "--max-turns", "1",                             # one-shot: no back-and-forth conversation
            ],
            capture_output=True,  # capture stdout and stderr instead of printing them to the terminal
            text=True,            # decode bytes → str automatically (using the system's default encoding)
            timeout=120,          # give up and raise TimeoutExpired if Claude takes longer than 2 minutes
        )

        if result.returncode != 0:
            # A non-zero return code means the command failed; stderr usually has the reason.
            # We raise an Exception instead of sys.exit() because this is a function now.
            # sys.exit() would kill the entire runner — we don't want that.
            # raise Exception() hands the error back to whoever called us (the runner),
            # and they decide what to do (mark the task as "failed" in the database).
            raise Exception(f"Claude Code CLI failed: {result.stderr}")

        raw_output = result.stdout  # The full text Claude printed to stdout

    except FileNotFoundError:
        # Raised when the OS can't find the `claude` executable — it's not installed or not on PATH.
        raise Exception(
            "'claude' command not found. "
            "Make sure Claude Code CLI is installed: npm install -g @anthropic-ai/claude-code"
        )
    except subprocess.TimeoutExpired:
        raise Exception("Claude Code took too long to respond (>120 seconds)")

    # ── Parse the response ──────────────────────────────────────

    try:
        # json.loads() turns the raw JSON string from Claude into a Python dict.
        # The outer JSON envelope has a "result" key whose value is the actual article JSON (as a string).
        claude_response = json.loads(raw_output)
        article_text = claude_response.get("result", raw_output)
        # .get("result", raw_output) means: use claude_response["result"] if it exists,
        # otherwise fall back to raw_output (so we don't crash on unexpected response shapes).
    except json.JSONDecodeError:
        # If the whole output isn't valid JSON, treat it as plain text and try to parse it below.
        article_text = raw_output

    # Claude sometimes wraps JSON in a Markdown code block (```json … ```).
    # Strip those fences so json.loads() can parse the actual content.
    if isinstance(article_text, str):
        article_text = article_text.strip()
        if article_text.startswith("```"):
            lines = article_text.split("\n")
            article_text = "\n".join(lines[1:-1])  # drop first line (```json) and last line (```)

    try:
        # Now parse the article JSON string into a dict with keys like "title", "body", "summary", etc.
        article = json.loads(article_text)
    except json.JSONDecodeError:
        raise Exception(
            f"Claude didn't return valid JSON. "
            f"Raw response: {article_text[:500]}"  # include first 500 chars to help debug
        )

    print(f"Article generated: {article['title']}")

    # Return the article dict to whoever called us.
    # Before, this data just got used immediately and thrown away.
    # Now the runner can save it to the database, pass it to an editor, etc.
    return article


# ─── FUNCTION 2: PUSH TO TINACMS ───────────────────────────────────
# Takes a finished article and creates a draft post in TinaCMS.
# Separated from write_article() so the runner can control
# when publishing happens.
#
# Why separate? Because later you might want an editor agent to
# review the article before it goes to TinaCMS. If writing and
# pushing were one function, there'd be no gap for the editor.

def push_to_tina(article):
    """
    Push an article to TinaCMS as a draft post.

    Args:
        article: A dictionary with keys: title, summary, body, tags, author

    Returns:
        The slug (URL-safe filename) of the created post.

    Raises:
        Exception: If TinaCMS is unreachable or returns an error.
    """
    # TinaCMS stores body content as "rich text" (a tree of nodes), not raw Markdown.
    # markdown_to_rich_text() converts the Markdown string Claude returned into that format.
    body_rich_text = markdown_to_rich_text(article["body"])

    print("Pushing to TinaCMS as draft...")

    # Build a URL-safe slug from the title, e.g. "Renewable Energy in Nova Scotia" → "renewable-energy-in-nova-scotia"
    # re.sub() replaces every run of non-alphanumeric characters with a hyphen.
    slug = re.sub(r'[^a-z0-9]+', '-', article["title"].lower()).strip('-')
    relative_path = f"{slug}.md"  # the filename TinaCMS will create in the content directory

    # ISO 8601 timestamp in UTC — TinaCMS expects this format for date fields.
    current_date = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Assemble the variables dict that the GraphQL mutation expects.
    variables = {
        "relativePath": relative_path,
        "params": {
            "title": article["title"],
            "summary": article["summary"],
            "author": article.get("author", "AI News Agent"),  # fall back to default if Claude omitted it
            "status": "draft",                                  # always create as draft, never publish directly
            "tags": article.get("tags", []),                    # fall back to empty list if no tags
            "date": current_date,
            "body": body_rich_text,
        }
    }

    try:
        # requests.post() sends an HTTP POST request.
        # We pass the GraphQL query + variables as JSON in the request body.
        tina_response = requests.post(
            TINA_GRAPHQL_URL,
            json={"query": CREATE_POST_MUTATION, "variables": variables},  # json= auto-sets Content-Type header
            headers={"Content-Type": "application/json"},
        )
        # .json() parses the response body from JSON string → Python dict
        tina_data = tina_response.json()

        if "errors" in tina_data:
            # GraphQL returns HTTP 200 even for errors; actual errors are in the "errors" key.
            raise Exception(f"TinaCMS error: {tina_data['errors']}")

    except requests.exceptions.ConnectionError:
        # Raised when the TCP connection to TinaCMS fails — server isn't running or wrong port.
        raise Exception(
            f"Could not connect to TinaCMS at {TINA_GRAPHQL_URL}. "
            f"Make sure your Astro dev server is running."
        )

    print(f"Draft created successfully!")
    print(f"")
    print(f"   Title:    {article['title']}")
    print(f"   Author:   {article.get('author', 'AI News Agent')}")
    print(f"   Tags:     {', '.join(article.get('tags', []))}")
    print(f"   Status:   draft")
    print(f"   File:     {relative_path}")
    print(f"")
    print(f"   View it at: http://localhost:4321/admin/index.html#/collections/edit/post/{slug}")

    return slug


# ─── RUN FROM TERMINAL ──────────────────────────────────────────────
# This block only runs when you execute "python write_article.py" directly.
# It preserves the original behavior: topic from terminal → write → push.
# The runner will NOT trigger this — it imports the functions above instead.
#
# Why try/except here?
# The functions above raise Exception() when something goes wrong.
# This block catches those exceptions, prints the error, and exits cleanly.
# Without the try/except, Python would print an ugly traceback that's
# confusing if you're not a developer.

if __name__ == "__main__":
    # sys.argv is a list: [script_name, arg1, arg2, …]
    # If the user didn't provide a topic (len < 2), print help and quit.
    if len(sys.argv) < 2:
        print("Usage: python write_article.py \"your topic here\"")
        print("Example: python write_article.py \"renewable energy in Nova Scotia\"")
        sys.exit(1)

    topic = sys.argv[1]  # The topic string the user typed

    try:
        article = write_article(topic)  # Step 1: Write the article
        push_to_tina(article)           # Step 2: Push to TinaCMS
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)