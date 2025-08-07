import React from 'react';

export default function DiffView({ original, modified, fileName, onAccept, onReject }) {
  const getDiffLines = (originalText, modifiedText) => {
    const originalLines = originalText.split('\n');
    const modifiedLines = modifiedText.split('\n');
    
    // Simple line-by-line diff (you could enhance this with a proper diff library)
    const maxLines = Math.max(originalLines.length, modifiedLines.length);
    const diff = [];
    
    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i] || '';
      const modifiedLine = modifiedLines[i] || '';
      
      if (originalLine === modifiedLine) {
        diff.push({ type: 'equal', original: originalLine, modified: modifiedLine, lineNumber: i + 1 });
      } else if (originalLine && !modifiedLine) {
        diff.push({ type: 'removed', original: originalLine, modified: '', lineNumber: i + 1 });
      } else if (!originalLine && modifiedLine) {
        diff.push({ type: 'added', original: '', modified: modifiedLine, lineNumber: i + 1 });
      } else {
        diff.push({ type: 'changed', original: originalLine, modified: modifiedLine, lineNumber: i + 1 });
      }
    }
    
    return diff;
  };

  const diffLines = getDiffLines(original, modified);

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#1e1e1e'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#252526',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#fff',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          <span>📄</span>
          <span>{fileName} - Code Changes Preview</span>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onAccept}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
          >
            ✅ Accept Changes
          </button>
          <button
            onClick={onReject}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#bb2d3b'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
          >
            ❌ Reject
          </button>
        </div>
      </div>

      {/* Diff Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Original Code Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{
            padding: '8px 16px',
            backgroundColor: '#2d1b1b',
            color: '#f85149',
            fontSize: '13px',
            fontWeight: '600',
            borderRight: '1px solid #333',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>➖</span>
            Original Code
          </div>
          <div style={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#1e1e1e',
            borderRight: '1px solid #333'
          }}>
            <div style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5' }}>
              {diffLines.map((line, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    minHeight: '20px',
                    backgroundColor: line.type === 'removed' || line.type === 'changed' ? '#4b1818' : 
                                   line.type === 'equal' ? 'transparent' : '#333333',
                    borderLeft: line.type === 'removed' || line.type === 'changed' ? '3px solid #f85149' : '3px solid transparent'
                  }}
                >
                  <div style={{
                    width: '40px',
                    padding: '0 8px',
                    color: '#666',
                    backgroundColor: '#252526',
                    textAlign: 'right',
                    fontSize: '11px',
                    userSelect: 'none'
                  }}>
                    {line.original ? line.lineNumber : ''}
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '0 12px',
                    color: line.type === 'removed' || line.type === 'changed' ? '#f85149' : '#d4d4d4',
                    whiteSpace: 'pre'
                  }}>
                    {line.original}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modified Code Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{
            padding: '8px 16px',
            backgroundColor: '#1b2d1b',
            color: '#3fb950',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>➕</span>
            Improved Code
          </div>
          <div style={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#1e1e1e'
          }}>
            <div style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5' }}>
              {diffLines.map((line, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    minHeight: '20px',
                    backgroundColor: line.type === 'added' || line.type === 'changed' ? '#1a3d1a' : 
                                   line.type === 'equal' ? 'transparent' : '#333333',
                    borderLeft: line.type === 'added' || line.type === 'changed' ? '3px solid #3fb950' : '3px solid transparent'
                  }}
                >
                  <div style={{
                    width: '40px',
                    padding: '0 8px',
                    color: '#666',
                    backgroundColor: '#252526',
                    textAlign: 'right',
                    fontSize: '11px',
                    userSelect: 'none'
                  }}>
                    {line.modified ? line.lineNumber : ''}
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '0 12px',
                    color: line.type === 'added' || line.type === 'changed' ? '#3fb950' : '#d4d4d4',
                    whiteSpace: 'pre'
                  }}>
                    {line.modified}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}