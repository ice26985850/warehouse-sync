import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { api } from '../api';

export default function Login() {
  const { login, showToast } = useApp();
  const [users, setUsers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await api.getInitData();
        setUsers(data.users || []);
        setWarehouses(data.warehouses || []);
      } catch (e) { /* 忽略 */ }
    };
    loadData();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!selectedUser) {
      showToast('请选择用户', 'error');
      return;
    }
    setLoading(true);
    try {
      await login(selectedUser, selectedWarehouse);
      showToast(`欢迎，${selectedUser}！`, 'success');
    } catch (e) {
      showToast('登录失败: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">📦</div>
          <h1>多仓库同步管理系统</h1>
          <p>选择用户和仓库，免密快速登录</p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label">👤 用户名称</label>
            <select
              className="input-field"
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              required
            >
              <option value="">-- 请选择用户 --</option>
              {users.map(u => (
                <option key={u.username} value={u.username}>
                  {u.username}{u.is_admin ? ' (管理员)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">🏭 目标仓库</label>
            <select
              className="input-field"
              value={selectedWarehouse}
              onChange={e => setSelectedWarehouse(e.target.value)}
            >
              <option value="">-- 暂不选择 --</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? '登录中...' : '🚀 登录'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
          管理员初始账号: SCPO5 | 免密登录，管理功能需额外验证
        </p>
      </div>
    </div>
  );
}
