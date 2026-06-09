function getApiBase() {
  // 从 localStorage 读取服务器地址，默认使用相对路径（同主机）
  const serverUrl = localStorage.getItem('serverUrl');
  if (serverUrl) {
    return serverUrl.replace(/\/$/, '') + '/api';
  }
  return '/api';
}

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = sessionStorage.getItem('sessionToken');
  if (token) {
    headers['x-session-token'] = token;
  }
  const adminToken = sessionStorage.getItem('adminToken');
  if (adminToken) {
    headers['x-admin-token'] = adminToken;
  }
  return headers;
}

async function request(path, options = {}) {
  const res = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...options.headers }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

export const api = {
  // 认证
  getUsers: () => request('/auth/users'),
  getInitData: () => request('/auth/init'), // 登录页初始化：用户+仓库（无需认证）
  login: (username) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  adminVerify: (password) => request('/auth/admin-verify', { method: 'POST', body: JSON.stringify({ password }) }),

  // 仓库
  getWarehouses: () => request('/warehouses'),
  createWarehouse: (name) => request('/warehouses', { method: 'POST', body: JSON.stringify({ name }) }),
  renameWarehouse: (id, name) => request(`/warehouses/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteWarehouse: (id) => request(`/warehouses/${id}`, { method: 'DELETE' }),

  // 物品
  getItems: (warehouseId) => request(`/items/warehouse/${warehouseId}`),
  createItem: (data) => request('/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id, data) => request(`/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (id) => request(`/items/${id}`, { method: 'DELETE' }),

  // 日志
  getLogs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/logs${qs ? '?' + qs : ''}`);
  },
  rollbackLog: (logId) => request(`/logs/rollback/${logId}`, { method: 'POST' }),
  cleanupLogs: () => request('/logs/cleanup', { method: 'POST' }),

  // 管理员
  createUser: (username) => request('/admin/users', { method: 'POST', body: JSON.stringify({ username }) }),
  deleteUser: (username) => request(`/admin/users/${encodeURIComponent(username)}`, { method: 'DELETE' }),
  updateAdminAccount: (newUsername) => request('/admin/admin-account', { method: 'PUT', body: JSON.stringify({ newUsername }) }),
  updateAdminPassword: (oldPassword, newPassword) => request('/admin/admin-password', { method: 'PUT', body: JSON.stringify({ oldPassword, newPassword }) }),
};
