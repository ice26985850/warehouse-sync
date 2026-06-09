const WebSocket = require('ws');

let wss = null;
let clients = new Map(); // ws -> { username, warehouseId }

function initSync(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('新客户端连接');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'REGISTER') {
          const token = data.token;
          const session = global.sessions && global.sessions[token];
          clients.set(ws, {
            username: session ? session.username : 'unknown',
            warehouseId: data.warehouseId
          });
          console.log(`客户端注册: ${session ? session.username : 'unknown'} @ 仓库${data.warehouseId}`);
        }
      } catch (e) {
        console.error('WebSocket消息解析失败:', e);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log('客户端断开连接');
    });

    ws.on('error', (err) => {
      console.error('WebSocket错误:', err);
      clients.delete(ws);
    });
  });

  console.log('WebSocket同步服务已启动');
}

function broadcastSync(data) {
  if (!wss) return;

  // 广播给所有连接的客户端
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// 向特定仓库的客户端广播
function broadcastToWarehouse(warehouseId, data) {
  if (!wss) return;

  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const clientData = clients.get(client);
      if (clientData && clientData.warehouseId === warehouseId) {
        client.send(message);
      }
    }
  });
}

module.exports = { initSync, broadcastSync, broadcastToWarehouse };
