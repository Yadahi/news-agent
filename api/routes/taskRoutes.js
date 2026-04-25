const express = require("express");
const router = express.Router();
const { getAllTasks } = require("../controllers/taskController");

router.get("/tasks", getAllTasks);
router.post();
router.put();
router.delete();

module.exports = router;
