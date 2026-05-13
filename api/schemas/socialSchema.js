const z = require("zod");

const createPostSchema = z.object({
  platform: z.enum(["twitter", "instagram", "facebook", "telegram"]),
  post_text: z.string().min(1),
  hashtags: z.string().optional(),
  tone: z.enum(["neutral", "punchy", "curious", "formal"]),
  length: z.enum(["short", "medium", "long"]),
});

module.exports = { createPostSchema };
