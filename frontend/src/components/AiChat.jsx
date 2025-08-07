import React, { useState, useRef, useEffect } from 'react';

export default function AIChat({ chatHistory, onSendMessage, isAgentRunning }) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !isAgentRunning) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatMessageContent = (content) => {
    // Simple formatting for code blocks and newlines
    return content.split('\n').map((line, i) => (
      <div key={i}>
        {line.includes('```') ? (
          <code style={{
            backgroundColor: '#333',
            padding: '2px 6px',
            borderRadius: '3px',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}>
            {line.replace(/```/g, '')}
          </code>
        ) : line}
      </div>
    ));
  };

  const getMessageIcon = (role) => {
    return role === 'user' ? '👤' : '🤖';
  };

  const getMessageTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{
      width: '320px',
      backgroundColor: '#252526',
      borderRight: '1px solid #333',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #333',
        backgroundColor: '#2a2a2a',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          backgroundColor: '#007acc',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px'
        }}>
          🤖
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>
            AI Assistant
          </div>
          <div style={{ fontSize: '11px', color: '#888' }}>
            {isAgentRunning ? 'Thinking...' : 'Ready to help'}
          </div>
        </div>
        {isAgentRunning && (
          <div style={{
            marginLeft: 'auto',
            width: '12px',
            height: '12px',
            backgroundColor: '#28a745',
            borderRadius: '50%',
            animation: 'pulse 1.5s infinite'
          }} />
        )}
      </div>

      {/* Messages Container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {chatHistory.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: '#666',
            fontSize: '13px',
            fontStyle: 'italic',
            padding: '20px',
            border: '1px dashed #444',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>💬</div>
            Welcome! Ask me anything about your code or request help with:
            <div style={{ marginTop: '8px', fontSize: '12px', textAlign: 'left' }}>
              • Bug fixes and debugging<br />
              • Code explanations<br />
              • Feature implementations<br />
              • Best practices<br />
              • Performance optimization
            </div>
          </div>
        )}

        {chatHistory.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
            }}
          >
            {/* Avatar */}
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              backgroundColor: msg.role === 'user' ? '#6f42c1' : '#007acc',
              color: 'white',
              flexShrink: 0
            }}>
              {getMessageIcon(msg.role)}
            </div>

            {/* Message Content */}
            <div style={{
              flex: 1,
              maxWidth: '85%'
            }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '13px',
                lineHeight: '1.4',
                backgroundColor: msg.role === 'user' ? '#6f42c1' : '#333',
                color: msg.role === 'user' ? 'white' : '#d4d4d4',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                {formatMessageContent(msg.content)}
                
                {/* Show code snippet if available */}
                {msg.code && msg.code !== msg.content && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px',
                    backgroundColor: msg.role === 'user' ? '#5a359a' : '#1e1e1e',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.code}</pre>
                  </div>
                )}
              </div>
              
              {/* Timestamp */}
              <div style={{
                fontSize: '10px',
                color: '#666',
                marginTop: '4px',
                textAlign: msg.role === 'user' ? 'right' : 'left'
              }}>
                {getMessageTime(msg.timestamp)}
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} style={{
        padding: '16px',
        borderTop: '1px solid #333',
        backgroundColor: '#2a2a2a'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isAgentRunning ? 'AI is thinking...' : 'Ask me anything about your code...'}
            disabled={isAgentRunning}
            style={{
              flex: 1,
              minHeight: '20px',
              maxHeight: '80px',
              padding: '10px 12px',
              backgroundColor: '#333',
              border: '1px solid #444',
              borderRadius: '8px',
              color: '#d4d4d4',
              fontSize: '13px',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => e.target.style.borderColor = '#007acc'}
            onBlur={(e) => e.target.style.borderColor = '#444'}
          />
          <button
            type="submit"
            disabled={isAgentRunning || !message.trim()}
            style={{
              padding: '10px 12px',
              backgroundColor: isAgentRunning || !message.trim() ? '#444' : '#007acc',
              color: isAgentRunning || !message.trim() ? '#888' : 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isAgentRunning || !message.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              if (!isAgentRunning && message.trim()) {
                e.target.style.backgroundColor = '#005a9e';
              }
            }}
            onMouseOut={(e) => {
              if (!isAgentRunning && message.trim()) {
                e.target.style.backgroundColor = '#007acc';
              }
            }}
          >
            {isAgentRunning ? (
              <div style={{
                width: '14px',
                height: '14px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTopColor: '#888',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            ) : (
              <span style={{ fontSize: '14px' }}>➤</span>
            )}
          </button>
        </div>

        <div style={{
          fontSize: '10px',
          color: '#666',
          marginTop: '8px',
          textAlign: 'center'
        }}>
          Press Enter to send • Shift+Enter for new line
        </div>
      </form>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}