import React from 'react';

// A helper to format the node type for display
const formatNodeType = (node) => {
  return node.charAt(0).toUpperCase() + node.slice(1).toLowerCase();
};

export default function OutputPane({ output, agentState }) {
  // If agentState and its log exist, display the formatted log.
  // Otherwise, fall back to the standard output prop (for pyodide or final explanation).
  const hasAgentLog = agentState?.execution_log?.length > 0;

  if (hasAgentLog) {
    return (
      <div>
        {agentState.execution_log.map((log, i) => {
          let color = '#d4d4d4';
          let nodeColor = '#61afef'; // Default for Planner
          if (log.node === 'DEVELOPER') nodeColor = '#c678dd';
          if (log.node === 'TRIAGE') nodeColor = '#e5c07b';
          if (log.status === 'failed') color = '#f48771';

          return (
            <div key={i} style={{ color, marginBottom: '4px', display: 'flex', alignItems: 'center' }}>
              <span style={{ 
                color: nodeColor, 
                fontWeight: 'bold',
                minWidth: '90px',
                textAlign: 'right',
                marginRight: '12px',
                fontSize: '0.8em'
              }}>
                {formatNodeType(log.node)}
              </span>
              <span>{log.message}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Display standard output or final explanation
  return (
    <div style={{ whiteSpace: 'pre-wrap' }}>
      {output}
    </div>
  );
}