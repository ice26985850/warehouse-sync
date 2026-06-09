const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { verifyAdminToken } = require('./auth');

const router = express.Router();

// 新增用户
router.post('/users', verifyAdminToken, (req, res) => {
  const { username } = req.body;
  if (!username || !username.trim()) return res.status(400).json({ error: '用户名不能为空' });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) return res.status(400).json({ error: '用户名已存在' });

  db.prepare('INSERT INTO users (username, is_admin) VALUES (?, 0)').run(username.trim());
  res.json({ success: true, message: `用户「${username.trim()}」已创建` });
});

// 删除用户（不能删除管理员自己）
router.delete('/users/:username', verifyAdminToken, (req, res) => {
  const { username } = req.params;

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(400).json({ error: '用户不存在' });

  if (user.is_admin) {
    // 检查是否是最后一个管理员
    const adminCount = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE is_admin = 1').get();
    if (adminCount.cnt <= 1) return res.status(400).json({ error: '不能删除唯一的管理员账户' });
  }

  db.prepare('DELETE FROM users WHERE username = ?').run(username);
  res.json({ success: true, message: `用户「${username}」已删除` });
});

// 修改管理员账户名
router.put('/admin-account', verifyAdminToken, (req, res) => {
  const { newUsername } = req.body;
  if (!newUsername || !newUsername.trim()) return res.status(400).json({ error: '新用户名不能为空' });

  const db = getDb();

  // 获取当前管理员
  const oldAdmin = db.prepare('SELECT * FROM admin_credentials LIMIT 1').get();
  if (!oldAdmin) return res.status(400).json({ error: '管理员凭据不存在' });

  // 更新 admin_credentials
  db.prepare('UPDATE admin_credentials SET username = ? WHERE id = ?').run(newUsername.trim(), oldAdmin.id);

  // 更新 users 表
  db.prepare('UPDATE users SET username = ? WHERE username = ?').run(newUsername.trim(), oldAdmin.username);

  // 更新日志中的用户名
  db.prepare('UPDATE change_logs SET username = ? WHERE username = ?').run(newUsername.trim(), oldAdmin.username);

  res.json({ success: true, message: `管理员用户名已更改为「${newUsername.trim()}」` });
});

// 修改管理员密码
router.put('/admin-password', verifyAdminToken, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: '请提供旧密码和新密码' });

  if (newPassword.length < 6) return res.status(400).json({ error: '新密码至少需要6位' });

  const db = getDb();
  const admin = db.prepare('SELECT * FROM admin_credentials LIMIT 1').get();
  if (!admin) return res.status(400).json({ error: '管理员凭据不存在' });

  if (!bcrypt.compareSync(oldPassword, admin.password_hash)) {
    return res.status(400).json({ error: '旧密码不正确' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE admin_credentials SET password_hash = ? WHERE id = ?').run(newHash, admin.id);

  res.json({ success: true, message: '密码修改成功' });
});

module.exports = router;
