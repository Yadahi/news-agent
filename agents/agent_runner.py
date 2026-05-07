# agent_runner.py
# The task runner — the "boss" that checks the to-do list and assigns work.
#
# This script reads pending tasks from the database, figures out which
# agent function to call for each one, runs it, and saves the result.
#
# Usage:
#   python agent_runner.py
#
# It processes all pending tasks and then exits. It doesn't run in a loop
# or wait for new tasks — you run it when you want work done.
# Later, Express or a cron job will trigger it automatically.

# ─── IMPORTS ────────────────────────────────────────────────────────

# Our database module — the abstraction layer we built.
# These functions handle all the SQLite work so we never write SQL here.
from database import get_pending_tasks, update_task, get_task

# Our agent functions — the actual workers.
# write_article() calls Claude and returns an article dict.
# push_to_tina() sends a finished article to TinaCMS as a draft.
from write_article import write_article, push_to_tina
from research_agent import research_topic
from edit_article import edit_article


# ─── AGENT REGISTRY ────────────────────────────────────────────────
# This dictionary maps task types to agent functions.
# When a task comes in with type "write_article", the runner looks it up
# here and calls the matching function.
#
# Why a dictionary? Because adding a new agent later is just one line:
#   "edit_article": edit_article,
#   "post_social_media": post_social_media,
#
# This is the "dispatch" concept we discussed — it's just a lookup table.
# The runner doesn't need to know what each agent does. It just finds
# the right function and calls it.

AGENTS = {
    "write_article": write_article,
    "research_topic": research_topic,
    "edit_article": edit_article,
}


# ─── THE RUNNER ─────────────────────────────────────────────────────
# This function is the core of the runner. It:
# 1. Gets all pending tasks from the database
# 2. For each task, finds the right agent and runs it
# 3. Saves the result (or error) back to the database

def run_pending_tasks():
    """
    Process all pending tasks in the database.
    For each task: mark as running → call the agent → mark as done/failed.
    """

    # ── Step 1: Check for pending tasks ─────────────────────────
    # get_pending_tasks() returns a list of dicts from the database.
    # Each dict has: id, type, input, status, result, created_at, completed_at
    pending = get_pending_tasks()

    if not pending:
        # "not pending" is Python's way of checking if a list is empty.
        # An empty list is "falsy" in Python, so "not []" is True.
        print("No pending tasks found.")
        return

    print(f"Found {len(pending)} pending task(s).")
    print("---")

    # ── Step 2: Process each task ───────────────────────────────
    for task in pending:
        task_id = task["id"]
        task_type = task["type"]
        task_input = task["input"]

        print(f"Processing task: {task_id}")
        print(f"  Type:  {task_type}")
        print(f"  Input: {task_input}")

        # ── Check dependency ────────────────────────────────────
        # If this task depends on another task, check if the parent
        # is done. If not, skip this task for now. If the parent
        # failed, mark this task as failed too.
        if task.get("depends_on"):
            parent = get_task(task["depends_on"])

            if parent is None:
                print(f"  ERROR: Dependency {task['depends_on']} not found")
                update_task(task_id, "failed", {"error": "Dependency task not found"})
                continue

            if parent["status"] == "failed":
                print(f"  ERROR: Dependency {task['depends_on']} failed")
                update_task(task_id, "failed", {"error": "Dependency task failed"})
                continue

            if parent["status"] != "done":
                print(f"  Skipping — waiting on dependency {task['depends_on']}")
                continue

            # Parent is done — inject its result into this task's input
            if task_type == "edit_article":
                task_input["article"] = parent["result"]
                print(f"  Using article from task {task['depends_on']}")
            elif task_type == "write_article":
                task_input["research"] = parent["result"]
                print(f"  Using research from task {task['depends_on']}")

        # ── Find the right agent ────────────────────────────────
        agent_fn = AGENTS.get(task_type)

        if agent_fn is None:
            print(f"  ERROR: No agent registered for task type '{task_type}'")
            update_task(task_id, "failed", {"error": f"Unknown task type: {task_type}"})
            continue

        # ── Run the agent ───────────────────────────────────────
        update_task(task_id, "running")

        try:
            result = agent_fn(**task_input)

            if task_input.get("publish"):
                push_to_tina(result)

            update_task(task_id, "done", result)
            print(f"  Task completed successfully.")

        except Exception as e:
            print(f"  ERROR: {e}")
            update_task(task_id, "failed", {"error": str(e)})

        print("---")


# ─── RUN WHEN EXECUTED DIRECTLY ─────────────────────────────────────
# Same pattern as database.py and write_article.py.
# "python agent_runner.py" processes all pending tasks.
# When Express imports this later, it can call run_pending_tasks()
# without this block running automatically.

if __name__ == "__main__":
    run_pending_tasks()