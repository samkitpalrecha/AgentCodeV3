import React from 'react';

export default function AgentPanel({ onExplain, loading, agentState }) {
  const progress = agentState?.progress?.percentage || 0;
  
  const lastInProgressStep = agentState?.plan_steps?.slice().reverse().find(s => s.status === 'in_progress');
  const lastLog = agentState?.execution_log?.[agentState.execution_log.length - 1];
  const currentStatusText = lastInProgressStep?.description || lastLog?.message || 'Initializing...';

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', color: '#ccc', gap: '16px' }}>
      <button 
        onClick={onExplain} 
        style={{
          padding: '10px 20px', background: loading ? '#be3838' : '#007acc', color: 'white',
          border: 'none', borderRadius: '4px', cursor: 'pointer',
          fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '8px', transition: 'background-color 0.3s'
        }}
      >
        {loading ? (
          <>
            <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255, 255, 255, 0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span>Agent Running... (Click to Stop)</span>
          </>
        ) : (
          <span>🤖 AI Explain & Improve</span>
        )}
      </button>

      {loading && (
        <div>
          <div style={{ width: '100%', background: '#333', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '6px', background: '#007acc', transition: 'width 0.3s ease' }} />
          </div>
          <p style={{ fontSize: '0.8rem', color: '#aaa', textAlign: 'center', marginTop: '4px', height: '2.4em', overflow: 'hidden' }}>
            {currentStatusText}
          </p>
        </div>
      )}

      <div style={{ borderTop: '1px solid #333', paddingTop: '12px', flex: 1, overflowY: 'auto' }}>
        <h4 style={{ margin: '0 0 12px 0' }}>Execution Plan</h4>
        {agentState?.plan_steps && agentState.plan_steps.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem' }}>
            {agentState.plan_steps.map(step => (
              <li key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', opacity: step.status === 'pending' ? 0.5 : 1 }}>
                {step.status === 'completed' && <span style={{ color: '#28a745', fontSize: '1.2em' }}>✓</span>}
                {step.status === 'in_progress' && <div style={{ width: '10px', height: '10px', background: '#007acc', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />}
                {step.status === 'pending' && <span style={{ color: '#666', fontSize: '1.2em' }}>○</span>}
                <span style={{ textDecoration: step.status === 'completed' ? 'line-through' : 'none', color: step.status === 'completed' ? '#666' : '#ccc' }}>
                  {step.description}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: '#666', fontSize: '0.9rem' }}>{loading ? 'Agent is generating a plan...' : 'Click the button to start.'}</p>
        )}
      </div>

      {agentState?.final_explanation && (
        <div style={{ borderTop: '1px solid #333', paddingTop: '12px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Final Explanation</h4>
            <p style={{ fontSize: '0.9rem', color: '#aaa', margin: 0, whiteSpace: 'pre-wrap' }}>
                {agentState.final_explanation}
            </p>
        </div>
      )}

       <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}