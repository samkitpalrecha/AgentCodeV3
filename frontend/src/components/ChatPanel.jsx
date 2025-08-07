import React, { useState, useRef, useEffect } from 'react';

export default function ChatPanel({ chatHistory, onSendMessage, isAgentRunning }) {
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
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#252526'
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #333',
        backgroundColor: '#2a2a2a',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          backgroundColor: '#007acc',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px'
        }}>
          🤖
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#fff' }}>
            AI Assistant
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            {isAgentRunning ? 'Thinking...' : 'Ask me anything!'}
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
            padding: '24px 16px',
            border: '2px dashed #444',
            borderRadius: '12px',
            backgroundColor: '#1a1a1a'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>💬</div>
            <div style={{ fontWeight: '600', marginBottom: '8px', color: '#ccc' }}>
              Hi there! I'm your AI assistant 👋
            </div>
            <div style={{ fontSize: '12px', lineHeight: '1.4', textAlign: 'left' }}>
              I can help you with:
              <div style={{ marginTop: '8px', paddingLeft: '8px' }}>
                • General programming questions<br />
                • Code explanations & reviews<br />
                • Bug fixes and debugging<br />
                • Feature implementations<br />
                • Best practices & optimization<br />
                • Or just casual conversation!
              </div>
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
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
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
                borderRadius: '16px',
                fontSize: '14px',
                lineHeight: '1.5',
                backgroundColor: msg.role === 'user' ? '#6f42c1' : '#333',
                color: msg.role === 'user' ? 'white' : '#d4d4d4',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                position: 'relative'
              }}>
                {/* Thinking indicator */}
                {msg.isThinking && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#007acc'
                  }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(0, 122, 204, 0.3)',
                      borderTopColor: '#007acc',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Analyzing your code...
                  </div>
                )}
                
                {!msg.isThinking && formatMessageContent(msg.content)}
                
                {/* Show code snippet if available */}
                {msg.code && msg.code !== msg.content && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: msg.role === 'user' ? '#5a359a' : '#1e1e1e',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    overflowX: 'auto'
                  }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.code}</pre>
                  </div>
                )}
                
                {/* Message tail */}
                <div style={{
                  position: 'absolute',
                  bottom: '-6px',
                  [msg.role === 'user' ? 'right' : 'left']: '16px',
                  width: '12px',
                  height: '12px',
                  backgroundColor: msg.role === 'user' ? '#6f42c1' : '#333',
                  transform: 'rotate(45deg)'
                }} />
              </div>
              
              {/* Timestamp */}
              <div style={{
                fontSize: '10px',
                color: '#666',
                marginTop: '6px',
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
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isAgentRunning ? 'AI is thinking...' : 'Ask me anything - code help, general questions, or just chat!'}
            disabled={isAgentRunning}
            style={{
              flex: 1,
              minHeight: '44px',
              maxHeight: '120px',
              padding: '12px 16px',
              backgroundColor: '#333',
              border: '1px solid #444',
              borderRadius: '12px',
              color: '#d4d4d4',
              fontSize: '14px',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: '1.4'
            }}
            onFocus={(e) => e.target.style.borderColor = '#007acc'}
            onBlur={(e) => e.target.style.borderColor = '#444'}
          />
          <button
            type="submit"
            disabled={isAgentRunning || !message.trim()}
            style={{
              padding: '12px 16px',
              backgroundColor: isAgentRunning || !message.trim() ? '#444' : '#007acc',
              color: isAgentRunning || !message.trim() ? '#888' : 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: isAgentRunning || !message.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              minWidth: '48px',
              height: '44px'
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
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTopColor: '#888',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            ) : (
              <span style={{ fontSize: '16px' }}>🚀</span>
            )}
          </button>
        </div>

        <div style={{
          fontSize: '11px',
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