/**
 * 公网隧道管理器
 * 使用 localtunnel 创建公网 URL，让 PC 和手机在任何网络下都能同步
 * 尽量使用固定子域名，重启后地址不变
 */

let tunnel = null;
let publicUrl = null;

function getPersistentSubdomain() {
  const fs = require('fs');
  const path = require('path');
  const crypto = require('crypto');
  const configFile = path.join(__dirname, '..', 'data', 'tunnel-config.json');

  try {
    // 读取之前保存的子域名
    const saved = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    if (saved.subdomain) return saved.subdomain;
  } catch {}

  // 生成新的固定子域名
  const os = require('os');
  const hash = crypto.createHash('md5').update(os.hostname() + '-warehouse').digest('hex').substring(0, 8);
  const subdomain = 'wh-sync-' + hash;

  // 保存配置
  try {
    fs.writeFileSync(configFile, JSON.stringify({ subdomain }));
  } catch {}

  return subdomain;
}

async function startTunnel(port) {
  try {
    const localtunnel = require('localtunnel');
    const subdomain = getPersistentSubdomain();

    tunnel = await localtunnel({
      port,
      subdomain
    });
    publicUrl = tunnel.url;
    console.log(`\n========================================`);
    console.log(`  🌐 公网访问地址: ${publicUrl}`);
    console.log(`  手机端在「设置 → 服务器地址」中填入此地址`);
    console.log(`  (此地址重启后保持不变)`);
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
