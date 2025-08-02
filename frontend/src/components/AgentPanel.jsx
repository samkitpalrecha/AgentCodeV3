import React from 'react';

export default function AgentPanel({ 
  code, 
  onExplain, 
  loading,
  progress = 0,
  currentStep = ''
}) {
  return (
    <div style={{ 
      padding: '16px',
      backgroundColor: '#1a1a1a',
      borderRadius: '6px',
      margin: '0 8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <button 
        onClick={onExplain} 
        disabled={loading}
        style={{
          padding: '10px 20px',
          background: loading ? '#555' : '#007acc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'wait' : 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        {loading ? (
          <>
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderTopColor: 'white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            {progress > 0 ? `Processing (${Math.round(progress)}%)` : 'Starting...'}
          </>
        ) : (
          <>
            <span>🤖</span> AI Explain & Improve
          </>
        )}
      </button>
      
      {/* Progress bar */}
      {loading && progress > 0 && (
        <div style={{
          width: '100%',
          background: '#333',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '6px',
            background: '#007acc',
            transition: 'width 0.3s ease'
          }} />
        </div>
      )}
      
      {/* Current step */}
      {loading && currentStep && (
        <div style={{
          fontSize: '0.9rem',
          color: '#aaa',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {currentStep}
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}