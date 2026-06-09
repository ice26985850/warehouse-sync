const express = require('express');
const { getDb } = require('../db');
const { verifyAdminToken } = require('./auth');
const { broadcastSync } = require('../sync');

const router = express.Router();

// 获取变更日志（需要管理员验证）
router.get('/', verifyAdminToken, (req, res) => {
  const db = getDb();
  const { warehouse_id, username, start_date, end_date, limit } = req.query;

  let sql = `SELECT cl.*, w.name as warehouse_name FROM change_logs cl
    LEFT JOIN warehouses w ON cl.warehouse_id = w.id WHERE 1=1`;
  const params = [];

  if (warehouse_id) {
    sql += ' AND cl.warehouse_id = ?';
    params.push(parseInt(warehouse_id));
  }
  if (username) {
    sql += ' AND cl.username = ?';
    params.push(username);
  }
  if (start_date) {
    sql += ' AND cl.created_at >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND cl.created_at <= ?';
    params.push(end_date);
  }

  sql += ' ORDER BY cl.created_at DESC';

  if (limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(limit));
  }

  const logs = db.prepare(sql).all(...params);
  res.json(logs);
});

// 精确独立回溯单条记录
router.post('/rollback/:logId', verifyAdminToken, (req, res) => {
  const logId = parseInt(req.params.logId);
  const db = getDb();

  const log = db.prepare('SELECT * FROM change_logs WHERE id = ?').get(logId);
  if (!log) return res.status(404).json({ error: '日志记录不存在' });

  if (log.rolled_back === 1) return res.status(400).json({ error: '该记录已被回溯' });

  // 根据日志类型执行逆向操作
  const performedBy = 'SCPO5（管理员回溯操作）';
  let rollbackDesc = '';

  try {
    db.exec('BEGIN TRANSACTION');

    if (log.action_type === 'ADD_ITEM' || log.action_type === 'REDUCE_ITEM' || log.action_type === 'UPDATE_ITEM') {
      // 数量变更的回溯：反向操作
      const item = db.prepare('SELECT * FROM items WHERE id = ?').get(log.item_id);
      if (item && log.field_name === '数量' && log.delta) {
        const reverseDelta = -log.delta;
        const newQty = item.quantity + reverseDelta;
        const finalQty = Math.max(0, newQty);

        db.prepare("UPDATE items SET quantity = ?, updated_at = datetime('now','localtime') WHERE id = ?")
          .run(finalQty, item.id);

        rollbackDesc = `回溯: 物品「${item.name}」数量 ${log.old_value} → ${finalQty}（撤销了 ${log.delta > 0 ? '+' : ''}${log.delta} 的变更）`;

        // 记录回溯日志
        const rbResult = db.prepare(`INSERT INTO change_logs
          (warehouse_id, username, action_type, item_id, item_name, field_name, old_value, new_value, delta)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(log.warehouse_id, performedBy, 'ROLLBACK', item.id, item.name, '数量',
            String(item.quantity), String(finalQty), reverseDelta);

        // 标记原日志为已回溯，并关联回溯日志ID
        db.prepare('UPDATE change_logs SET rolled_back = 1, rollback_log_id = ? WHERE id = ?')
          .run(rbResult.lastInsertRowid, logId);
      } else if (item && log.field_name === '名称') {
        // 名称变更回溯
        db.prepare("UPDATE items SET name = ?, updated_at = datetime('now','localtime') WHERE id = ?")
          .run(log.old_value, item.id);

        rollbackDesc = `回溯: 物品名称「${log.new_value}」→「${log.old_value}」`;

        const rbResult = db.prepare(`INSERT INTO change_logs
          (warehouse_id, username, action_type, item_id, item_name, field_name, old_value, new_value, delta)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(log.warehouse_id, performedBy, 'ROLLBACK', item.id, log.old_value, '名称',
            log.new_value, log.old_value, 0);

        db.prepare('UPDATE change_logs SET rolled_back = 1, rollback_log_id = ? WHERE id = ?')
          .run(rbResult.lastInsertRowid, logId);
      }
    } else if (log.action_type === 'CREATE_ITEM') {
      // 创建物品的回溯：删除该物品
      const item = db.prepare('SELECT * FROM items WHERE id = ?').get(log.item_id);
      if (item) {
        db.prepare('DELETE FROM items WHERE id = ?').run(item.id);
        rollbackDesc = `回溯: 删除物品「${item.name}」（撤销创建操作）`;

        const rbResult = db.prepare(`INSERT INTO change_logs
          (warehouse_id, username, action_type, item_id, item_name, field_name, old_value, new_value, delta)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(log.warehouse_id, performedBy, 'ROLLBACK', log.item_id, item.name, '物品', item.name, '', 0);

        db.prepare('UPDATE change_logs SET rolled_back = 1, rollback_log_id = ? WHERE id = ?')
          .run(rbResult.lastInsertRowid, logId);
      }
    } else if (log.action_type === 'DELETE_ITEM') {
      // 删除物品的回溯：恢复该物品（但可能丢失了原始数据，这里做简单恢复）
      const itemName = log.item_name;
      db.prepare('INSERT INTO items (warehouse_id, name, quantity, size, notes) VALUES (?, ?, 0, "", "")')
        .run(log.warehouse_id, itemName);

      rollbackDesc = `回溯: 恢复物品「${itemName}」（撤销删除操作）`;

      const rbResult = db.prepare(`INSERT INTO change_logs
        (warehouse_id, username, action_type, item_id, item_name, field_name, old_value, new_value, delta)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(log.warehouse_id, performedBy, 'ROLLBACK', null, itemName, '物品', '', itemName, 0);

      db.prepare('UPDATE change_logs SET rolled_back = 1, rollback_log_id = ? WHERE id = ?')
        .run(rbResult.lastInsertRowid, logId);
    } else if (log.action_type === 'ROLLBACK') {
      // 回溯的回溯（撤消回溯）
      // 找到被此回溯标记的原日志
      const originalLog = db.prepare('SELECT * FROM change_logs WHERE rollback_log_id = ?').get(logId);
      if (originalLog) {
        // 对原日志记录再次执行回溯（相当于撤销之前的回溯）
        // 即重新应用原日志的操作
        if (originalLog.action_type === 'ADD_ITEM' || originalLog.action_type === 'REDUCE_ITEM' || originalLog.action_type === 'UPDATE_ITEM') {
          if (originalLog.field_name === '数量' && originalLog.delta) {
            const item = db.prepare('SELECT * FROM items WHERE id = ?').get(originalLog.item_id);
            if (item) {
              const newQty = Math.max(0, item.quantity + originalLog.delta);
              db.prepare("UPDATE items SET quantity = ?, updated_at = datetime('now','localtime') WHERE id = ?")
                .run(newQty, item.id);

              rollbackDesc = `撤销回溯: 恢复物品「${item.name}」的变更，数量 ${item.quantity} → ${newQty}`;

              const rbResult = db.prepare(`INSERT INTO change_logs
                (warehouse_id, username, action_type, item_id, item_name, field_name, old_value, new_value, delta)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                .run(log.warehouse_id, performedBy, 'ROLLBACK', item.id, item.name, '数量',
                  String(item.quantity), String(newQty), originalLog.delta);

              // 标记回溯日志为已回溯
              db.prepare('UPDATE change_logs SET rolled_back = 1, rollback_log_id = ? WHERE id = ?')
                .run(rbResult.lastInsertRowid, logId);
              // 恢复原日志的回溯状态
              db.prepare('UPDATE change_logs SET rolled_back = 0, rollback_log_id = NULL WHERE id = ?')
                .run(originalLog.id);
            }
          }
        }
      }
    }

    db.exec('COMMIT');

    broadcastSync({ type: 'ROLLBACK_PERFORMED', payload: { logId, description: rollbackDesc } });

    res.json({ success: true, message: rollbackDesc || '回溯操作完成' });
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Rollback error:', err);
    res.status(500).json({ error: '回溯操作失败: ' + err.message });
  }
});

// 清理超过30天的旧日志（保留最近30天）
router.post('/cleanup', verifyAdminToken, (req, res) => {
  const db = getDb();
  const result = db.prepare("DELETE FROM change_logs WHERE created_at < datetime('now', 'localtime', '-30 days') AND rolled_back = 1").run();
  res.json({ success: true, deleted: result.changes, message: `已清理 ${result.changes} 条超过30天的已回溯日志` });
});

module.exports = router;
