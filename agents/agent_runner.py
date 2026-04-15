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
from database import get_pending_tasks, update_task

# Our agent functions — the actual workers.
# write_article() calls Claude and returns an article dict.
# push_to_tina() sends a finished article to TinaCMS as a draft.
from write_article import write_article, push_to_tina


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

        # ── Step 3: Find the right agent ────────────────────────
        # Look up the task type in our AGENTS dictionary.
        # .get() returns None if the key doesn't exist, instead of crashing.
        agent_fn = AGENTS.get(task_type)

        if agent_fn is None:
            # No agent registered for this task type.
            # This would happen if someone added a task with a type
            # we haven't built yet, like "edit_article" before the
            # editor agent exists.
            print(f"  ERROR: No agent registered for task type '{task_type}'")
            update_task(task_id, "failed", {"error": f"Unknown task type: {task_type}"})
            continue
            # "continue" skips to the next task in the loop.
            # Without it, the code below would still run and crash.

        # ── Step 4: Run the agent ───────────────────────────────
        # Mark the task as "running" so the dashboard can show it's in progress.
        update_task(task_id, "running")

        try:
            # Call the agent function with the input from the database.
            # For write_article, task_input looks like {"topic": "solar energy"}
            # so task_input["topic"] gives us the topic string.
            #
            # The agent function returns a result — for write_article,
            # that's the article dict with title, summary, body, tags, author.
            result = agent_fn(task_input["topic"])

            # ── Step 4b: Push to TinaCMS ────────────────────────
            # For now, we push right after writing. Later when you add
            # an editor agent, you'd remove this and make pushing a
            # separate task type instead.
            if task_type == "write_article":
                push_to_tina(result)

            # ── Step 5: Mark as done ────────────────────────────
            # Save the article to the database so the dashboard can display it.
            # update_task() converts the dict to JSON for storage.
            update_task(task_id, "done", result)
            print(f"  Task completed successfully.")

        except Exception as e:
            # If anything goes wrong — Claude fails, TinaCMS is down,
            # invalid JSON, etc. — the agent function raises an Exception.
            # We catch it here, save the error message, and mark the task
            # as "failed". Then we move on to the next task.
            #
            # This is why we use raise Exception() in write_article.py
            # instead of sys.exit(). sys.exit() would kill the entire runner.
            # raise Exception() lets us handle the error gracefully and
            # keep processing other tasks.
            #
            # str(e) converts the Exception object to a plain string
            # so we can store it in the database.
            print(f"  ERROR: {e}")
            update_task(task_id, "failed", {"error": str(e)})

        print("---")

    print("All tasks processed.")


# ─── RUN WHEN EXECUTED DIRECTLY ─────────────────────────────────────
# Same pattern as database.py and write_article.py.
# "python agent_runner.py" processes all pending tasks.
# When Express imports this later, it can call run_pending_tasks()
# without this block running automatically.

if __name__ == "__main__":
    run_pending_tasks()