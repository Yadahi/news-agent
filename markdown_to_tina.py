# markdown_to_tina.py
# Converts markdown text into TinaCMS rich-text JSON format.
#
# TinaCMS stores body content as a JSON tree, not plain markdown.
# This module handles that conversion.
#
# Usage:
#   from markdown_to_tina import markdown_to_rich_text
#   result = markdown_to_rich_text("## Hello\nSome **bold** text")
#
# Example output:
#   { "type": "root", "children": [
#       { "type": "h2", "children": [{ "type": "text", "text": "Hello" }] },
#       { "type": "p", "children": [
#           { "type": "text", "text": "Some " },
#           { "type": "text", "text": "bold", "bold": true },
#           { "type": "text", "text": " text" }
#       ]}
#   ]}

import re


def parse_inline(text):
    """
    Parse inline markdown formatting within a line of text.
    Handles: **bold**, *italic*, [links](url), `code`
    Returns a list of text nodes with appropriate formatting.
    """
    nodes = []
    # This pattern matches: **bold**, *italic*, [text](url), or `code`
    # The | means "or" — it tries each pattern left to right
    pattern = r'(\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\)|`(.+?)`)'

    last_end = 0  # Track where the last match ended

    for match in re.finditer(pattern, text):
        # Add any plain text before this match
        if match.start() > last_end:
            plain_text = text[last_end:match.start()]
            if plain_text:
                nodes.append({"type": "text", "text": plain_text})

        if match.group(2):
            # **bold** — group(2) captures the text between **
            nodes.append({"type": "text", "text": match.group(2), "bold": True})
        elif match.group(3):
            # *italic* — group(3) captures the text between *
            nodes.append({"type": "text", "text": match.group(3), "italic": True})
        elif match.group(4) and match.group(5):
            # [text](url) — group(4) is text, group(5) is url
            nodes.append({
                "type": "a",
                "url": match.group(5),
                "children": [{"type": "text", "text": match.group(4)}]
            })
        elif match.group(6):
            # `code` — group(6) captures the text between backticks
            nodes.append({"type": "text", "text": match.group(6), "code": True})

        last_end = match.end()

    # Add any remaining plain text after the last match
    if last_end < len(text):
        remaining = text[last_end:]
        if remaining:
            nodes.append({"type": "text", "text": remaining})

    # If no patterns were found, the whole thing is plain text
    if not nodes and text:
        nodes.append({"type": "text", "text": text})

    return nodes


def parse_list_items(lines, start_index, list_type):
    """
    Parse a sequence of list items (bulleted or numbered).
    Returns the list node and the index where the list ends.
    """
    items = []
    i = start_index

    while i < len(lines):
        line = lines[i]

        if list_type == "ul":
            # Match lines starting with - or * (unordered list)
            match = re.match(r'^[\-\*]\s+(.+)', line)
        else:
            # Match lines starting with 1. 2. etc (ordered list)
            match = re.match(r'^\d+\.\s+(.+)', line)

        if match:
            item_text = match.group(1)
            items.append({
                "type": "li",
                "children": [{
                    "type": "lic",  # list item content
                    "children": parse_inline(item_text)
                }]
            })
            i += 1
        else:
            # Line doesn't match the list pattern — list is done
            break

    list_node = {"type": list_type, "children": items}
    return list_node, i


def markdown_to_rich_text(markdown_text):
    """
    Convert a full markdown string into TinaCMS rich-text JSON format.
    Handles: headings (h1-h6), paragraphs, bold, italic, links, code,
    unordered lists, ordered lists, blockquotes, and horizontal rules.
    """
    children = []
    lines = markdown_text.split("\n")
    i = 0

    while i < len(lines):
        line = lines[i]

        # Skip empty lines
        if not line.strip():
            i += 1
            continue

        # --- Headings: ## Heading Text ---
        heading_match = re.match(r'^(#{1,6})\s+(.+)', line)
        if heading_match:
            level = len(heading_match.group(1))  # Count the # symbols
            heading_text = heading_match.group(2)
            children.append({
                "type": f"h{level}",
                "children": parse_inline(heading_text)
            })
            i += 1
            continue

        # --- Horizontal rule: --- or *** or ___ ---
        if re.match(r'^(-{3,}|\*{3,}|_{3,})$', line.strip()):
            children.append({"type": "hr"})
            i += 1
            continue

        # --- Unordered list: - item or * item ---
        if re.match(r'^[\-\*]\s+', line):
            list_node, i = parse_list_items(lines, i, "ul")
            children.append(list_node)
            continue

        # --- Ordered list: 1. item ---
        if re.match(r'^\d+\.\s+', line):
            list_node, i = parse_list_items(lines, i, "ol")
            children.append(list_node)
            continue

        # --- Blockquote: > text ---
        blockquote_match = re.match(r'^>\s*(.*)', line)
        if blockquote_match:
            quote_text = blockquote_match.group(1)
            children.append({
                "type": "blockquote",
                "children": [{
                    "type": "p",
                    "children": parse_inline(quote_text)
                }]
            })
            i += 1
            continue

        # --- Regular paragraph ---
        # Collect consecutive non-empty, non-special lines into one paragraph
        paragraph_lines = []
        while i < len(lines) and lines[i].strip():
            # Stop if the next line is a heading, list, hr, or blockquote
            if re.match(r'^(#{1,6}\s|[\-\*]\s+|\d+\.\s+|>{1}\s|(-{3,}|\*{3,}|_{3,})$)', lines[i]):
                break
            paragraph_lines.append(lines[i])
            i += 1

        if paragraph_lines:
            full_text = " ".join(paragraph_lines)
            children.append({
                "type": "p",
                "children": parse_inline(full_text)
            })

    return {"type": "root", "children": children}