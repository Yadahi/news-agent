const crypto = require("crypto");
const db = require("../db");

function getAllTasks(req, res, next) {
  try {
    const { type, status, sort, order, page, limit } = req.query;
    const allowedSortFields = ["type", "status", "created_at"];
    let sql = "SELECT * FROM tasks";
    let countSql = "SELECT COUNT(*) as count FROM tasks";
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const sortField = allowedSortFields.includes(sort) ? sort : "created_at";
    const sortOrder = order === "desc" ? "DESC" : "ASC";

    const conditions = [];
    const values = [];

    if (type) {
      conditions.push("type=?");
      values.push(type);
    }

    if (status) {
      conditions.push("status=?");
      values.push(status);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
      countSql += " WHERE " + conditions.join(" AND ");
    }

    const total = db.prepare(countSql).get(...values).count;

    // sorting
    sql += ` ORDER BY ${sortField} ${sortOrder}`;

    // pagination
    if (limit && page) {
      const offset = (pageNum - 1) * limitNum;
      values.push(limitNum);
      values.push(offset);
      sql += " LIMIT ? OFFSET ? ";
    }

    const tasks = db.prepare(sql).all(...values);

    res.json({
      data: tasks,
      total,
      page: pageNum,
      limit: limitNum,
      totalPage: Math.ceil(total / limitNum),
    });
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
