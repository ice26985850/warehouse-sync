import React, { useState } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import HamburgerMenu from './components/HamburgerMenu';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import WarehouseManager from './components/WarehouseManager';
import Settings from './pages/Settings';
import './styles/themes.css';

function AppContent() {
  const { user, toasts } = useApp();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'warehouses': return <WarehouseManager />;
      case 'admin': return <AdminPanel />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard': return '仓库主页';
      case 'warehouses': return '仓库管理';
      case 'admin': return '管理员分页';
      case 'settings': return '系统设置';
      default: return '仓库主页';
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Toast 通知 */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              {t.message}
            </div>
          ))}
        </div>
      )}

      {/* 顶部导航 */}
      <header className="app-header">
        <div className="app-header-left">
          <span className="app-header-title">{getPageTitle()}</span>
          <span className="app-header-subtitle">多仓库同步管理系统 v1.0</span>
        </div>
        <div className="app-header-right">
          <HamburgerMenu currentPage={currentPage} onNavigate={setCurrentPage} />
        </div>
      </header>

      {/* 主内容 */}
      <main className="app-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
