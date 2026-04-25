const express = require("express");
const app = express();
const taskRoutes = require("./routes/taskRoutes");

app.use(express.json());

app.use("/api", taskRoutes);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : "Something went wrong";
  res.status(statusCode).json({ error: message });
});

module.exports = app;
