import React from 'react';

export default function EnhancedToolbar({ onRun, onExplain, onAutoFix, isAgentRunning, activeFileName }) {
  return (
    <div style={{
      padding: '10px 16px',
      backgroundColor: '#252526',
      borderBottom: '1px solid #333',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {/* Run Button */}
        <button 
          onClick={onRun}
          style={{
            padding: '8px 16px',
            background: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background-color 0.2s ease'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#005a9e'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#007acc'}
        >
          <span style={{ fontSize: '12px' }}>▶️</span>
          Run
        </button>

        {/* AI Explain & Improve Button */}
        <button 
          onClick={onExplain}
          disabled={isAgentRunning}
          style={{
            padding: '8px 16px',
            background: isAgentRunning ? '#4a4a4a' : '#6f42c1',
            color: isAgentRunning ? '#888' : 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isAgentRunning ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
          onMouseOver={(e) => {
            if (!isAgentRunning) {
              e.target.style.backgroundColor = '#5a359a';
            }
          }}
          onMouseOut={(e) => {
            if (!isAgentRunning) {
              e.target.style.backgroundColor = '#6f42c1';
            }
          }}
        >
          {isAgentRunning ? (
            <>
              <div style={{
                width: '12px',
                height: '12px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTopColor: '#888',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Analyzing...
            </>
          ) : (
            <>
              <span style={{ fontSize: '12px' }}>🪄</span>
              AI Explain & Improve
            </>
          )}
        </button>

        {/* Auto-Fix Button */}
        <button 
          onClick={onAutoFix}
          disabled={isAgentRunning}
          style={{
            padding: '8px 16px',
            background: isAgentRunning ? '#4a4a4a' : '#dc3545',
            color: isAgentRunning ? '#888' : 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isAgentRunning ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            if (!isAgentRunning) {
              e.target.style.backgroundColor = '#bb2d3b';
            }
          }}
          onMouseOut={(e) => {
            if (!isAgentRunning) {
              e.target.style.backgroundColor = '#dc3545';
            }
          }}
        >
          <span style={{ fontSize: '12px' }}>🐛</span>
          Auto-Fix
        </button>

        {/* Test Button (Disabled) */}
        {/* <button 
          disabled
          style={{
            padding: '8px 16px',
            background: '#3a3a3a',
            color: '#666',
            border: 'none',
            borderRadius: '4px',
            cursor: 'not-allowed',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '12px' }}>✅</span>
          Test
        </button> */}
      </div>

      {/* Active File Info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        color: '#888',
        fontWeight: '500'
      }}>
        <span style={{ fontSize: '14px' }}>📄</span>
        {activeFileName}
        {isAgentRunning && (
          <div style={{
            padding: '2px 8px',
            backgroundColor: '#007acc',
            color: 'white',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: '600'
          }}>
            AI ACTIVE
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}