import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { api } from '../api';
import LogViewer from '../components/LogViewer';
import { ConfirmModal } from '../components/CustomModal';

export default function AdminPanel() {
  const { user, showToast } = useApp();
  const [isVerified, setIsVerified] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);

  // 用户管理 state
  const [users, setUsers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  // 管理员账户 state
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 日志 tab
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'account' | 'logs'

  // 检查是否已有管理员 token
  useEffect(() => {
    const token = sessionStorage.getItem('adminToken');
    if (token) setIsVerified(true);
  }, []);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!adminPassword) return;
    setVerifyLoading(true);
    try {
      const result = await api.adminVerify(adminPassword);
      sessionStorage.setItem('adminToken', result.adminToken);
      setIsVerified(true);
      showToast('管理员验证成功', 'success');
    } catch (e) {
      showToast('验证失败: ' + e.message, 'error');
    } finally {
      setVerifyLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (e) {
      showToast('加载用户失败', 'error');
    }
  };

  useEffect(() => {
    if (isVerified) loadUsers();
  }, [isVerified]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    try {
      await api.createUser(newUsername.trim());
      showToast(`用户「${newUsername.trim()}」已创建`, 'success');
      setNewUsername('');
      loadUsers();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteUser(deleteTarget);
      showToast(`用户「${deleteTarget}」已删除`, 'success');
      loadUsers();
    } catch (e) {
      showToast(e.message, 'error');
    }
    setDeleteTarget(null);
  };

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    if (!newAdminUsername.trim()) return;
    try {
      await api.updateAdminAccount(newAdminUsername.trim());
      showToast(`管理员用户名已更改为「${newAdminUsername.trim()}」`, 'success');
      setNewAdminUsername('');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      showToast('两次输入的新密码不一致', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('新密码至少需要6位', 'error');
      return;
    }
    try {
      await api.updateAdminPassword(oldPassword, newPassword);
      showToast('密码修改成功', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // 未验证
  if (!isVerified) {
    return (
      <div style={{ maxWidth: 400, margin: '60px auto' }}>
        <div className="form-card">
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🔐</div>
            <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>管理员验证</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: 4 }}>
              请输入管理员密码以访问管理面板
            </p>
          </div>
          <form onSubmit={handleVerify}>
            <div className="input-group">
              <label className="input-label">管理员密码</label>
              <input
                className="input-field"
                type="password"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                placeholder="输入管理员密码"
                autoFocus
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={verifyLoading}>
              {verifyLoading ? '验证中...' : '验证'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 已验证
  return (
    <div>
      {/* Tab 切换 */}
      <div className="mode-switch" style={{ marginBottom: 20 }}>
        {[
          { id: 'users', label: '👥 用户管理' },
          { id: 'account', label: '🔑 管理账户' },
          { id: 'logs', label: '📋 操作日志' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`mode-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <>
          {/* 新增用户 */}
          <div className="admin-section">
            <h3 className="admin-section-title">👤 新增用户</h3>
            <form onSubmit={handleCreateUser} style={{ display: 'flex', gap: 10 }}>
              <input
                className="input-field"
                style={{ flex: 1 }}
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                placeholder="输入新用户名"
                required
              />
              <button type="submit" className="btn btn-primary">创建</button>
            </form>
          </div>

          {/* 用户列表 */}
          <div className="admin-section">
            <h3 className="admin-section-title">📋 用户列表 ({users.length})</h3>
            {users.map(u => (
              <div key={u.username} className="user-list-item">
                <div className="user-list-info">
                  <div className="user-avatar">{u.username[0]}</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{u.username}</div>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
                      {u.is_admin ? '管理员' : '普通用户'}
                    </div>
                  </div>
                </div>
                {!u.is_admin && (
                  <button
                    className="btn btn-sm btn-outline"
                    style={{ color: 'var(--danger)' }}
                    onClick={() => setDeleteTarget(u.username)}
                  >
                    🗑 删除
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'account' && (
        <>
          {/* 修改管理员用户名 */}
          <div className="admin-section">
            <h3 className="admin-section-title">✏️ 修改管理员用户名</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: 12 }}>
              当前用户名: <strong>{user?.username}</strong>
            </p>
            <form onSubmit={handleUpdateAccount} style={{ display: 'flex', gap: 10 }}>
              <input
                className="input-field"
                style={{ flex: 1 }}
                value={newAdminUsername}
                onChange={e => setNewAdminUsername(e.target.value)}
                placeholder="输入新的管理员用户名"
                required
              />
              <button type="submit" className="btn btn-primary">修改</button>
            </form>
          </div>

          {/* 修改管理员密码 */}
          <div className="admin-section">
            <h3 className="admin-section-title">🔒 修改管理员密码</h3>
            <form onSubmit={handleUpdatePassword}>
              <div className="input-group">
                <label className="input-label">旧密码</label>
                <input
                  className="input-field"
                  type="password"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="输入旧密码"
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">新密码</label>
                <input
                  className="input-field"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="输入新密码（至少6位）"
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">确认新密码</label>
                <input
                  className="input-field"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="再次输入新密码"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">修改密码</button>
            </form>
          </div>
        </>
      )}

      {activeTab === 'logs' && <LogViewer />}

      {/* 删除用户确认弹窗 */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteUser}
        title="确认删除用户"
        message={`确定要删除用户「${deleteTarget}」吗？`}
        confirmText="确认删除"
        danger
      />
    </div>
  );
}
