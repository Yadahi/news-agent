const express = require("express");
const cors = require("cors");
const app = express();
const taskRoutes = require("./routes/taskRoutes");
const authRoutes = require("./routes/authRoutes");
const socialRoutes = require("./routes/socialRoutes");
const { authMiddleware } = require("./middleware/auth");

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/api", authMiddleware, taskRoutes);
app.use("/api", authMiddleware, socialRoutes);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : "Something went wrong";
  res.status(statusCode).json({ message: message });
});

module.exports = app;
