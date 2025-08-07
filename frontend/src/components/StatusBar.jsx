import React from 'react';

export default function StatusBar({ agentState, isAgentRunning, activeFile }) {
  const getAgentStatus = () => {
    if (isAgentRunning) return { text: 'AI Agent Running...', color: '#ffa500', icon: '🤖' };
    if (agentState?.task_complete) return { text: 'Task Complete', color: '#28a745', icon: '✅' };
    if (agentState?.task_failed) return { text: 'Task Failed', color: '#dc3545', icon: '❌' };
    return { text: 'Ready', color: '#007acc', icon: '⚡' };
  };

  const status = getAgentStatus();
  const metrics = agentState?.metrics || {};

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '6px 16px',
      backgroundColor: '#2a2a2e',
      borderTop: '1px solid #333',
      fontSize: '11px',
      color: '#888',
      height: '28px'
    }}>
      {/* Left Side - Status and Metrics */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Agent Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: status.color,
          fontWeight: '500'
        }}>
          {isAgentRunning ? (
            <div style={{
              width: '10px',
              height: '10px',
              backgroundColor: status.color,
              borderRadius: '50%',
              animation: 'pulse 1.5s infinite'
            }} />
          ) : (
            <span style={{ fontSize: '10px' }}>{status.icon}</span>
          )}
          <span>{status.text}</span>
        </div>

        {/* LLM Calls */}
        {metrics.llm_calls > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#61afef'
          }}>
            <span style={{ fontSize: '10px' }}>🧠</span>
            <span>{metrics.llm_calls} LLM calls</span>
          </div>
        )}

        {/* Searches */}
        {(metrics.internal_searches > 0 || metrics.external_searches > 0) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#c678dd'
          }}>
            <span style={{ fontSize: '10px' }}>🔍</span>
            <span>
              {metrics.internal_searches || 0}i + {metrics.external_searches || 0}e searches
            </span>
          </div>
        )}

        {/* Execution Time */}
        {metrics.total_execution_time > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#e5c07b'
          }}>
            <span style={{ fontSize: '10px' }}>⏱️</span>
            <span>{metrics.total_execution_time.toFixed(2)}s</span>
          </div>
        )}

        {/* Task Progress */}
        {agentState?.progress && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#98c379'
          }}>
            <span style={{ fontSize: '10px' }}>📊</span>
            <span>
              {agentState.progress.completed_steps}/{agentState.progress.total_steps} steps
            </span>
            <div style={{
              width: '40px',
              height: '4px',
              backgroundColor: '#333',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${agentState.progress.percentage}%`,
                height: '100%',
                backgroundColor: '#98c379',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Right Side - File Info and Language */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* File Info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: '#888'
        }}>
          <span style={{ fontSize: '10px' }}>📄</span>
          <span>{activeFile.name}</span>
          {activeFile.content && (
            <span style={{ color: '#666' }}>
              ({activeFile.content.split('\n').length} lines)
            </span>
          )}
        </div>

        {/* Language */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: '#007acc',
          fontWeight: '500'
        }}>
          <span style={{ fontSize: '10px' }}>🐍</span>
          <span>{activeFile.language || 'Python'}</span>
        </div>

        {/* Connection Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: '#28a745'
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            backgroundColor: '#28a745',
            borderRadius: '50%'
          }} />
          <span>Connected</span>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}