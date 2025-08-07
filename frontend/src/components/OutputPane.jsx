import React from 'react';

export default function OutputPane({ output }) {
  const getOutputStyle = () => {
    if (!output) return { color: '#666', fontStyle: 'italic' };
    
    if (output.startsWith('🔄')) {
      return { color: '#ffa500' };
    } else if (output.startsWith('✅')) {
      return { color: '#28a745' };
    } else if (output.startsWith('❌')) {
      return { color: '#dc3545' };
    }
    
    return { color: '#d4d4d4' };
  };

  return (
    <div style={{ 
      padding: '16px', 
      fontFamily: 'monospace', 
      fontSize: '13px',
      lineHeight: '1.6',
      height: '100%',
      overflowY: 'auto'
    }}>
      <div style={getOutputStyle()}>
        {output || (
          <div style={{ 
            textAlign: 'center',
            padding: '40px 20px',
            border: '2px dashed #444',
            borderRadius: '8px',
            backgroundColor: '#1a1a1a'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>🐍</div>
            <div style={{ fontWeight: '600', marginBottom: '8px', color: '#ccc' }}>
              Ready to execute your code
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>
              Click the "Run" button to see your Python code output here
            </div>
          </div>
        )}
      </div>
    </div>
  );
}