const db = require("../db");

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

module.exports = { getArticles };
