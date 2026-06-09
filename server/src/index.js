const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');

const { getDb } = require('./db');
const { initSync } = require('./sync');
const { startTunnel } = require('./tunnel');
const { router: authRouter } = require('./routes/auth');
const warehousesRouter = require('./routes/warehouses');
const itemsRouter = require('./routes/items');
const logsRouter = require('./routes/logs');
const adminRouter = require('./routes/admin');

const app = express();
const server = http.createServer(app);

// 中间件
app.use(cors());
app.use(express.json());

// 初始化数据库
getDb();

// API 路由
app.use('/api/auth', authRouter);
app.use('/api/warehouses', warehousesRouter);
app.use('/api/items', itemsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/admin', adminRouter);

// 公网隧道 URL
app.get('/api/tunnel', (req, res) => {
  const fs = require('fs');
  const tunnelFile = path.join(__dirname, '..', 'data', 'tunnel-url.txt');
  try {
    const url = fs.readFileSync(tunnelFile, 'utf-8');
    res.json({ url, connected: true });
  } catch {
    res.json({ url: null, connected: false });
  }
});

// 静态文件（前端构建产物）
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDist, 'index.html'));
  }
});

// 初始化 WebSocket 同步
initSync(server);

const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  console.log(`========================================`);
  console.log(`  多倉庫即時同步管理系統 服務已啟動`);
  console.log(`  本地地址: http://localhost:${PORT}`);
  console.log(`========================================`);
  console.log(`  管理员账号: SCPO5`);
  console.log(`  管理员密码: QWERsam001`);
  console.log(`  演示用户: 演示用户 (免密登录)`);
  console.log(`========================================`);

  // 启动公网隧道（仅本地环境，云端部署不需要）
  const isCloud = process.env.RENDER || process.env.RAILWAY_ENVIRONMENT || process.env.FLY_APP_NAME;
  if (!isCloud) {
    const tunnelUrl = await startTunnel(PORT);
    if (tunnelUrl) {
      const fs = require('fs');
      const tunnelFile = path.join(__dirname, '..', 'data', 'tunnel-url.txt');
      fs.writeFileSync(tunnelFile, tunnelUrl);
    }
  } else {
    console.log(`  云端环境，已跳过本地隧道`);
    console.log(`  公网访问地址由平台自动分配`);
  }
});
