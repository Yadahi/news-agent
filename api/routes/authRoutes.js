const express = require("express");
const { authSchema } = require("../schemas/authSchema");
const { validate } = require("../middleware/validate");
const { register, login } = require("../controllers/authController");
const router = express.Router();

router.post("/register", validate(authSchema), register);
router.post("/login", validate(authSchema), login);

module.exports = router;
