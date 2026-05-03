const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const db = require("../db");
const AppError = require("../utils/AppError");

function register(req, res, next) {
  try {
    const { username, password } = req.body;
    const id = crypto.randomUUID();

    const hashedPassword = bcrypt.hashSync(password, 10);

    const stmt = db
      .prepare("INSERT INTO users (id, username, password) VALUES (?, ?, ?)")
      .run(id, username, hashedPassword);

    res.status(201).json({ message: "User registered" });
  } catch (error) {
    if (error.message.includes("UNIQUE constraint failed")) {
      next(new AppError("User exist", 409));
      return;
    }
    next(error);
  }
}

function login(req, res, next) {
  try {
    const { username, password } = req.body;

    const stmt = db.prepare("SELECT * FROM users WHERE username=?");
    const result = stmt.get(username);

    const hashedPassword = result?.password;

    if (result) {
      const passwordMatch = bcrypt.compareSync(password, hashedPassword);
      if (!passwordMatch) {
        throw new AppError("Invalid credentials", 401);
      }

      const token = jwt.sign(
        { id: result.id, username: result.username },
        process.env.SECRET_KEY,
        {
          expiresIn: "1h",
        },
      );

      res.status(200).json({ message: "User logged in", token });
    } else {
      throw new AppError("Invalid credentials", 401);
    }
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login };
