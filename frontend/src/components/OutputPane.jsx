import React from 'react';

export default function OutputPane({ output }) {
  return (
    <div style={{ 
      fontFamily: 'monospace',
      fontSize: '14px',
      lineHeight: '1.5',
      color: '#d4d4d4'
    }}>
      {output.split('\n').map((line, i) => {
        // Apply special formatting for different log types
        let color = '#d4d4d4';
        if (line.includes('ERROR') || line.includes('Error')) color = '#f48771';
        if (line.includes('WARNING')) color = '#e5c07b';
        if (line.includes('INFO')) color = '#61afef';
        if (line.includes('SUCCESS') || line.includes('Completed')) color = '#98c379';
        
        return (
          <div 
            key={i} 
            style={{
              padding: '2px 0',
              borderBottom: i === 0 ? 'none' : '1px solid #222',
              color
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
}