const express = require("express");
const router = express.Router();
const {
  getAllTasks,
  addTask,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");

router.get("/tasks", getAllTasks);
router.post("/tasks", addTask);
router.put("/tasks/:id", updateTask);
router.delete("/tasks/:id", deleteTask);

module.exports = router;
