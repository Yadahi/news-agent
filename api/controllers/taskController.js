const crypto = require("crypto");
const db = require("../db");
const { spawn } = require("child_process");
const path = require("path");
const AppError = require("../utils/AppError");

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

    const conditions = ["user_id=?"];
    const values = [req.user.id];

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
    const { type, input, research_first, edit_before_publish } = req.body;
    const created_at = new Date().toISOString();

    // For write_article, build the chain based on flags
    const tasks = [];
    let researchId = null;
    let writeId = crypto.randomUUID();
    let editId = null;

    // Step 1: If research first, create research task
    if (research_first) {
      researchId = crypto.randomUUID();
      db.prepare(
        "INSERT INTO tasks (id, type, input, status, user_id, created_at) VALUES (?, ?, ?, 'pending', ?, ?)",
      ).run(
        researchId,
        "research_topic",
        JSON.stringify(input),
        req.user.id,
        created_at,
      );

      tasks.push({
        id: researchId,
        type: "research_topic",
        input,
        status: "pending",
        created_at,
      });
    }

    const writeInput = { topic: input.topic };
    if (!edit_before_publish) {
      writeInput.publish = true; // write is the last step
    }

    // Step 2: Always create write task, depends on research if it exists
    db.prepare(
      "INSERT INTO tasks (id, type, input, status, depends_on, user_id, created_at) VALUES (?, ?, ?, 'pending', ?, ?, ?)",
    ).run(
      writeId,
      "write_article",
      JSON.stringify(writeInput),
      researchId,
      req.user.id,
      created_at,
    );

    tasks.push({
      id: writeId,
      type: "write_article",
      input: { topic: input.topic },
      status: "pending",
      depends_on: researchId,
      created_at,
    });

    // Step 3: If edit before publish, create edit task depending on write
    if (edit_before_publish) {
      editId = crypto.randomUUID();
      const editInput = { topic: input.topic, publish: true }; // edit is the last step

      db.prepare(
        "INSERT INTO tasks (id, type, input, status, depends_on, user_id, created_at) VALUES (?, ?, ?, 'pending', ?, ?, ?)",
      ).run(
        editId,
        "edit_article",
        JSON.stringify(editInput),
        writeId,
        req.user.id,
        created_at,
      );

      tasks.push({
        id: editId,
        type: "edit_article",
        input: { topic: input.topic },
        status: "pending",
        depends_on: writeId,
        created_at,
      });
    }

    res.status(201).json(tasks);
  } catch (error) {
    next(error);
  }
}

function updateTask(req, res, next) {
  try {
    const { id } = req.params;
    const { status, input } = req.body;

    // Check task exists
    const task = db
      .prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?")
      .get(id, req.user.id);
    if (!task) {
      return next(new AppError("Task not found", 404));
    }

    if (input && (task.status === "running" || task.status === "done")) {
      return next(
        new AppError("Cannot edit a task that is running or completed", 400),
      );
    }

    let completed_at = null;
    if (status === "cancelled") {
      completed_at = new Date().toISOString();
    }

    const updates = [];
    const values = [];

    if (status) {
      updates.push("status = ?");
      values.push(status);
      updates.push("result = NULL");
      updates.push("completed_at = ?");
      values.push(completed_at);
    }

    if (input) {
      updates.push("input = ?");
      values.push(JSON.stringify(input));
    }

    values.push(id);
    values.push(req.user.id);
    db.prepare(
      `UPDATE tasks SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
    ).run(...values);

    res.json({ message: "Task updated" });
  } catch (error) {
    next(error);
  }
}

function deleteTask(req, res, next) {
  try {
    const { id } = req.params;

    const info = db
      .prepare("DELETE FROM tasks WHERE id = ?  AND user_id = ?")
      .run(id, req.user.id);

    if (info.changes === 0) {
      return next(new AppError("Task not found", 404));
    }

    res.json({ message: "Task deleted" });
  } catch (error) {
    next(error);
  }
}

function runAgents(req, res, next) {
  try {
    const runner = spawn(
      path.join(__dirname, "..", "..", "venv", "bin", "python3"),
      [path.join(__dirname, "..", "..", "agents", "agent_runner.py")],
      { cwd: path.join(__dirname, "..", "..") },
    );

    let output = "";
    let errorOutput = "";

    runner.stdout.on("data", (data) => {
      output += data.toString();
    });

    runner.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    runner.on("close", (code) => {
      if (code === 0) {
        res.json({ success: true, output });
      } else {
        res.status(500).json({ success: false, error: errorOutput || output });
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllTasks, addTask, updateTask, deleteTask, runAgents };
