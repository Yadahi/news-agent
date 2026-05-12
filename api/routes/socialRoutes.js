const express = require("express");
const router = express.Router();
const {
  getArticles,
  getArticle,
  addArticle,
} = require("../controllers/socialController");

router.get("/articles", getArticles);
router.get("/articles/:articleTaskId", getArticle);
router.post("/articles/:articleTaskId/posts", addPost);

module.exports = router;
