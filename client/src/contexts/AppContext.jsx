import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';

const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [currentWarehouse, setCurrentWarehouse] = useState(null);
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState('edit'); // 'edit' | 'browse'
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('fontSize') || 'medium');
  const [toasts, setToasts] = useState([]);
  const wsRef = useRef(null);
  const toastIdRef = useRef(0);

  // Toast
  const showToast = useCallback((message, type = 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // 主题
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 字体大小
  useEffect(() => {
    const sizes = { small: '14px', medium: '16px', large: '18px' };
    document.documentElement.style.fontSize = sizes[fontSize] || '16px';
    localStorage.setItem('fontSize', fontSize);
  }, [fontSize]);

  // 加载仓库列表
  const loadWarehouses = useCallback(async () => {
    try {
      const data = await api.getWarehouses();
      setWarehouses(data);
      return data;
    } catch (e) {
      // 未登录时不报错
      return [];
    }
  }, []);

  // 加载物品
  const loadItems = useCallback(async (warehouseId) => {
    if (!warehouseId) return;
    try {
      const data = await api.getItems(warehouseId);
      setItems(data);
    } catch (e) {
      showToast('加载物品失败: ' + e.message, 'error');
    }
  }, [showToast]);

  // 切换仓库
  const switchWarehouse = useCallback(async (warehouse) => {
    setCurrentWarehouse(warehouse);
    if (user) {
      const updated = { ...user, warehouseId: warehouse ? warehouse.id : null };
      setUser(updated);
      sessionStorage.setItem('currentUser', JSON.stringify(updated));
    }
    if (warehouse) {
      await loadItems(warehouse.id);
    } else {
      setItems([]);
    }
  }, [user, loadItems]);

  // 登录
  const login = useCallback(async (username, warehouseId = null) => {
    const data = await api.login(username);
    const userData = { ...data.user, warehouseId };
    setUser(userData);
    sessionStorage.setItem('currentUser', JSON.stringify(userData));
    sessionStorage.setItem('sessionToken', data.token);
    const whList = await loadWarehouses();
    if (warehouseId) {
      const wh = whList.find(w => w.id === parseInt(warehouseId));
      if (wh) {
        setCurrentWarehouse(wh);
        await loadItems(wh.id);
      }
    }
    return userData;
  }, [loadWarehouses, loadItems]);

  // 登出
  const logout = useCallback(() => {
    api.logout().catch(() => {});
    setUser(null);
    setCurrentWarehouse(null);
    setItems([]);
    setWarehouses([]);
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('sessionToken');
    sessionStorage.removeItem('adminToken');
    if (wsRef.current) wsRef.current.close();
  }, []);

  // WebSocket 实时同步
  useEffect(() => {
    if (!user) return;

    const serverUrl = localStorage.getItem('serverUrl');
    const host = serverUrl ? new URL(serverUrl).host : window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'REGISTER',
        token: sessionStorage.getItem('sessionToken'),
        warehouseId: currentWarehouse?.id || null
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ITEM_CREATED' && data.payload.warehouse_id === currentWarehouse?.id) {
          setItems(prev => [...prev, data.payload]);
        } else if (data.type === 'ITEM_UPDATED' && data.payload.warehouse_id === currentWarehouse?.id) {
          setItems(prev => prev.map(i => i.id === data.payload.id ? data.payload : i));
        } else if (data.type === 'ITEM_DELETED') {
          setItems(prev => prev.filter(i => i.id !== data.payload.id));
        } else if (data.type === 'WAREHOUSE_CREATED') {
          setWarehouses(prev => [...prev, data.payload]);
          showToast(`仓库「${data.payload.name}」已创建`, 'success');
        } else if (data.type === 'WAREHOUSE_DELETED') {
          setWarehouses(prev => prev.filter(w => w.id !== data.payload.id));
          if (currentWarehouse?.id === data.payload.id) {
            setCurrentWarehouse(null);
            setItems([]);
          }
          showToast(`仓库「${data.payload.name}」已删除`, 'info');
        } else if (data.type === 'WAREHOUSE_UPDATED') {
          setWarehouses(prev => prev.map(w => w.id === data.payload.id ? { ...w, name: data.payload.name } : w));
          if (currentWarehouse?.id === data.payload.id) {
            setCurrentWarehouse(prev => ({ ...prev, name: data.payload.name }));
          }
        } else if (data.type === 'ROLLBACK_PERFORMED') {
          showToast(data.payload.description || '回溯操作完成', 'info');
          if (currentWarehouse) loadItems(currentWarehouse.id);
        }
      } catch (e) { /* ignore */ }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, [user?.username, currentWarehouse?.id]);

  // 恢复登录状态
  useEffect(() => {
    const saved = sessionStorage.getItem('currentUser');
    const savedToken = sessionStorage.getItem('sessionToken');
    if (saved && savedToken) {
      try {
        const userData = JSON.parse(saved);
        setUser(userData);
        loadWarehouses();
      } catch { /* ignore */ }
    }
  }, []);

  const value = {
    user, setUser,
    warehouses, setWarehouses, loadWarehouses,
    currentWarehouse, switchWarehouse,
    items, setItems, loadItems,
    mode, setMode,
    theme, setTheme,
    fontSize, setFontSize,
    toasts, showToast,
    login, logout
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
