const express = require("express");
const app = express();
const taskRoutes = require("./routes/taskRoutes");
const authRoutes = require("./routes/authRoutes");
const { authMiddleware } = require("./middleware/auth");

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/api", authMiddleware, taskRoutes);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : "Something went wrong";
  res.status(statusCode).json({ error: message });
});

module.exports = app;
