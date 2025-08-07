import React from 'react';

export default function EnhancedAgentPanel({ agentState, isAgentRunning, onExplain, onAutoFix }) {
  const progress = agentState?.progress?.percentage || 0;
  const lastInProgressStep = agentState?.plan_steps?.slice().reverse().find(s => s.status === 'in_progress');
  const lastLog = agentState?.execution_log?.[agentState.execution_log.length - 1];
  const currentStatusText = lastInProgressStep?.description || lastLog?.message || 'Ready to assist';

  const getStepIcon = (status) => {
    switch(status) {
      case 'completed':
        return <span style={{ color: '#28a745', fontSize: '16px' }}>✅</span>;
      case 'in_progress':
        return (
          <div style={{
            width: '12px',
            height: '12px',
            background: '#007acc',
            borderRadius: '50%',
            animation: 'pulse 1.5s infinite'
          }} />
        );
      case 'failed':
        return <span style={{ color: '#dc3545', fontSize: '16px' }}>❌</span>;
      default:
        return <span style={{ color: '#666', fontSize: '16px' }}>⭕</span>;
    }
  };

  const getMetricsDisplay = () => {
    if (!agentState?.metrics) return null;
    
    const { llm_calls, internal_searches, external_searches, total_execution_time } = agentState.metrics;
    
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        fontSize: '11px',
        color: '#888'
      }}>
        {llm_calls > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🤖</span>
            <span>{llm_calls} LLM calls</span>
          </div>
        )}
        {(internal_searches > 0 || external_searches > 0) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🔍</span>
            <span>{internal_searches + external_searches} searches</span>
          </div>
        )}
        {total_execution_time > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>⏱️</span>
            <span>{total_execution_time.toFixed(1)}s</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ 
      padding: '16px', 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      color: '#ccc', 
      gap: '20px' 
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid #333',
        paddingBottom: '12px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#fff'
      }}>
        🤖 AI Assistant Panel
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button 
          onClick={onExplain} 
          disabled={isAgentRunning}
          style={{
            padding: '12px 16px', 
            background: isAgentRunning ? '#4a4a4a' : '#6f42c1', 
            color: isAgentRunning ? '#888' : 'white',
            border: 'none', 
            borderRadius: '6px', 
            cursor: isAgentRunning ? 'not-allowed' : 'pointer',
            fontSize: '14px', 
            fontWeight: '600', 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'center', 
            gap: '8px', 
            transition: 'all 0.2s ease',
            boxShadow: isAgentRunning ? 'none' : '0 2px 4px rgba(111, 66, 193, 0.3)'
          }}
        >
          <span>🪄</span>
          <span>Explain & Improve</span>
        </button>

        <button 
          onClick={onAutoFix} 
          disabled={isAgentRunning}
          style={{
            padding: '12px 16px', 
            background: isAgentRunning ? '#4a4a4a' : '#dc3545', 
            color: isAgentRunning ? '#888' : 'white',
            border: 'none', 
            borderRadius: '6px', 
            cursor: isAgentRunning ? 'not-allowed' : 'pointer',
            fontSize: '14px', 
            fontWeight: '600', 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'center', 
            gap: '8px', 
            transition: 'all 0.2s ease',
            boxShadow: isAgentRunning ? 'none' : '0 2px 4px rgba(220, 53, 69, 0.3)'
          }}
        >
          <span>🐛</span>
          <span>Auto-Fix Issues</span>
        </button>
      </div>

      {/* Progress Section */}
      {isAgentRunning && (
        <div style={{
          padding: '16px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          border: '1px solid #333'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>
                Agent Progress
              </span>
              <span style={{ fontSize: '12px', color: '#007acc', fontWeight: '600' }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div style={{ 
              width: '100%', 
              background: '#333', 
              borderRadius: '4px', 
              overflow: 'hidden',
              height: '6px'
            }}>
              <div style={{ 
                width: `${progress}%`, 
                height: '100%', 
                background: 'linear-gradient(90deg, #007acc, #00a1ff)', 
                transition: 'width 0.5s ease',
                borderRadius: '4px'
              }} />
            </div>
          </div>
          
          <div style={{ 
            fontSize: '12px', 
            color: '#ccc', 
            textAlign: 'center',
            fontStyle: 'italic',
            minHeight: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {currentStatusText}
          </div>

          {/* Metrics */}
          {getMetricsDisplay()}
        </div>
      )}

      {/* Execution Plan */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h4 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '14px', 
          fontWeight: '600',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>📋</span>
          Execution Plan
        </h4>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {agentState?.plan_steps && agentState.plan_steps.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {agentState.plan_steps.map((step, index) => (
                <div 
                  key={step.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: step.status === 'in_progress' ? '#1a2b1a' : 
                                   step.status === 'completed' ? '#1a1a2b' : 
                                   '#1a1a1a',
                    border: step.status === 'in_progress' ? '1px solid #28a745' :
                           step.status === 'completed' ? '1px solid #007acc' :
                           '1px solid #333',
                    borderRadius: '6px',
                    opacity: step.status === 'pending' ? 0.6 : 1,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ marginTop: '2px' }}>
                    {getStepIcon(step.status)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: '13px',
                      color: step.status === 'completed' ? '#888' : '#ccc',
                      textDecoration: step.status === 'completed' ? 'line-through' : 'none',
                      fontWeight: step.status === 'in_progress' ? '600' : '400',
                      marginBottom: '4px'
                    }}>
                      {step.description}
                    </div>
                    {step.status === 'in_progress' && (
                      <div style={{
                        fontSize: '11px',
                        color: '#007acc',
                        fontWeight: '500'
                      }}>
                        Currently executing...
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#666',
                    fontWeight: '500'
                  }}>
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              color: '#666', 
              fontSize: '13px',
              fontStyle: 'italic',
              padding: '20px 0'
            }}>
              {isAgentRunning ? '🔄 Generating execution plan...' : '💡 Click a button above to start AI assistance'}
            </div>
          )}
        </div>
      </div>

      {/* Final Results */}
      {agentState?.final_explanation && !isAgentRunning && (
        <div style={{ 
          borderTop: '1px solid #333', 
          paddingTop: '16px',
          backgroundColor: '#0d1117',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #28a745'
        }}>
          <h4 style={{ 
            margin: '0 0 12px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: '#28a745',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>✨</span>
            AI Analysis Complete
          </h4>
          <div style={{ 
            fontSize: '12px', 
            color: '#ccc', 
            lineHeight: '1.5',
            maxHeight: '120px',
            overflowY: 'auto'
          }}>
            {agentState.final_explanation}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}