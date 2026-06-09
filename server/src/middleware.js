const { getDb } = require('./db');

function authMiddleware(req, res, next) {
  const token = req.headers['x-session-token'];

  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }

  if (!global.sessions || !global.sessions[token]) {
    return res.status(401).json({ error: '会话已过期，请重新登录' });
  }

  req.currentUser = global.sessions[token];
  next();
}

module.exports = { authMiddleware };
