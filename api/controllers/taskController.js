const crypto = require("crypto");
const db = require("../db");

function getAllTasks(req, res, next) {
  try {
    const tasks = db.prepare("SELECT * FROM tasks").all();
    res.json(tasks);
  } catch (error) {
    next(error);
  }
}

function addTask(req, res, next) {
  try {
    const { type, input } = req.body;
    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();

    db.prepare(
      "INSERT INTO tasks (id, type, input, status, created_at) VALUES (?, ?, ?, 'pending', ?)",
    ).run(id, type, JSON.stringify(input), created_at);

    res.status(201).json({ id, type, input, status: "pending", created_at });
  } catch (error) {
    next(error);
  }
}

function updateTask(req, res, next) {
  try {
    const { id } = req.params;
    const { status, result } = req.body;

    const result_str = result ? JSON.stringify(result) : null;
    const completed_at =
      status === "done" || status === "failed"
        ? new Date().toISOString()
        : null;

    const info = db
      .prepare(
        "UPDATE tasks SET status = ?, result = ?, completed_at = ? WHERE id = ?",
      )
      .run(status, result_str, completed_at, id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ message: "Task updated" });
  } catch (error) {
    next(error);
  }
}

function deleteTask(req, res, next) {
  try {
    const { id } = req.params;

    const info = db.prepare("DELETE FROM tasks WHERE id = ?").run(id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ message: "Task deleted" });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllTasks, addTask, updateTask, deleteTask };
