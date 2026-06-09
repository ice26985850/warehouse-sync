const express = require('express');
const { getDb } = require('../db');
const { authMiddleware } = require('../middleware');
const { broadcastSync } = require('../sync');

const router = express.Router();

// 获取仓库内所有物品
router.get('/warehouse/:warehouseId', authMiddleware, (req, res) => {
  const db = getDb();
  const warehouseId = parseInt(req.params.warehouseId);
  const items = db.prepare('SELECT * FROM items WHERE warehouse_id = ? ORDER BY name').all(warehouseId);
  res.json(items);
});

// 新增物品
router.post('/', authMiddleware, (req, res) => {
  const { warehouse_id, name, quantity, size, notes } = req.body;
  if (!warehouse_id) return res.status(400).json({ error: '请指定仓库' });
  if (!name || !name.trim()) return res.status(400).json({ error: '物品名称不能为空' });

  const db = getDb();

  // 检查是否已存在同名物品
  const existing = db.prepare('SELECT * FROM items WHERE warehouse_id = ? AND name = ?').get(warehouse_id, name.trim());
  if (existing) return res.status(400).json({ error: '该仓库中已存在同名物品' });

  const qty = parseFloat(quantity) || 0;
  const result = db.prepare('INSERT INTO items (warehouse_id, name, quantity, size, notes) VALUES (?, ?, ?, ?, ?)')
    .run(warehouse_id, name.trim(), qty, size || '', notes || '');

  const newItem = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);

  // 记录日志
  db.prepare(`INSERT INTO change_logs (warehouse_id, username, action_type, item_id, item_name, field_name, old_value, new_value)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(warehouse_id, req.currentUser.username, 'CREATE_ITEM', newItem.id, name.trim(), '物品', '', `创建: ${name.trim()} 数量:${qty}`);

  broadcastSync({ type: 'ITEM_CREATED', payload: newItem });

  res.json(newItem);
});

// 更新物品数量（增减模式）
router.put('/:id', authMiddleware, (req, res) => {
  const { warehouse_id, name, quantity: newQty, size, notes, mode } = req.body;
  const id = parseInt(req.params.id);

  const db = getDb();
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  if (!item) return res.status(404).json({ error: '物品不存在' });

  let finalQty = parseFloat(newQty) || 0;
  let delta = 0;
  let actionType = 'UPDATE_ITEM';

  if (mode === 'add') {
    // 增加模式：在现有数量上加上输入值
    delta = finalQty;
    finalQty = item.quantity + delta;
    actionType = 'ADD_ITEM';
  } else if (mode === 'reduce') {
    // 减少模式：在现有数量上减去输入值
    delta = -finalQty;
    finalQty = item.quantity + delta;
    if (finalQty < 0) finalQty = 0;
    actionType = 'REDUCE_ITEM';
  } else {
    // 覆盖模式
    delta = finalQty - item.quantity;
  }

  const newName = name || item.name;
  const newSize = size !== undefined ? size : item.size;
  const newNotes = notes !== undefined ? notes : item.notes;

  db.prepare("UPDATE items SET name = ?, quantity = ?, size = ?, notes = ?, updated_at = datetime('now','localtime') WHERE id = ?")
    .run(newName, finalQty, newSize, newNotes, id);

  // 记录详细日志
  if (newName !== item.name) {
    db.prepare(`INSERT INTO change_logs (warehouse_id, username, action_type, item_id, item_name, field_name, old_value, new_value, delta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(warehouse_id || item.warehouse_id, req.currentUser.username, actionType, id, newName, '名称', item.name, newName, 0);
  }
  if (finalQty !== item.quantity) {
    db.prepare(`INSERT INTO change_logs (warehouse_id, username, action_type, item_id, item_name, field_name, old_value, new_value, delta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(warehouse_id || item.warehouse_id, req.currentUser.username, actionType, id, newName, '数量', String(item.quantity), String(finalQty), delta);
  }
  if (newSize !== item.size) {
    db.prepare(`INSERT INTO change_logs (warehouse_id, username, action_type, item_id, item_name, field_name, old_value, new_value, delta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(warehouse_id || item.warehouse_id, req.currentUser.username, actionType, id, newName, '尺寸', item.size, newSize, 0);
  }
  if (newNotes !== item.notes) {
    db.prepare(`INSERT INTO change_logs (warehouse_id, username, action_type, item_id, item_name, field_name, old_value, new_value, delta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(warehouse_id || item.warehouse_id, req.currentUser.username, actionType, id, newName, '备注', item.notes, newNotes, 0);
  }

  const updatedItem = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  broadcastSync({ type: 'ITEM_UPDATED', payload: updatedItem });

  res.json(updatedItem);
});

// 删除物品
router.delete('/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const db = getDb();
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  if (!item) return res.status(404).json({ error: '物品不存在' });

  db.prepare(`INSERT INTO change_logs (warehouse_id, username, action_type, item_id, item_name, field_name, old_value, new_value)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(item.warehouse_id, req.currentUser.username, 'DELETE_ITEM', item.id, item.name, '物品', item.name, '');

  db.prepare('DELETE FROM items WHERE id = ?').run(id);

  broadcastSync({ type: 'ITEM_DELETED', payload: { id, warehouse_id: item.warehouse_id } });

  res.json({ success: true });
});

module.exports = router;
