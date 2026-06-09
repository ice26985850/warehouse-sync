const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data', 'warehouse.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
    seedAdmin();
  }
  return db;
}

function initTables() {
  db.exec(`
    -- 用户表
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      is_admin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- 管理员凭据表
    CREATE TABLE IF NOT EXISTS admin_credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );

    -- 仓库表
    CREATE TABLE IF NOT EXISTS warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE(name)
    );

    -- 物品表
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      quantity REAL DEFAULT 0,
      size TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
    );

    -- 变更日志表
    CREATE TABLE IF NOT EXISTS change_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      action_type TEXT NOT NULL,
      item_id INTEGER,
      item_name TEXT,
      field_name TEXT,
      old_value TEXT,
      new_value TEXT,
      delta REAL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      rolled_back INTEGER DEFAULT 0,
      rollback_log_id INTEGER,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
    );

    -- 同步操作队列表 (用于实时同步)
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);
}

function seedAdmin() {
  const existing = db.prepare('SELECT id FROM admin_credentials WHERE username = ?').get('SCPO5');
  if (!existing) {
    const hash = bcrypt.hashSync('QWERsam001', 10);
    db.prepare('INSERT INTO admin_credentials (username, password_hash) VALUES (?, ?)').run('SCPO5', hash);
  }

  // 确保管理员用户在 users 表中存在
  const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('SCPO5');
  if (!adminUser) {
    db.prepare('INSERT INTO users (username, is_admin) VALUES (?, 1)').run('SCPO5');
  }

  // 确保有一个默认演示用户
  const demoUser = db.prepare('SELECT id FROM users WHERE username = ?').get('演示用户');
  if (!demoUser) {
    db.prepare('INSERT INTO users (username, is_admin) VALUES (?, 0)').run('演示用户');
  }
}

module.exports = { getDb };
