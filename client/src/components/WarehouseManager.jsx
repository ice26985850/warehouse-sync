import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { api } from '../api';
import { ConfirmModal } from './CustomModal';

export default function WarehouseManager() {
  const { warehouses, loadWarehouses, currentWarehouse, switchWarehouse, showToast } = useApp();
  const [newName, setNewName] = useState('');
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await api.createWarehouse(newName.trim());
      showToast(`仓库「${newName.trim()}」创建成功`, 'success');
      setNewName('');
      await loadWarehouses();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    try {
      await api.renameWarehouse(renameTarget.id, renameValue.trim());
      showToast('仓库重命名成功', 'success');
      await loadWarehouses();
      if (currentWarehouse?.id === renameTarget.id) {
        switchWarehouse({ ...currentWarehouse, name: renameValue.trim() });
      }
    } catch (e) {
      showToast(e.message, 'error');
    }
    setRenameTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteWarehouse(deleteTarget.id);
      await loadWarehouses();
      if (currentWarehouse?.id === deleteTarget.id) {
        switchWarehouse(null);
      }
    } catch (e) {
      showToast(e.message, 'error');
    }
    setDeleteTarget(null);
  };

  return (
    <div>
      {/* 新增仓库 */}
      <div className="form-card">
        <h3 className="form-card-title">🏭 新增仓库</h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 10 }}>
          <input
            className="input-field"
            style={{ flex: 1 }}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="输入新仓库名称"
            required
          />
          <button type="submit" className="btn btn-primary">创建</button>
        </form>
      </div>

      {/* 仓库列表 */}
      <div>
        <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>
          现有仓库 ({warehouses.length})
        </h3>
        {warehouses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏚️</div>
            <p className="empty-state-text">暂无仓库</p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-sm)' }}>
              在上方创建第一个仓库
            </p>
          </div>
        ) : (
          warehouses.map(w => (
            <div key={w.id} className="item-card">
              <div className="item-info">
                <div className="item-name">🏭 {w.name}</div>
                <div className="item-meta">
                  <span>创建: {w.created_at}</span>
                </div>
              </div>
              <div className="item-actions">
                <button
                  className={`btn btn-sm ${currentWarehouse?.id === w.id ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => switchWarehouse(w)}
                >
                  {currentWarehouse?.id === w.id ? '当前' : '切换'}
                </button>
                <button className="btn btn-sm btn-outline" onClick={() => { setRenameTarget(w); setRenameValue(w.name); }}>
                  ✏️
                </button>
                <button className="btn btn-sm btn-outline" onClick={() => setDeleteTarget(w)}
                  style={{ color: 'var(--danger)' }}>
                  🗑
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 重命名弹窗 */}
      {renameTarget && (
        <div className="modal-overlay" onClick={() => setRenameTarget(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">重命名仓库</h3>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label className="input-label">新名称</label>
                <input className="input-field" value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setRenameTarget(null)}>取消</button>
              <button className="btn btn-primary" onClick={handleRename}>确认</button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="确认删除仓库"
        message={`确定要删除仓库「${deleteTarget?.name}」吗？该仓库内所有物品数据将被永久删除，此操作不可恢复！`}
        confirmText="确认删除"
        danger
      />
    </div>
  );
}
