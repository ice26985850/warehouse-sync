import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useApp } from '../contexts/AppContext';
import { ConfirmModal } from './CustomModal';

export default function LogViewer() {
  const { warehouses, showToast } = useApp();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [rollbackTarget, setRollbackTarget] = useState(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterWarehouse) params.warehouse_id = filterWarehouse;
      if (filterUser) params.username = filterUser;
      params.limit = 200;
      const data = await api.getLogs(params);
      setLogs(data);
    } catch (e) {
      showToast('加载日志失败: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [filterWarehouse, filterUser, showToast]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleRollback = async () => {
    if (!rollbackTarget) return;
    try {
      const result = await api.rollbackLog(rollbackTarget.id);
      showToast(result.message || '回溯成功', 'success');
      await loadLogs();
    } catch (e) {
      showToast('回溯失败: ' + e.message, 'error');
    }
    setRollbackTarget(null);
  };

  const getActionBadge = (actionType) => {
    const map = {
      'ADD_ITEM': { label: '增加', className: 'badge-add' },
      'REDUCE_ITEM': { label: '减少', className: 'badge-reduce' },
      'UPDATE_ITEM': { label: '更新', className: 'badge-create' },
      'CREATE_ITEM': { label: '新建', className: 'badge-create' },
      'DELETE_ITEM': { label: '删除', className: 'badge-reduce' },
      'CREATE_WAREHOUSE': { label: '新建仓库', className: 'badge-create' },
      'DELETE_WAREHOUSE': { label: '删除仓库', className: 'badge-reduce' },
      'RENAME_WAREHOUSE': { label: '重命名', className: 'badge-add' },
      'ROLLBACK': { label: '回溯', className: 'badge-rollback' },
    };
    const m = map[actionType] || { label: actionType, className: 'badge-create' };
    return <span className={`badge ${m.className}`}>{m.label}</span>;
  };

  return (
    <div>
      {/* 筛选 */}
      <div className="form-card">
        <h3 className="form-card-title">📋 筛选日志</h3>
        <div className="form-row">
          <div className="input-group">
            <label className="input-label">按仓库筛选</label>
            <select className="input-field" value={filterWarehouse} onChange={e => setFilterWarehouse(e.target.value)}>
              <option value="">全部仓库</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">按用户筛选</label>
            <input className="input-field" value={filterUser} onChange={e => setFilterUser(e.target.value)} placeholder="输入用户名" />
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-outline btn-sm" onClick={loadLogs}>🔄 刷新</button>
        </div>
      </div>

      {/* 日志表格 */}
      {loading ? (
        <div className="empty-state">
          <p className="empty-state-text">加载中...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p className="empty-state-text">暂无日志记录</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="log-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>用户</th>
                <th>仓库</th>
                <th>操作</th>
                <th>物品</th>
                <th>字段</th>
                <th>旧值</th>
                <th>新值</th>
                <th>变更量</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={log.rolled_back ? { opacity: 0.5, textDecoration: 'line-through' } : {}}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 'var(--font-xs)' }}>{log.created_at}</td>
                  <td>{log.username}</td>
                  <td>{log.warehouse_name || '-'}</td>
                  <td>{getActionBadge(log.action_type)}</td>
                  <td>{log.item_name || '-'}</td>
                  <td>{log.field_name || '-'}</td>
                  <td style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.old_value || '-'}</td>
                  <td style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.new_value || '-'}</td>
                  <td>
                    {log.delta ? (
                      <span className={log.delta > 0 ? 'delta-positive' : 'delta-negative'}>
                        {log.delta > 0 ? '+' : ''}{log.delta}
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    {log.rolled_back ? (
                      <span className="badge badge-rollback">已回溯</span>
                    ) : (
                      <span className="badge badge-add">正常</span>
                    )}
                  </td>
                  <td>
                    {!log.rolled_back && (
                      <button
                        className="btn btn-sm btn-outline"
                        style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }}
                        onClick={() => setRollbackTarget(log)}
                      >
                        ↩ 回溯
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 回溯确认弹窗 */}
      <ConfirmModal
        isOpen={!!rollbackTarget}
        onClose={() => setRollbackTarget(null)}
        onConfirm={handleRollback}
        title="确认回溯操作"
        message={`确定要单独回溯这条记录吗？\n\n时间: ${rollbackTarget?.created_at}\n操作: ${rollbackTarget?.action_type}\n物品: ${rollbackTarget?.item_name || '-'}\n字段: ${rollbackTarget?.field_name || '-'}\n变更: ${rollbackTarget?.old_value || '-'} → ${rollbackTarget?.new_value || '-'}\n\n回溯操作本身也会被记录，且可以被再次回溯。`}
        confirmText="确认回溯"
        danger
      />
    </div>
  );
}
