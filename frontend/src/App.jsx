import React, { useState, useEffect, useRef } from 'react';
import CodeEditor from './components/CodeEditor';
import EnhancedToolbar from './components/Toolbar';
import EnhancedAgentPanel from './components/AgentPanel';
import SmartOutputPane from './components/OutputPane';
import ActivityBar from './components/ActivityBar';
import FileExplorer from './components/FileExplorer';
import AIChat from './components/AiChat';
import DiffView from './components/DiffView';
import StatusBar from './components/StatusBar';
import { runPython } from './utils/pyodideRunner';
import { streamAgentExecution } from './utils/agentClient';

export default function App() {
  const [activeView, setActiveView] = useState('explorer');
  const [files, setFiles] = useState([
    { id: 1, name: 'main.py', content: 'priint("adfd")', language: 'python' },
    { id: 2, name: 'utils.py', content: '# Utility functions\n\ndef helper():\n    pass', language: 'python' },
  ]);
  const [activeFileId, setActiveFileId] = useState(1);
  const [output, setOutput] = useState('Output will appear here...');
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentState, setAgentState] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [pendingCodeChange, setPendingCodeChange] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [agentMode, setAgentMode] = useState('explain'); // 'explain', 'fix', 'chat'
  const agentStreamRef = useRef(null);

  const activeFile = files.find(file => file.id === activeFileId) || files[0];

  const handleCodeChange = (newCode) => {
    setFiles(files.map(file => 
      file.id === activeFileId ? { ...file, content: newCode } : file
    ));
  };

  const handleRunCode = async () => {
    setOutput('🔄 Running Python code...');
    try {
      const result = await runPython(activeFile.content);
      setOutput(result);
    } catch (error) {
      setOutput(`❌ Error: ${error.message}`);
    }
  };

  const executeAgentAction = (instruction, mode = 'explain') => {
    if (isAgentRunning) {
      agentStreamRef.current?.close();
      setIsAgentRunning(false);
      return;
    }

    setIsAgentRunning(true);
    setAgentState(null);
    setAgentMode(mode);
    setOutput('🤖 Agent is analyzing your code...');
    setShowDiff(false);
    setPendingCodeChange(null);

    agentStreamRef.current = streamAgentExecution(
      instruction,
      activeFile.content,
      (update) => {
        setAgentState(update);
        
        // Update output with final explanation
        if (update.final_explanation) {
          setOutput(update.final_explanation);
        }

        // Handle completion based on mode
        if (update.task_complete && update.final_code) {
          if (mode === 'fix') {
            // Auto-apply for fix mode
            handleCodeChange(update.final_code);
            setOutput(`✅ Code automatically fixed!\n\n${update.final_explanation}`);
          } else if (mode === 'explain') {
            // Show diff for explain mode
            setPendingCodeChange({
              original: activeFile.content,
              modified: update.final_code,
              explanation: update.final_explanation,
              fileName: activeFile.name
            });
            setShowDiff(true);
          } else if (mode === 'chat') {
            // Update chat history
            setChatHistory(prev => {
              const newHistory = [...prev];
              const lastMessage = newHistory[newHistory.length - 1];
              if (lastMessage?.role === 'assistant' && lastMessage.content.includes('🤖 Thinking...')) {
                newHistory[newHistory.length - 1] = {
                  ...lastMessage,
                  content: update.final_explanation,
                  code: update.final_code
                };
              }
              return newHistory;
            });
          }
          setIsAgentRunning(false);
        }
      },
      (error) => {
        console.error("Agent stream error:", error);
        setOutput(`❌ Agent Error: ${error.message}`);
        setIsAgentRunning(false);
      },
      () => {
        setIsAgentRunning(false);
      }
    );
  };

  const handleExplainAndImprove = () => {
    executeAgentAction("Explain and improve this code", 'explain');
  };

  const handleAutoFix = () => {
    executeAgentAction("Fix any bugs or issues in this code and apply changes automatically", 'fix');
  };

  const handleChatMessage = (message) => {
    const newMessage = { role: 'user', content: message, timestamp: Date.now() };
    setChatHistory(prev => [...prev, newMessage]);
    
    // Add agent response placeholder
    setChatHistory(prev => [...prev, { role: 'assistant', content: '🤖 Thinking...', timestamp: Date.now() }]);
    
    // Execute agent with chat context
    executeAgentAction(`User question: ${message}. Please provide a helpful response based on the current code context.`, 'chat');
  };

  const acceptCodeChange = () => {
    if (pendingCodeChange) {
      handleCodeChange(pendingCodeChange.modified);
      setShowDiff(false);
      setPendingCodeChange(null);
      setOutput(`✅ Code changes accepted and applied!\n\n${pendingCodeChange.explanation}`);
    }
  };

  const rejectCodeChange = () => {
    setShowDiff(false);
    setPendingCodeChange(null);
    setOutput('❌ Code changes rejected. Your original code remains unchanged.');
  };

  const createNewFile = () => {
    const newId = Math.max(...files.map(f => f.id)) + 1;
    const newFile = {
      id: newId,
      name: `file${newId}.py`,
      content: '# New Python file\nprint("Hello, World!")\n',
      language: 'python'
    };
    setFiles([...files, newFile]);
    setActiveFileId(newId);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#1e1e1e', color: '#d4d4d4', fontFamily: 'system-ui, sans-serif' }}>
      <ActivityBar 
        activeView={activeView} 
        setActiveView={setActiveView}
        showChat={showChat}
        setShowChat={setShowChat}
      />
      
      {activeView === 'explorer' && (
        <FileExplorer 
          files={files}
          activeFileId={activeFileId}
          setActiveFileId={setActiveFileId}
          onCreateFile={createNewFile}
        />
      )}
      
      {showChat && (
        <AIChat
          chatHistory={chatHistory}
          onSendMessage={handleChatMessage}
          isAgentRunning={isAgentRunning && agentMode === 'chat'}
        />
      )}
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <EnhancedToolbar 
          onRun={handleRunCode}
          onExplain={handleExplainAndImprove}
          onAutoFix={handleAutoFix}
          isAgentRunning={isAgentRunning}
          activeFileName={activeFile.name}
        />
        
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 3, display: 'flex', flexDirection: 'column' }}>
            {showDiff && pendingCodeChange ? (
              <DiffView
                original={pendingCodeChange.original}
                modified={pendingCodeChange.modified}
                explanation={pendingCodeChange.explanation}
                fileName={pendingCodeChange.fileName}
                onAccept={acceptCodeChange}
                onReject={rejectCodeChange}
              />
            ) : (
              <div style={{ flex: 1 }}>
                <CodeEditor code={activeFile.content} onChange={handleCodeChange} />
              </div>
            )}
            
            <div style={{
              height: '40%',
              borderTop: '1px solid #333',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#181818'
            }}>
               <div style={{ padding: '8px 16px', borderBottom: '1px solid #333', background: '#252526', fontSize: '14px', fontWeight: '600' }}>
                Output
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <SmartOutputPane 
                  output={output}
                  agentState={agentState}
                  isAgentRunning={isAgentRunning}
                  agentMode={agentMode}
                />
              </div>
            </div>
          </div>
          
          <div style={{ flex: 1, borderLeft: '1px solid #333', backgroundColor: '#252526' }}>
            <EnhancedAgentPanel 
              agentState={agentState}
              isAgentRunning={isAgentRunning}
              onExplain={handleExplainAndImprove}
              onAutoFix={handleAutoFix}
            />
          </div>
        </div>
        
        <StatusBar 
          agentState={agentState}
          isAgentRunning={isAgentRunning}
          activeFile={activeFile}
        />
      </div>
    </div>
  );
}