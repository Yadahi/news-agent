const z = require("zod");

const authSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

module.exports = { authSchema };
