# research_agent.py
# AI research agent — searches the web and compiles research briefs.
#
# This agent uses Claude Code CLI with the web search MCP server
# to find current information about a topic. It can also check
# specific source URLs provided by the user.
#
# Usage:
#   1. Import:  from research_agent import research_topic
#   2. Direct:  python research_agent.py "your topic here"
#
# The output is a structured research brief that the write_article
# agent can use as context for writing informed articles.

# ─── IMPORTS ────────────────────────────────────────────────────────

import sys
import json
import subprocess


# ─── SYSTEM PROMPT ──────────────────────────────────────────────────
# This tells Claude what kind of research to do and how to format it.
# Unlike the writer agent, this prompt encourages Claude to use
# web search to find current, real information.

RESEARCH_SYSTEM_PROMPT = """You are a senior research journalist. Your job is to research a topic thoroughly using web search and compile a structured research brief that another journalist will use to write an article.

## Your Research Process

1. Search the web for the topic to find current, relevant information.
2. If specific source URLs are provided, fetch and read those pages too.
3. Look for: recent developments, key facts, statistics, expert quotes, and context.
4. Cross-reference information across multiple sources when possible.

## Output Format

IMPORTANT: Respond ONLY with a JSON object in this exact format. No other text, no markdown code blocks, no preamble:

{
    "topic": "The researched topic",
    "key_facts": [
        "Fact 1 with specific details, numbers, or dates",
        "Fact 2 with attribution to source",
        "Fact 3 etc."
    ],
    "statistics": [
        "Any relevant numbers, percentages, or data points with their sources"
    ],
    "quotes": [
        {
            "text": "The exact quote",
            "source": "Who said it and where it was published"
        }
    ],
    "sources": [
        {
            "title": "Article or page title",
            "url": "https://...",
            "summary": "One sentence about what this source covers"
        }
    ],
    "context": "2-3 sentences of background context that would help a journalist understand the bigger picture.",
    "angle_suggestions": [
        "Possible angle 1 for the article",
        "Possible angle 2 for the article"
    ]
}

## Rules

- Only include facts you found through search. Do not make up information.
- Always attribute facts to their sources.
- If you cannot find enough information, say so in the context field.
- Prioritize recent information over older sources.
- Include at least 3 sources when possible.
- Keep your response concise. Limit key_facts to the 5 most important facts.
"""


# ─── FUNCTION: RESEARCH A TOPIC ────────────────────────────────────

def research_topic(topic, sources=None):
    """
    Research a topic using Claude CLI with web search.

    Args:
        topic: The topic to research, e.g. "solar energy in Nova Scotia"
        sources: Optional list of URLs to check specifically.

    Returns:
        A dictionary containing the structured research brief.

    Raises:
        Exception: If Claude fails or returns invalid JSON.
    """
    print(f"Researching topic: {topic}")

    # ── Build the prompt ────────────────────────────────────────
    # The prompt tells Claude what to research.
    # If the user provided specific source URLs, we include them
    # so Claude knows to check those pages too.

    prompt = f"Research this topic thoroughly: {topic}"

    if sources:
        prompt += "\n\nAlso check these specific sources:\n"
        for url in sources:
            prompt += f"- {url}\n"

    prompt += "\nSearch the web for current information, then compile your research brief."

    print("Calling Claude Code CLI with web search...")

    # ── Call Claude ──────────────────────────────────────────────
    # Key differences from the writer agent:
    # - --max-turns 10: the research agent needs more turns because
    #   Claude will search, read pages, search again, etc.
    # - timeout 300: 5 minutes instead of 2, since web search takes longer.
    # - No --allowedTools needed — the MCP server is configured globally
    #   and Claude will use it automatically.

    try:
        result = subprocess.run(
            [
                "claude",
                "-p", prompt,
                "--system-prompt", RESEARCH_SYSTEM_PROMPT,
                "--output-format", "text",
                "--max-turns", "10",
            ],
            capture_output=True,
            text=True,
            timeout=300,
        )

        if result.returncode != 0:
            raise Exception(f"Claude Code CLI failed: {result.stderr}")

        raw_output = result.stdout
        print(f"Raw research output: {raw_output[:500]}")

    except FileNotFoundError:
        raise Exception(
            "'claude' command not found. "
            "Make sure Claude Code CLI is installed: npm install -g @anthropic-ai/claude-code"
        )
    except subprocess.TimeoutExpired:
        raise Exception("Research took too long (>300 seconds)")

    # ── Parse the response ──────────────────────────────────────
    # Same parsing logic as write_article.py — strip code fences
    # if present, then parse JSON.

    research_text = raw_output.strip()
    if research_text.startswith("```"):
        lines = research_text.split("\n")
        research_text = "\n".join(lines[1:-1])

    brace_index = research_text.find("{")
    if brace_index > 0:
        research_text = research_text[brace_index:]

    try:
        brief = json.loads(research_text)
    except json.JSONDecodeError:
        raise Exception(
            f"Claude didn't return valid JSON. "
            f"Raw response: {research_text[:500]}"
        )

    # Count what we got for logging
    num_facts = len(brief.get("key_facts", []))
    num_sources = len(brief.get("sources", []))
    print(f"Research complete: {num_facts} facts, {num_sources} sources")

    return brief


# ─── RUN FROM TERMINAL ──────────────────────────────────────────────
# python research_agent.py "topic" ["url1" "url2" ...]

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Usage: python research_agent.py "your topic here" ["url1" "url2" ...]')
        print('Example: python research_agent.py "solar energy in Nova Scotia"')
        print('Example: python research_agent.py "solar energy" "https://www.nrcan.gc.ca/energy"')
        sys.exit(1)

    topic = sys.argv[1]
    sources = sys.argv[2:] if len(sys.argv) > 2 else None

    try:
        brief = research_topic(topic, sources)
        print("\n" + "=" * 60)
        print("RESEARCH BRIEF")
        print("=" * 60)
        print(json.dumps(brief, indent=2))
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)