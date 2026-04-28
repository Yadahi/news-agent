const AppError = require("../utils/AppError");

const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      const err = new AppError(error.message, 400);
      next(err);
    }
  };
};

module.exports = { validate };
