const { randomUUID } = require("crypto");
const db = require("../db");
const AppError = require("../utils/AppError");

function getArticles(req, res, next) {
  try {
    const { order, page, limit } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const sortField = "created_at";
    const sortOrder = order === "desc" ? "DESC" : "ASC";
    const values = [req.user.id];

    let sql = `
        SELECT * FROM tasks t
        WHERE t.status = 'done'
        AND t.type IN ('write_article', 'edit_article')
        AND t.user_id = ?
        AND NOT EXISTS (
            SELECT 1 FROM tasks child
            WHERE child.depends_on = t.id
            AND child.status = 'done'
        )
    `;

    let countSql = `
        SELECT COUNT(*) as count FROM tasks t
        WHERE t.status = 'done'
        AND t.type IN ('write_article', 'edit_article')
        AND t.user_id = ?
        AND NOT EXISTS (
            SELECT 1 FROM tasks child
            WHERE child.depends_on = t.id
            AND child.status = 'done'
        )
    `;
    const total = db.prepare(countSql).get(req.user.id).count;

    sql += ` ORDER BY ${sortField} ${sortOrder}`;

    if (limit && page) {
      const offset = (pageNum - 1) * limitNum;
      values.push(limitNum);
      values.push(offset);
      sql += " LIMIT ? OFFSET ? ";
    }

    const articles = db.prepare(sql).all(...values);

    res.json({
      data: articles,
      total,
      page: pageNum,
      limit: limitNum,
      totalPage: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
}

function getArticle(req, res, next) {
  try {
    const { articleTaskId } = req.params;

    const article = db
      .prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?")
      .get(articleTaskId, req.user.id);

    if (!article) {
      return next(new AppError("Article not found", 404));
    }

    res.json(article);
  } catch (error) {
    next(error);
  }
}

function addPost(req, res, next) {
  try {
    const { platform, post_text, hashtags, tone, length } = req.body;
    const { articleTaskId } = req.params;

    const created_at = new Date().toISOString();

    let postId = randomUUID();

    const post = db
      .prepare(
        "INSERT INTO social_posts (id, article_task_id, platform, post_text, hashtags, image_url, article_url, status, tone, length, created_at, platform_post_id) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)",
      )
      .run(
        postId,
        articleTaskId,
        platform,
        post_text,
        hashtags,
        null,
        null,
        tone,
        length,
        created_at,
        null,
      );

    res.status(201).json({
      id: postId,
      article_task_id: articleTaskId,
      platform,
      post_text,
      hashtags,
      image_url: null,
      article_url: null,
      status: "draft",
      tone,
      length,
      created_at,
      posted_at: null,
      platform_post_id: null,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getArticles, getArticle, addPost };
