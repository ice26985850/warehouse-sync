const express = require('express');
const { getDb } = require('../db');
const { authMiddleware } = require('../middleware');
const { broadcastSync } = require('../sync');

const router = express.Router();

// 获取所有仓库
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  const warehouses = db.prepare('SELECT * FROM warehouses ORDER BY name').all();
  res.json(warehouses);
});

// 新增仓库
router.post('/', authMiddleware, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: '仓库名称不能为空' });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM warehouses WHERE name = ?').get(name.trim());
  if (existing) return res.status(400).json({ error: '仓库名称已存在' });

  const result = db.prepare('INSERT INTO warehouses (name) VALUES (?)').run(name.trim());

  // 记录日志
  db.prepare(`INSERT INTO change_logs (warehouse_id, username, action_type, item_name, field_name, old_value, new_value)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(result.lastInsertRowid, req.currentUser.username, 'CREATE_WAREHOUSE', name.trim(), '仓库', '', name.trim());

  broadcastSync({ type: 'WAREHOUSE_CREATED', payload: { id: result.lastInsertRowid, name: name.trim() } });

  res.json({ id: result.lastInsertRowid, name: name.trim() });
});

// 重命名仓库
router.put('/:id', authMiddleware, (req, res) => {
  const { name } = req.body;
  const id = parseInt(req.params.id);
  if (!name || !name.trim()) return res.status(400).json({ error: '仓库名称不能为空' });

  const db = getDb();
  const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(id);
  if (!warehouse) return res.status(404).json({ error: '仓库不存在' });

  const oldName = warehouse.name;
  db.prepare('UPDATE warehouses SET name = ? WHERE id = ?').run(name.trim(), id);

  db.prepare(`INSERT INTO change_logs (warehouse_id, username, action_type, item_name, field_name, old_value, new_value)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, req.currentUser.username, 'RENAME_WAREHOUSE', name.trim(), '仓库名称', oldName, name.trim());

  broadcastSync({ type: 'WAREHOUSE_UPDATED', payload: { id, name: name.trim(), oldName } });

  res.json({ success: true });
});

// 删除仓库
router.delete('/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);

  const db = getDb();
  const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(id);
  if (!warehouse) return res.status(404).json({ error: '仓库不存在' });

  // 先记录所有物品的日志（物品会被级联删除）
  const items = db.prepare('SELECT * FROM items WHERE warehouse_id = ?').all(id);
  for (const item of items) {
    db.prepare(`INSERT INTO change_logs (warehouse_id, username, action_type, item_id, item_name, field_name, old_value, new_value)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, req.currentUser.username, 'DELETE_ITEM', item.id, item.name, '物品', item.name, '');
  }

  db.prepare(`INSERT INTO change_logs (warehouse_id, username, action_type, item_name, field_name, old_value, new_value)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, req.currentUser.username, 'DELETE_WAREHOUSE', warehouse.name, '仓库', warehouse.name, '');

  db.prepare('DELETE FROM warehouses WHERE id = ?').run(id);

  broadcastSync({ type: 'WAREHOUSE_DELETED', payload: { id, name: warehouse.name } });

  res.json({ success: true });
});

module.exports = router;
