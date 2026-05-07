# edit_article.py
# AI editor agent — reviews and polishes articles via Claude Code CLI.
#
# This agent takes a finished article from the writer agent,
# reviews it for grammar, style, structure, and AP compliance,
# and returns a polished version along with a list of edits made.
#
# Usage:
#   1. Import:  from edit_article import edit_article
#   2. Direct:  python edit_article.py '{"title": "...", "body": "...", ...}'
#
# The runner calls this automatically when an edit_article task
# is picked up from the database.

# ─── IMPORTS ────────────────────────────────────────────────────────

import sys
import json
import subprocess


# ─── SYSTEM PROMPT ──────────────────────────────────────────────────
# This tells Claude to act as an editor, not a writer.
# The key difference: the editor receives an existing article
# and improves it, rather than creating from scratch.

EDITOR_SYSTEM_PROMPT = """You are a senior editor at a digital news publication. You receive articles written by junior journalists and polish them to publication quality.

## Your Editing Process

Review the article for:

1. **Grammar and spelling** — Fix any errors.
2. **AP Style compliance** — Enforce Associated Press style rules:
   - Active voice over passive voice
   - Spell out numbers one through nine, numerals for 10+
   - Short sentences (15-20 words average)
   - Short paragraphs (1-3 sentences max)
   - Proper title capitalization
   - No Oxford comma unless needed for clarity
3. **Structure** — Ensure inverted pyramid: most important info first, supporting details next, background last. The lead must answer WHO, WHAT, WHEN, WHERE, WHY.
4. **Tone** — Formal, authoritative, accessible. No exclamation marks, no rhetorical questions, no clichés, no filler phrases.
5. **Clarity** — Remove jargon or explain it. Simplify complex sentences. Cut unnecessary words.
6. **Factual consistency** — Does the summary match the body? Do the tags fit the content? Is the headline accurate?
7. **Headline** — Present tense for recent events, 6-12 words, informative not clickbait.
8. **Article length** — Body should be 300-500 words. Trim if too long, flag if too short.

## Rules

- Preserve the original meaning and facts. Do not add new information.
- Do not change the author field.
- Keep all source attributions intact.
- If the article is already good, still return it with minor improvements.
- Be specific in your edit descriptions so the journalist can learn.

## Output Format

IMPORTANT: Respond ONLY with a JSON object in this exact format. No other text, no markdown code blocks, no preamble:

{
    "title": "The edited headline",
    "summary": "The edited 1-2 sentence summary.",
    "body": "The edited full article body in markdown format.",
    "tags": ["tag1", "tag2", "tag3"],
    "author": "Keep the original author",
    "edits": [
        "Specific description of edit 1",
        "Specific description of edit 2",
        "Specific description of edit 3"
    ]
}
"""


# ─── FUNCTION: EDIT AN ARTICLE ──────────────────────────────────────

def edit_article(topic, article=None, **kwargs):
    """
    Edit and polish an article using Claude Code CLI.

    Args:
        topic: The article's topic (for logging purposes).
        article: The article dict from the writer agent, with keys:
                 title, summary, body, tags, author.
        **kwargs: Catches any extra keys in task_input.

    Returns:
        A dictionary with the polished article plus an "edits" list.

    Raises:
        Exception: If Claude fails or returns invalid JSON.
    """
    if article is None:
        raise Exception("No article provided to edit. Was this task created with a dependency on a write_article task?")

    print(f"Editing article: {article.get('title', topic)}")

    # ── Build the prompt ────────────────────────────────────────
    # We send the full article as JSON so Claude can see all fields
    # and return the same structure with improvements.

    prompt = f"Edit and polish this article:\n\n{json.dumps(article, indent=2)}"

    print("Calling Claude Code CLI...")

    # ── Call Claude ──────────────────────────────────────────────
    # The editor doesn't need web search or many turns.
    # It's a single-pass review of existing content.

    try:
        result = subprocess.run(
            [
                "claude",
                "-p", prompt,
                "--system-prompt", EDITOR_SYSTEM_PROMPT,
                "--output-format", "text",
                "--max-turns", "3",
            ],
            capture_output=True,
            text=True,
            timeout=120,
        )

        if result.returncode != 0:
            raise Exception(f"Claude Code CLI failed: {result.stderr}")

        raw_output = result.stdout
        print(f"Raw editor output: {raw_output[:500]}")

    except FileNotFoundError:
        raise Exception(
            "'claude' command not found. "
            "Make sure Claude Code CLI is installed: npm install -g @anthropic-ai/claude-code"
        )
    except subprocess.TimeoutExpired:
        raise Exception("Editor took too long to respond (>120 seconds)")

    # ── Parse the response ──────────────────────────────────────

    edited_text = raw_output.strip()
    if edited_text.startswith("```"):
        lines = edited_text.split("\n")
        edited_text = "\n".join(lines[1:-1])

    brace_index = edited_text.find("{")
    if brace_index > 0:
        edited_text = edited_text[brace_index:]

    try:
        edited_article = json.loads(edited_text)
    except json.JSONDecodeError:
        raise Exception(
            f"Claude didn't return valid JSON. "
            f"Raw response: {edited_text[:500]}"
        )

    # Log the edits
    edits = edited_article.get("edits", [])
    print(f"Article edited: {edited_article.get('title', 'Unknown')}")
    print(f"  {len(edits)} edit(s) made:")
    for edit in edits:
        print(f"    - {edit}")

    return edited_article


# ─── RUN FROM TERMINAL ──────────────────────────────────────────────
# python edit_article.py '{"title": "...", "body": "...", ...}'

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Usage: python edit_article.py \'{"title": "...", "summary": "...", "body": "...", "tags": [...], "author": "..."}\'')
        sys.exit(1)

    try:
        article = json.loads(sys.argv[1])
    except json.JSONDecodeError:
        print("Error: Argument must be valid JSON")
        sys.exit(1)

    try:
        result = edit_article(topic=article.get("title", ""), article=article)
        print("\n" + "=" * 60)
        print("EDITED ARTICLE")
        print("=" * 60)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)