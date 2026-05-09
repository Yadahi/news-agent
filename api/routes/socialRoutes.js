const express = require("express");
const router = express.Router();
const { getArticles, getArticle } = require("../controllers/socialController");

router.get("/articles", getArticles);
router.get("/articles/:articleTaskId", getArticle);

module.exports = router;
