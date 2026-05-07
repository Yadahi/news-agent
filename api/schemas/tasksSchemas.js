const z = require("zod");

const createTaskSchema = z.object({
  type: z.enum(["write_article"]),
  input: z.object({
    topic: z.string().trim().min(10, "Topic must be at least 10 characters"),
    sources: z.array(z.string().url()).optional(),
  }),
  research_first: z.boolean().optional(),
  edit_before_publish: z.boolean().optional(),
});

const updateTaskSchema = z.object({
  status: z.enum(["pending", "cancelled"]).optional(),
  input: z.object({ topic: z.string().min(1) }).optional(),
});

module.exports = { createTaskSchema, updateTaskSchema };
