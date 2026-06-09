import React from 'react';
import { useApp } from '../contexts/AppContext';

export default function ModeSwitch() {
  const { mode, setMode } = useApp();

  const modes = [
    { id: 'edit', label: '✏️ 编辑', className: '' },
    { id: 'browse', label: '👁 浏览', className: '' },
  ];

  return (
    <div className="mode-switch">
      {modes.map(m => (
        <button
          key={m.id}
          className={`mode-btn ${mode === m.id ? 'active' : ''}`}
          onClick={() => setMode(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
