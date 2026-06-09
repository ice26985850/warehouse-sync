import React from 'react';
import { useApp } from '../contexts/AppContext';
import { ConfirmModal } from '../components/CustomModal';

export default function Settings() {
  const { theme, setTheme, fontSize, setFontSize, logout, showToast } = useApp();
  const [logoutConfirm, setLogoutConfirm] = React.useState(false);
  const [serverUrl, setServerUrl] = React.useState(() => localStorage.getItem('serverUrl') || '');

  const handleSaveServer = () => {
    const url = serverUrl.trim();
    if (url) {
      localStorage.setItem('serverUrl', url);
      showToast('服务器地址已保存，刷新后生效', 'success');
    } else {
      localStorage.removeItem('serverUrl');
      showToast('已恢复为本地连接', 'info');
    }
  };

  const handleLogout = () => {
    logout();
    showToast('已安全退出', 'info');
    setLogoutConfirm(false);
  };

  return (
    <div>
      {/* 服务器地址（移动端使用） */}
      <div className="settings-section">
        <h3 className="settings-title">🔗 服务器地址</h3>
        <div className="setting-row">
          <div>
            <div className="setting-label">远程服务器地址</div>
            <div className="setting-desc">
              手机端使用时填写 PC 的 IP 地址<br />
              例如: http://192.168.1.100:3001
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <input
            className="input-field"
            value={serverUrl}
            onChange={e => setServerUrl(e.target.value)}
            placeholder="留空则使用本机 (默认)"
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary btn-sm" onClick={handleSaveServer}>
            保存
          </button>
        </div>
      </div>

      {/* 外观设置 */}
      <div className="settings-section">
        <h3 className="settings-title">🌓 外观模式</h3>
        <div className="theme-toggle">
          <button
            className={`theme-option ${theme === 'light' ? 'active' : ''}`}
            onClick={() => setTheme('light')}
          >
            ☀️ 白天模式
          </button>
          <button
            className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => setTheme('dark')}
          >
            🌙 黑夜模式
          </button>
        </div>
      </div>

      {/* 字体大小 */}
      <div className="settings-section">
        <h3 className="settings-title">🔤 字体大小</h3>
        <div className="setting-row">
          <div>
            <div className="setting-label">当前: {
              fontSize === 'small' ? '小' : fontSize === 'medium' ? '中' : '大'
            }</div>
            <div className="setting-desc">调整界面字体大小</div>
          </div>
          <div className="font-size-slider">
            <span style={{ fontSize: '12px' }}>A</span>
            <input
              type="range"
              min="0"
              max="2"
              value={fontSize === 'small' ? 0 : fontSize === 'medium' ? 1 : 2}
              onChange={e => {
                const vals = ['small', 'medium', 'large'];
                setFontSize(vals[parseInt(e.target.value)]);
              }}
            />
            <span style={{ fontSize: '20px' }}>A</span>
          </div>
        </div>
      </div>

      {/* 退出登录 */}
      <div className="settings-section">
        <h3 className="settings-title">🚪 账户操作</h3>
        <button className="btn btn-danger" onClick={() => setLogoutConfirm(true)}>
          退出登录
        </button>
      </div>

      <ConfirmModal
        isOpen={logoutConfirm}
        onClose={() => setLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="确认退出"
        message="确定要退出当前登录吗？"
        confirmText="确认退出"
        danger
      />
    </div>
  );
}
