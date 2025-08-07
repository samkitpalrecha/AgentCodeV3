import React from 'react';

export default function ActivityBar({ activeView, setActiveView, showChat, setShowChat }) {
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
      {/* Main Views */}
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
          onMouseOver={(e) => {
            if (activeView !== view.id) {
              e.currentTarget.style.color = '#ccc';
              e.currentTarget.style.backgroundColor = '#2a2a2a';
            }
          }}
          onMouseOut={(e) => {
            if (activeView !== view.id) {
              e.currentTarget.style.color = '#999';
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
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
      
      {/* Spacer */}
      <div style={{ flex: 1 }} />
      
      {/* AI Chat Toggle */}
      <div
        onClick={() => setShowChat(!showChat)}
        style={{
          width: '100%',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          fontSize: '1.25rem',
          color: showChat ? '#fff' : '#999',
          backgroundColor: showChat ? '#252526' : 'transparent',
          transition: 'all 0.2s ease',
          marginBottom: '8px'
        }}
        title="AI Chat Assistant"
        onMouseOver={(e) => {
          if (!showChat) {
            e.currentTarget.style.color = '#ccc';
            e.currentTarget.style.backgroundColor = '#2a2a2a';
          }
        }}
        onMouseOut={(e) => {
          if (!showChat) {
            e.currentTarget.style.color = '#999';
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        💬
        {showChat && (
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '3px',
            background: '#6f42c1'
          }} />
        )}
        {/* Chat notification dot when there are unread messages */}
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          width: '8px',
          height: '8px',
          backgroundColor: '#28a745',
          borderRadius: '50%',
          display: showChat ? 'none' : 'block'
        }} />
      </div>
      
      {/* Settings Icon */}
      <div 
        style={{
          width: '100%',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '1.25rem',
          color: '#999',
          transition: 'all 0.2s ease',
          marginBottom: '12px'
        }}
        title="Settings"
        onMouseOver={(e) => {
          e.currentTarget.style.color = '#ccc';
          e.currentTarget.style.backgroundColor = '#2a2a2a';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.color = '#999';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        ⚙️
      </div>
    </div>
  );
}