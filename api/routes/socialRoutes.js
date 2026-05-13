const express = require("express");
const router = express.Router();
const {
  getArticles,
  getArticle,
  addPost,
} = require("../controllers/socialController");
const { validate } = require("../middleware/validate");
const { createPostSchema } = require("../schemas/socialSchema");

router.get("/articles", getArticles);
router.get("/articles/:articleTaskId", getArticle);
router.post(
  "/articles/:articleTaskId/posts",
  validate(createPostSchema),
  addPost,
);

module.exports = router;
