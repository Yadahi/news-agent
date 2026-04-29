const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");

const authMiddleware = (req, res, next) => {
  const authToken =
    req.headers.authorization && req.headers.authorization.split(" ")?.[1];

  if (!authToken) {
    next(new AppError("Token missing", 401));
    return;
  }

  try {
    const decoded = jwt.verify(authToken, process.env.SECRET_KEY);
    next();
  } catch (error) {
    next(new AppError("Not authorized", 401));
  }
};

module.exports = { authMiddleware };
