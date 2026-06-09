import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { api } from '../api';

export default function ItemForm() {
  const { currentWarehouse, loadItems, showToast } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [size, setSize] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentWarehouse) {
      showToast('请先选择仓库', 'error');
      return;
    }
    if (!name.trim()) {
      showToast('请输入物品名称', 'error');
      return;
    }

    setLoading(true);
    try {
      const qty = parseFloat(quantity) || 0;
      await api.createItem({
        warehouse_id: currentWarehouse.id,
        name: name.trim(),
        quantity: qty,
        size,
        notes
      });
      showToast(`新增物品「${name.trim()}」成功`, 'success');
      setName('');
      setQuantity('');
      setSize('');
      setNotes('');
      setExpanded(false);
      await loadItems(currentWarehouse.id);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-card" style={{ padding: expanded ? '20px' : '14px 20px' }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="form-card-title" style={{ marginBottom: 0 }}>
          {expanded ? '📦 新增物品' : '📦 新增物品'}
        </h3>
        <button
          type="button"
          className="btn btn-sm"
          style={{
            background: expanded ? 'var(--bg-tertiary)' : 'var(--primary)',
            color: expanded ? 'var(--text-primary)' : 'white',
            transition: 'all 0.2s ease',
          }}
        >
          {expanded ? '收起 ▲' : '+ 展开新增'}
        </button>
      </div>

      {expanded && (
        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <div className="form-row">
            <div className="input-group">
              <label className="input-label">物品名称 *</label>
              <input
                className="input-field"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="输入物品名称"
                required
                autoFocus
              />
            </div>
            <div className="input-group">
              <label className="input-label">初始数量</label>
              <input
                className="input-field"
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="默认 0"
                min="0"
                step="any"
              />
            </div>
            <div className="input-group">
              <label className="input-label">尺寸</label>
              <input
                className="input-field"
                type="text"
                value={size}
                onChange={e => setSize(e.target.value)}
                placeholder="如: 10x20x30cm"
              />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">备注</label>
            <textarea
              className="input-field"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="备注信息（可选）"
              rows={2}
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => setExpanded(false)}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '创建中...' : '✅ 创建物品'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
