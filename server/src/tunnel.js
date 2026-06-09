/**
 * 公网隧道管理器
 * 使用 localtunnel 创建公网 URL，让 PC 和手机在任何网络下都能同步
 */

let tunnel = null;
let publicUrl = null;

async function startTunnel(port) {
  try {
    const localtunnel = require('localtunnel');
    tunnel = await localtunnel({
      port,
      subdomain: 'warehouse-sync-' + Math.random().toString(36).substring(2, 8)
    });
    publicUrl = tunnel.url;
    console.log(`\n========================================`);
    console.log(`  🌐 公网访问地址: ${publicUrl}`);
    console.log(`  手机端在「设置 → 服务器地址」中填入此地址`);
    console.log(`========================================\n`);

    tunnel.on('close', () => {
      console.log('公网隧道已关闭');
      publicUrl = null;
    });

    tunnel.on('error', (err) => {
      console.error('公网隧道错误:', err.message);
      publicUrl = null;
    });

    return publicUrl;
  } catch (err) {
    console.error('启动公网隧道失败:', err.message);
    console.log('将仅在本机提供服务。PC 和手机需在同一局域网。');
    return null;
  }
}

function getPublicUrl() {
  return publicUrl;
}

async function stopTunnel() {
  if (tunnel) {
    tunnel.close();
    tunnel = null;
    publicUrl = null;
  }
}

module.exports = { startTunnel, stopTunnel, getPublicUrl };
