const AppError = require("../utils/AppError");

const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      const messages = error.issues.map((e) => e.message).join(", ");
      const err = new AppError(messages, 400);
      next(err);
    }
  };
};

module.exports = { validate };
