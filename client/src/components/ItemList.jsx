import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { api } from '../api';
import { ConfirmModal } from './CustomModal';

// 单项物品的增减控件
function InlineQuantityControl({ item }) {
  const { currentWarehouse, loadItems, showToast } = useApp();
  const [mode, setMode] = useState(null); // null | 'add' | 'reduce'
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qty = parseFloat(value);
    if (!qty || qty <= 0) {
      showToast('请输入有效数量', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.updateItem(item.id, {
        warehouse_id: currentWarehouse.id,
        name: item.name,
        quantity: qty,
        mode
      });
      const verb = mode === 'add' ? '增加' : '减少';
      showToast(`物品「${item.name}」${verb} ${qty}`, 'success');
      setMode(null);
      setValue('');
      await loadItems(currentWarehouse.id);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => {
    setMode(null);
    setValue('');
  };

  // 收起的按钮状态
  if (mode === null) {
    return (
      <div className="item-actions" style={{ gap: 4 }}>
        <button
          className="btn btn-sm"
          style={{ background: 'var(--success)', color: 'white', minWidth: 36 }}
          onClick={() => setMode('add')}
          title="增加"
        >
          +
        </button>
        <button
          className="btn btn-sm"
          style={{ background: 'var(--danger)', color: 'white', minWidth: 36 }}
          onClick={() => setMode('reduce')}
          title="减少"
        >
          −
        </button>
      </div>
    );
  }

  // 展开的输入状态
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600, whiteSpace: 'nowrap', color: mode === 'add' ? 'var(--success)' : 'var(--danger)' }}>
        {mode === 'add' ? '增加' : '减少'}
      </span>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 4 }}>
        <input
          className="input-field"
          type="number"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="数量"
          min="0.01"
          step="any"
          autoFocus
          style={{ width: 70, padding: '4px 8px', fontSize: 'var(--font-sm)', borderRadius: 'var(--radius-sm)' }}
          required
        />
        <button
          type="submit"
          className="btn btn-sm"
          disabled={loading}
          style={{ background: mode === 'add' ? 'var(--success)' : 'var(--danger)', color: 'white', fontSize: 'var(--font-xs)', padding: '4px 10px' }}
        >
          {loading ? '...' : '确认'}
        </button>
        <button type="button" className="btn btn-sm btn-outline" onClick={cancel} style={{ fontSize: 'var(--font-xs)', padding: '4px 8px' }}>
          取消
        </button>
      </form>
    </div>
  );
}

export default function ItemList() {
  const { items, loadItems, currentWarehouse, mode, showToast } = useApp();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSize, setEditSize] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteItem(deleteTarget.id);
      showToast(`物品「${deleteTarget.name}」已删除`, 'success');
      await loadItems(currentWarehouse.id);
    } catch (e) {
      showToast('删除失败: ' + e.message, 'error');
    }
    setDeleteTarget(null);
  };

  const openEdit = (item) => {
    setEditTarget(item);
    setEditName(item.name);
    setEditSize(item.size || '');
    setEditNotes(item.notes || '');
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    try {
      await api.updateItem(editTarget.id, {
        warehouse_id: currentWarehouse.id,
        name: editName,
        quantity: editTarget.quantity,
        size: editSize,
        notes: editNotes,
        mode: 'set'
      });
      showToast(`物品「${editName}」已更新`, 'success');
      await loadItems(currentWarehouse.id);
      setEditTarget(null);
    } catch (e) {
      showToast('更新失败: ' + e.message, 'error');
    }
  };

  return (
    <div>
      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p className="empty-state-text">仓库中暂无物品</p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-sm)' }}>
            点击上方「+ 展开新增」按钮添加物品
          </p>
        </div>
      ) : (
        items.map(item => (
          <div key={item.id} className="item-card">
            <div className="item-info">
              <div className="item-name">{item.name}</div>
              <div className="item-meta">
                {item.size && <span>📏 {item.size}</span>}
                {item.notes && <span>📝 {item.notes}</span>}
                <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-xs)' }}>
                  {item.updated_at || item.created_at}
                </span>
              </div>
            </div>

            <div className="item-quantity" style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--primary)', minWidth: 50, textAlign: 'center' }}>
              {item.quantity}
            </div>

            {mode !== 'browse' ? (
              <InlineQuantityControl item={item} />
            ) : (
              <div className="item-actions" style={{ gap: 4 }}>
                <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>浏览模式</span>
              </div>
            )}

            {mode !== 'browse' && (
              <div className="item-actions" style={{ borderLeft: '1px solid var(--border-light)', paddingLeft: 6, marginLeft: 4 }}>
                <button className="btn btn-sm btn-outline" onClick={() => openEdit(item)} title="编辑">
                  ✏️
                </button>
                <button className="btn btn-sm btn-outline" onClick={() => setDeleteTarget(item)} title="删除"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                  🗑
                </button>
              </div>
            )}
          </div>
        ))
      )}

      {/* 删除确认弹窗 */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="确认删除物品"
        message={`确定要删除物品「${deleteTarget?.name}」吗？此操作不可恢复。`}
        confirmText="确认删除"
        danger
      />

      {/* 编辑弹窗 */}
      {editTarget && (
        <div className="modal-overlay" onClick={() => setEditTarget(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">编辑物品: {editTarget.name}</h3>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label className="input-label">物品名称</label>
                <input className="input-field" value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">当前数量</label>
                <p style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--primary)' }}>{editTarget.quantity}</p>
                <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
                  数量通过旁边的 +/- 按钮修改
                </p>
              </div>
              <div className="input-group">
                <label className="input-label">尺寸</label>
                <input className="input-field" value={editSize} onChange={e => setEditSize(e.target.value)} placeholder="如: 10x20x30cm" />
              </div>
              <div className="input-group">
                <label className="input-label">备注</label>
                <textarea className="input-field" value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setEditTarget(null)}>取消</button>
              <button className="btn btn-primary" onClick={handleEditSave}>保存修改</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
