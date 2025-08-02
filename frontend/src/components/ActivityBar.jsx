import React from 'react';

export default function ActivityBar({ activeView, setActiveView }) {
  const views = [
    { id: 'explorer', icon: '📁', label: 'Explorer' },
    { id: 'search', icon: '🔍', label: 'Search' },
    { id: 'git', icon: '🐙', label: 'Git' },
    { id: 'debug', icon: '🐞', label: 'Debug' },
    { id: 'extensions', icon: '🧩', label: 'Extensions' }
  ];

  return (
    <div style={{
      width: '48px',
      backgroundColor: '#333',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: '12px',
      borderRight: '1px solid #252526'
    }}>
      {views.map(view => (
        <div
          key={view.id}
          onClick={() => setActiveView(view.id)}
          style={{
            width: '100%',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            fontSize: '1.25rem',
            color: activeView === view.id ? '#fff' : '#999',
            backgroundColor: activeView === view.id ? '#252526' : 'transparent',
            transition: 'all 0.2s ease'
          }}
          title={view.label}
        >
          {view.icon}
          {activeView === view.id && (
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '3px',
              background: '#007acc'
            }} />
          )}
        </div>
      ))}
      
      {/* Bottom Settings Icon */}
      <div 
        style={{
          marginTop: 'auto',
          padding: '12px 0',
          cursor: 'pointer',
          fontSize: '1.25rem',
          color: '#999'
        }}
        title="Settings"
      >
        ⚙️
      </div>
    </div>
  );
}