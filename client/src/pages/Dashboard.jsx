import React from 'react';
import { useApp } from '../contexts/AppContext';
import ItemForm from '../components/ItemForm';
import ItemList from '../components/ItemList';
import ModeSwitch from '../components/ModeSwitch';

export default function Dashboard() {
  const { currentWarehouse, warehouses, switchWarehouse, mode } = useApp();

  const handleSwitch = (e) => {
    const id = parseInt(e.target.value);
    const wh = warehouses.find(w => w.id === id);
    switchWarehouse(wh || null);
  };

  return (
    <div>
      {/* 仓库选择器 */}
      <div className="form-card" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 'var(--font-md)', whiteSpace: 'nowrap' }}>
            🏭 当前仓库:
          </span>
          {warehouses.length === 0 ? (
            <span style={{ color: 'var(--danger)', fontSize: 'var(--font-sm)' }}>
              暂无仓库，请前往「仓库管理」创建
            </span>
          ) : (
            <select
              className="input-field"
              value={currentWarehouse?.id || ''}
              onChange={handleSwitch}
              style={{ maxWidth: 250 }}
            >
              <option value="">-- 选择仓库 --</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          )}
          {currentWarehouse && (
            <span className="warehouse-badge">
              {currentWarehouse.name}
            </span>
          )}
        </div>
      </div>

      {/* 无仓库提示 */}
      {warehouses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏚️</div>
          <p className="empty-state-text">系统中暂无仓库</p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-sm)', marginBottom: 16 }}>
            请前往右上角菜单 → 仓库管理 → 创建新仓库
          </p>
        </div>
      ) : !currentWarehouse ? (
        <div className="empty-state">
          <div className="empty-state-icon">👆</div>
          <p className="empty-state-text">请在上方选择一个仓库</p>
        </div>
      ) : (
        <>
          {/* 模式切换 + 新增按钮 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
            <ModeSwitch />
          </div>
          {mode !== 'browse' && <ItemForm />}
          <ItemList />
        </>
      )}
    </div>
  );
}
