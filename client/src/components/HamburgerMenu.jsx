import React from 'react';
import { useApp } from '../contexts/AppContext';

const menuItems = [
  { id: 'dashboard', icon: '📦', label: '仓库主页' },
  { id: 'warehouses', icon: '🏭', label: '仓库管理' },
  { id: 'admin', icon: '🔐', label: '管理员分页' },
  { id: 'settings', icon: '⚙️', label: '系统设置' },
];

export default function HamburgerMenu({ currentPage, onNavigate }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { user, logout } = useApp();

  const handleNavigate = (page) => {
    setIsOpen(false);
    onNavigate(page);
  };

  return (
    <>
      <button className="hamburger-btn" onClick={() => setIsOpen(true)} title="菜单">
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>

      {isOpen && (
        <>
          <div className="side-menu-overlay" onClick={() => setIsOpen(false)} />
          <div className="side-menu">
            <div className="side-menu-header">
              <span className="side-menu-title">功能菜单</span>
              <button className="btn-icon" onClick={() => setIsOpen(false)} style={{ fontSize: '1.2rem' }}>✕</button>
            </div>

            <div className="side-menu-list">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  className={`side-menu-item ${currentPage === item.id ? 'active' : ''}`}
                  onClick={() => handleNavigate(item.id)}
                >
                  <span className="side-menu-icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>

            <div className="side-menu-footer">
              当前用户: {user?.username || '未登录'}
              {user?.is_admin && ' (管理员)'}
            </div>
          </div>
        </>
      )}
    </>
  );
}
