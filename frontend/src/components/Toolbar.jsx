import React from 'react';

export default function Toolbar({ onRun }) {
  return (
    <div className="toolbar" style={{
      padding: '10px 16px',
      backgroundColor: '#252526',
      borderBottom: '1px solid #333',
      display: 'flex',
      gap: '8px'
    }}>
      <button 
        onClick={onRun}
        style={{
          padding: '6px 12px',
          background: '#007acc',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span>▶️</span> Run
      </button>
      <button 
        disabled
        style={{
          padding: '6px 12px',
          background: '#3a3a3a',
          color: '#aaa',
          border: 'none',
          borderRadius: '3px',
          cursor: 'not-allowed',
          fontSize: '13px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span>🐞</span> Debug
      </button>
      <button 
        disabled
        style={{
          padding: '6px 12px',
          background: '#3a3a3a',
          color: '#aaa',
          border: 'none',
          borderRadius: '3px',
          cursor: 'not-allowed',
          fontSize: '13px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span>✅</span> Test
      </button>
    </div>
  );
}