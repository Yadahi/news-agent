const db = require("../db");

function getAllTasks(req, res, next) {
  try {
    const tasks = db.prepare("SELECT * FROM tasks").all();
    res.json(tasks);
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllTasks };
