const z = require("zod");

const createTaskSchema = z.object({
  type: z.enum(["write_article"]),
  input: z.object({ topic: z.string().min(1) }),
});

const updateTaskSchema = z.object({
  status: z.enum(["pending", "cancelled"]),
});

module.exports = { createTaskSchema, updateTaskSchema };
