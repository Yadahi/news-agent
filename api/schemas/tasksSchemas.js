const z = require("zod");

const createTaskSchema = z.object({
  type: z.enum(["write_article"]),
  input: z.object({ topic: z.string().trim().min(10, "Topic must be at least 10 characters") }),
});

const updateTaskSchema = z.object({
  status: z.enum(["pending", "cancelled"]),
});

module.exports = { createTaskSchema, updateTaskSchema };
