const express = require('express');
const { getDb } = require('../db');
const { authMiddleware } = require('../middleware');

const router = express.Router();

// 获取所有用户列表
router.get('/users', (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, username, is_admin FROM users ORDER BY username').all();
  res.json(users);
});

// 登录页初始化数据（用户列表 + 仓库列表，无需认证）
router.get('/init', (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, username, is_admin FROM users ORDER BY username').all();
  const warehouses = db.prepare('SELECT id, name FROM warehouses ORDER BY name').all();
  res.json({ users, warehouses });
});

// 内存会话存储
if (!global.sessions) global.sessions = {};

// 登录（免密）- 返回会话token
router.post('/login', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: '请提供用户名' });

  const db = getDb();
  let user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  // 创建会话token
  const token = require('crypto').randomBytes(24).toString('hex');
  global.sessions[token] = {
    id: user.id,
    username: user.username,
    is_admin: user.is_admin,
    createdAt: new Date().toISOString()
  };

  res.json({
    success: true,
    token,
    user: { id: user.id, username: user.username, is_admin: user.is_admin }
  });
});

// 登出
router.post('/logout', (req, res) => {
  const token = req.headers['x-session-token'];
  if (token && global.sessions[token]) {
    delete global.sessions[token];
  }
  res.json({ success: true });
});

// 管理员验证
router.post('/admin-verify', authMiddleware, (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: '请输入管理员密码' });

  const db = getDb();
  const admin = db.prepare('SELECT * FROM admin_credentials WHERE username = ?').get(req.currentUser.username);
  if (!admin) return res.status(403).json({ error: '非管理员账户' });

  const bcrypt = require('bcryptjs');
  const valid = bcrypt.compareSync(password, admin.password_hash);
  if (!valid) return res.status(403).json({ error: '密码错误' });

  // 返回一个临时token，有效期30分钟
  const token = require('crypto').randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  // 存储到内存
  if (!global.adminTokens) global.adminTokens = {};
  global.adminTokens[token] = {
    username: req.currentUser.username,
    expiresAt
  };

  res.json({ success: true, adminToken: token });
});

// 验证管理员token
function verifyAdminToken(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token) return res.status(401).json({ error: '需要管理员权限' });

  if (!global.adminTokens || !global.adminTokens[token]) {
    return res.status(401).json({ error: '管理员令牌无效' });
  }

  const tokenData = global.adminTokens[token];
  if (new Date(tokenData.expiresAt) < new Date()) {
    delete global.adminTokens[token];
    return res.status(401).json({ error: '管理员令牌已过期' });
  }

  next();
}

module.exports = { router, verifyAdminToken };
