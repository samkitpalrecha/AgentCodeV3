import React from 'react';
import { Zap, Circle, CheckCircle, XCircle } from 'lucide-react';

export default function StatusBar({ agentState, isAgentRunning }) {
  const getAgentStatus = () => {
    if (!agentState) return 'Idle';
    if (isAgentRunning) return 'Running...';
    if (agentState.task_complete) return 'Task Complete';
    if (agentState.task_failed) return 'Task Failed';
    return 'Ready';
  };

  const getAgentStatusIcon = () => {
    if (isAgentRunning) return <Circle size={12} className="text-yellow-400 animate-pulse" />;
    if (agentState?.task_complete) return <CheckCircle size={12} className="text-green-400" />;
    if (agentState?.task_failed) return <XCircle size={12} className="text-red-400" />;
    return <Zap size={12} className="text-gray-400" />;
  };

  return (
    <div className="flex items-center justify-between px-4 py-1 text-xs bg-[#2a2a2e] border-t border-gray-800 text-gray-400">
      <div className="flex items-center space-x-4">
        <div className="flex items-center">
          {getAgentStatusIcon()}
          <span className="ml-1.5">{getAgentStatus()}</span>
        </div>
        
        {agentState?.complexity && (
          <div className="flex items-center">
            <span className="text-gray-500">Complexity:</span>
            <span className={`ml-1 font-medium ${
              agentState.complexity === 'low' ? 'text-green-400' :
              agentState.complexity === 'medium' ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {agentState.complexity.toUpperCase()}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        {agentState?.metrics?.execution_time && (
          <div className="flex items-center">
            <span className="text-gray-500">Time:</span>
            <span className="ml-1 font-medium">
              {agentState.metrics.execution_time.toFixed(2)}s
            </span>
          </div>
        )}
        
        {agentState?.metrics?.files_modified && (
          <div className="flex items-center">
            <span className="text-gray-500">Files:</span>
            <span className="ml-1 font-medium">
              {agentState.metrics.files_modified}
            </span>
          </div>
        )}
        
        <div className="flex items-center">
          <span className="text-gray-500">Python</span>
        </div>
      </div>
    </div>
  );
}