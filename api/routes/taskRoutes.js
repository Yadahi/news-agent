const express = require("express");
const router = express.Router();
const {
  getAllTasks,
  addTask,
  updateTask,
  deleteTask,
  runAgents,
} = require("../controllers/taskController");
const { validate } = require("../middleware/validate");
const {
  createTaskSchema,
  updateTaskSchema,
} = require("../schemas/tasksSchemas");

router.get("/tasks", getAllTasks);
router.post("/tasks", validate(createTaskSchema), addTask);
router.put("/tasks/:id", validate(updateTaskSchema), updateTask);
router.delete("/tasks/:id", deleteTask);
router.post("/run", runAgents);

module.exports = router;
