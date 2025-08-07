import React from 'react';

export default function ExplanationPane({ explanation, onClose, isLoading }) {
  return (
    <div style={{
      backgroundColor: '#1a2b1a',
      border: '1px solid #28a745',
      borderRadius: '8px 8px 0 0',
      maxHeight: '200px',
      minHeight: '120px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#28a745',
        color: 'white',
        fontSize: '14px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: '8px 8px 0 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isLoading ? (
            <>
              <div style={{
                width: '14px',
                height: '14px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              AI Analyzing...
            </>
          ) : (
            <>
              <span>✨</span>
              AI Analysis & Explanation
            </>
          )}
        </div>
        
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '2px 6px',
            borderRadius: '3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.8,
            transition: 'opacity 0.2s ease'
          }}
          onMouseOver={(e) => e.target.style.opacity = '1'}
          onMouseOut={(e) => e.target.style.opacity = '0.8'}
          title="Close explanation"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        padding: '16px',
        overflowY: 'auto',
        fontSize: '13px',
        lineHeight: '1.6',
        color: '#e6ffe6'
      }}>
        {isLoading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#28a745',
            fontSize: '12px',
            fontStyle: 'italic'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                border: '2px solid rgba(40, 167, 69, 0.3)',
                borderTopColor: '#28a745',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Processing your code...
            </div>
          </div>
        ) : (
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {explanation}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}