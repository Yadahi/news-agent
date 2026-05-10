const Database = require("better-sqlite3");
const path = require("path");
const dbFile =
  process.env.NODE_ENV === "test"
    ? path.join(__dirname, "..", "test.db")
    : path.join(__dirname, "..", "newsroom.db");
const db = new Database(dbFile);

db.exec(`CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            input TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            result TEXT,
            depends_on TEXT,
            user_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            completed_at TEXT)`);

db.exec(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
  )`);

db.exec(`CREATE TABLE IF NOT EXISTS social_posts (
            id TEXT PRIMARY KEY,
            article_task_id TEXT NOT NULL REFERENCES tasks(id),
            platform TEXT NOT NULL,
            post_text TEXT NOT NULL,
            hashtags TEXT,
            image_url TEXT,
            article_url TEXT,
            status TEXT NOT NULL DEFAULT 'draft',
            tone TEXT DEFAULT 'neutral',
            length TEXT DEFAULT 'medium',
            created_at TEXT NOT NULL,
            posted_at TEXT,
            platform_post_id TEXT
  )`);

module.exports = db;
