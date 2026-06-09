const { app, BrowserWindow, Tray, Menu, nativeImage, clipboard, dialog } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let serverProcess = null;
let tray = null;

const SERVER_PORT = 3001;
const isPackaged = app.isPackaged;

function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = isPackaged
      ? path.join(process.resourcesPath, 'server', 'src', 'index.js')
      : path.join(__dirname, '..', 'server', 'src', 'index.js');

    console.log('Starting server from:', serverPath);

    // 在打包模式下，需要确保 server 能找到它的 node_modules
    const serverEnv = {
      ...process.env,
      PORT: String(SERVER_PORT)
    };

    // 打包模式下，server 的 node_modules 在 resourcesPath 中
    if (isPackaged) {
      serverEnv.NODE_PATH = path.join(process.resourcesPath, 'server', 'node_modules');
    }

    serverProcess = fork(serverPath, [], {
      env: serverEnv,
      silent: true,
      cwd: isPackaged ? path.join(process.resourcesPath, 'server') : path.join(__dirname, '..', 'server')
    });

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      console.log('[Server]', msg);
      if (msg.includes('服务已启动') || msg.includes('3001')) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('[Server Error]', data.toString());
    });

    serverProcess.on('error', reject);
    serverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`Server exited with code ${code}`);
      }
    });

    // Timeout fallback
    setTimeout(() => resolve(), 3000);
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 400,
    minHeight: 600,
    title: '多仓库同步管理系统',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true
  });

  // 隐藏菜单栏
  Menu.setApplicationMenu(null);

  mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);

  // 页面加载完成后，检查公网隧道 URL 并通知前端
  mainWindow.webContents.on('did-finish-load', () => {
    setTimeout(() => checkTunnelUrl(), 5000); // 延迟5秒等待隧道建立
  });

  // 关闭窗口时最小化到托盘
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function checkTunnelUrl() {
  const tunnelUrl = getTunnelUrl();
  if (tunnelUrl && mainWindow) {
    mainWindow.webContents.executeJavaScript(`
      window.__tunnelUrl = "${tunnelUrl}";
      // 显示一个通知条
      var bar = document.createElement('div');
      bar.id = 'tunnel-bar';
      bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#1a73e8;color:white;padding:10px 16px;text-align:center;z-index:9999;font-size:14px;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;';
      bar.innerHTML = '<span>🌐 公网访问地址: <b>' + window.__tunnelUrl + '</b></span><button onclick="navigator.clipboard.writeText(\\'' + window.__tunnelUrl + '\\');this.textContent=\\'已复制!\\';setTimeout(()=>this.textContent=\\'复制\\',2000)" style="background:white;color:#1a73e8;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;font-weight:600;">复制</button><span style="font-size:12px;opacity:0.8">手机端在「设置→服务器地址」填入此链接</span>';
      document.body.appendChild(bar);
    `).catch(() => {});
  }
}

function createTray() {
  // 尝试使用系统图标
  try {
    const iconPath = path.join(__dirname, 'icon.png');
    tray = new Tray(iconPath);
  } catch {
    // 使用原生空图标
    tray = new Tray(nativeImage.createEmpty());
  }

  const updateTrayMenu = () => {
    const tunnelUrl = getTunnelUrl();
    const menuTemplate = [
      {
        label: '显示主窗口',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
    ];

    if (tunnelUrl) {
      menuTemplate.push(
        { type: 'separator' },
        {
          label: `🌐 公网地址: ${tunnelUrl}`,
          enabled: false
        },
        {
          label: '📋 复制公网地址',
          click: () => {
            clipboard.writeText(tunnelUrl);
            if (mainWindow) {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: '已复制',
                message: `公网地址已复制到剪贴板:\n${tunnelUrl}\n\n手机端在「设置→服务器地址」中填入此链接即可连接。`
              });
            }
          }
        }
      );
    }

    menuTemplate.push(
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          app.isQuitting = true;
          if (mainWindow) mainWindow.destroy();
          if (serverProcess) serverProcess.kill();
          app.quit();
        }
      }
    );

    const contextMenu = Menu.buildFromTemplate(menuTemplate);
    tray.setContextMenu(contextMenu);
  };

  updateTrayMenu();
  tray.setToolTip('多仓库同步管理系统');

  // 定期刷新菜单（检测隧道状态）
  setInterval(updateTrayMenu, 10000);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function getTunnelUrl() {
  const tunnelFile = isPackaged
    ? path.join(process.resourcesPath, 'server', 'data', 'tunnel-url.txt')
    : path.join(__dirname, '..', 'server', 'data', 'tunnel-url.txt');
  try {
    return fs.readFileSync(tunnelFile, 'utf-8').trim();
  } catch {
    return null;
  }
}

app.whenReady().then(async () => {
  console.log('正在启动服务...');
  await startServer();
  console.log('服务已就绪');

  await createWindow();
  createTray();

  app.on('activate', () => {
    if (mainWindow === null) createWindow();
    else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('window-all-closed', () => {
  // 不退出，保持在托盘
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (serverProcess) {
    serverProcess.kill();
  }
});
