import React from 'react';

// Helper to format the node type for display
const formatNodeType = (node) => {
  return node.charAt(0).toUpperCase() + node.slice(1).toLowerCase();
};

// Helper to get node colors
const getNodeColor = (node) => {
  const colors = {
    'TRIAGE': '#e5c07b',
    'PLANNER': '#61afef', 
    'DEVELOPER': '#c678dd',
    'SIMPLE_INQUIRY': '#98c379'
  };
  return colors[node] || '#61afef';
};

export default function SmartOutputPane({ output, agentState, isAgentRunning, agentMode }) {
  // If agent is running and we have logs, show real-time execution
  if (isAgentRunning && agentState?.execution_log?.length > 0) {
    return (
      <div style={{ padding: '16px', fontFamily: 'monospace', fontSize: '13px' }}>
        <div style={{
          marginBottom: '16px',
          padding: '8px 12px',
          backgroundColor: '#1a1a2b',
          border: '1px solid #007acc',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            backgroundColor: '#007acc',
            borderRadius: '50%',
            animation: 'pulse 1.5s infinite'
          }} />
          <span style={{ color: '#007acc', fontWeight: '600' }}>
            🤖 Agent Executing - Real-time Logs
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {agentState.execution_log.slice(-15).map((log, i) => {
            let statusColor = '#d4d4d4';
            let bgColor = 'transparent';
            const nodeColor = getNodeColor(log.node);
            
            if (log.status === 'failed') {
              statusColor = '#f48771';
              bgColor = '#2d1b1b';
            } else if (log.node === 'DEVELOPER') {
              bgColor = '#1a1a2b';
            } else if (log.node === 'PLANNER') {
              bgColor = '#1a2b1a';
            }

            return (
              <div 
                key={i} 
                style={{ 
                  color: statusColor, 
                  marginBottom: '2px', 
                  display: 'flex', 
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '8px 12px',
                  backgroundColor: bgColor,
                  borderRadius: '4px',
                  border: bgColor !== 'transparent' ? '1px solid rgba(255,255,255,0.1)' : 'none'
                }}
              >
                <div style={{ 
                  color: nodeColor, 
                  fontWeight: '700',
                  minWidth: '90px',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {formatNodeType(log.node)}
                </div>
                <div style={{ flex: 1, lineHeight: '1.4' }}>
                  {log.message}
                </div>
                {log.details && Object.keys(log.details).length > 0 && (
                  <div style={{
                    fontSize: '10px',
                    color: '#666',
                    backgroundColor: '#333',
                    padding: '2px 6px',
                    borderRadius: '3px'
                  }}>
                    +{Object.keys(log.details).length}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        `}</style>
      </div>
    );
  }

  // Enhanced output display for completed tasks or regular output
  return (
    <div style={{ 
      padding: '16px', 
      fontFamily: 'monospace', 
      fontSize: '13px',
      lineHeight: '1.6'
    }}>
      {/* Output Header */}
      {output && (
        <div style={{
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          paddingBottom: '8px',
          borderBottom: '1px solid #333'
        }}>
          {output.startsWith('🔄') && (
            <div style={{ color: '#ffa500', fontWeight: '600' }}>⚡ Execution</div>
          )}
          {output.startsWith('✅') && (
            <div style={{ color: '#28a745', fontWeight: '600' }}>✅ Success</div>
          )}
          {output.startsWith('❌') && (
            <div style={{ color: '#dc3545', fontWeight: '600' }}>❌ Error</div>
          )}
          {output.startsWith('🤖') && (
            <div style={{ color: '#007acc', fontWeight: '600' }}>🤖 AI Response</div>
          )}
          {!output.match(/^[🔄✅❌🤖]/) && (
            <div style={{ color: '#888', fontWeight: '600' }}>📝 Output</div>
          )}
        </div>
      )}

      {/* Main Output Content */}
      <div style={{ 
        color: '#d4d4d4',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
        {output || (
          <div style={{ 
            color: '#666', 
            fontStyle: 'italic',
            textAlign: 'center',
            padding: '40px 20px'
          }}>
            💡 Output will appear here...
            <br />
            <span style={{ fontSize: '12px' }}>
              Run your code or use AI assistance to see results
            </span>
          </div>
        )}
      </div>

      {/* Additional Agent State Info */}
      {agentState && !isAgentRunning && (
        <div style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#0d1117',
          border: '1px solid #333',
          borderRadius: '6px'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#888',
            marginBottom: '8px',
            fontWeight: '600'
          }}>
            🔍 Agent Summary
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
            {agentState.task_complete && (
              <div style={{ color: '#28a745' }}>
                ✅ Task Completed
              </div>
            )}
            {agentState.task_failed && (
              <div style={{ color: '#dc3545' }}>
                ❌ Task Failed
              </div>
            )}
            {agentState.metrics?.llm_calls > 0 && (
              <div style={{ color: '#007acc' }}>
                🤖 {agentState.metrics.llm_calls} LLM calls
              </div>
            )}
            {agentState.metrics?.total_execution_time > 0 && (
              <div style={{ color: '#ffa500' }}>
                ⏱️ {agentState.metrics.total_execution_time.toFixed(1)}s
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}