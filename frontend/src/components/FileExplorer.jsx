import React from 'react';

export default function FileExplorer({ 
  files, 
  activeFileId, 
  setActiveFileId,
  onCreateFile
}) {
  return (
    <div style={{
      width: '250px',
      backgroundColor: '#252526',
      color: '#ccc',
      borderRight: '1px solid #333',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        fontWeight: '600',
        fontSize: '14px',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>EXPLORER</span>
        <button 
          onClick={onCreateFile}
          style={{
            background: 'none',
            border: 'none',
            color: '#ccc',
            cursor: 'pointer',
            fontSize: '18px'
          }}
          title="New File"
        >
          +
        </button>
      </div>
      
      {/* Files Container */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        <div style={{
          padding: '4px 16px',
          color: '#bbb',
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          WORKSPACE
        </div>
        
        {files.map(file => (
          <div
            key={file.id}
            onClick={() => setActiveFileId(file.id)}
            style={{
              padding: '6px 16px 6px 32px',
              background: activeFileId === file.id ? '#2a2d2e' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13.5px',
              position: 'relative'
            }}
          >
            <span style={{ color: activeFileId === file.id ? '#4ec9b0' : '#c586c0' }}>
              {file.name.endsWith('.py') ? '🐍' : '📄'}
            </span>
            <span style={{ 
              color: activeFileId === file.id ? '#fff' : '#ccc',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {file.name}
            </span>
            {activeFileId === file.id && (
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
      </div>
    </div>
  );
}