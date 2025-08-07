import React, { useState, useEffect, useRef } from 'react';
import CodeEditor from './components/CodeEditor';
import EnhancedToolbar from './components/Toolbar';
import ChatPanel from './components/ChatPanel';
import OutputPane from './components/OutputPane';
import ActivityBar from './components/ActivityBar';
import FileExplorer from './components/FileExplorer';
import AIChat from './components/AiChat';
import DiffView from './components/DiffView';
import StatusBar from './components/StatusBar';
import ExplanationPane from './components/ExplanationPane';
import { runPython } from './utils/pyodideRunner';
import { streamAgentExecution } from './utils/agentClient';

export default function App() {
  const [activeView, setActiveView] = useState('explorer');
  const [files, setFiles] = useState([
    { id: 1, name: 'main.py', content: 'priint("adfd")', language: 'python' },
    { id: 2, name: 'utils.py', content: '# Utility functions\n\ndef helper():\n    pass', language: 'python' },
  ]);
  const [activeFileId, setActiveFileId] = useState(1);
  const [output, setOutput] = useState('');
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentState, setAgentState] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [pendingCodeChange, setPendingCodeChange] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [agentMode, setAgentMode] = useState('explain');
  const [aiExplanation, setAiExplanation] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);
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

  // Add the missing acceptCodeChange function
  const acceptCodeChange = () => {
    if (pendingCodeChange) {
      handleCodeChange(pendingCodeChange.modified);
      setShowDiff(false);
      setPendingCodeChange(null);
      // Optionally show a success message
      setOutput('✅ Code changes accepted and applied');
    }
  };

  // Add the missing rejectCodeChange function
  const rejectCodeChange = () => {
    setShowDiff(false);
    setPendingCodeChange(null);
    setOutput('❌ Code changes rejected');
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
    setShowDiff(false);
    setPendingCodeChange(null);
    setShowExplanation(false);
    setAiExplanation('');

    // For chat mode, add thinking message
    if (mode === 'chat') {
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: '🤖 Thinking...', 
        timestamp: Date.now(),
        isThinking: true
      }]);
    }

    agentStreamRef.current = streamAgentExecution(
      instruction,
      activeFile.content,
      (update) => {
        setAgentState(update);
        
        // Handle completion based on mode
        if (update.task_complete && update.final_explanation) {
          if (mode === 'fix') {
            // Auto-apply for fix mode
            if (update.final_code) {
              handleCodeChange(update.final_code);
            }
            setAiExplanation(update.final_explanation);
            setShowExplanation(true);
          } else if (mode === 'explain') {
            // Show explanation and optionally diff for explain mode
            setAiExplanation(update.final_explanation);
            setShowExplanation(true);
            
            if (update.final_code && update.final_code !== activeFile.content) {
              setPendingCodeChange({
                original: activeFile.content,
                modified: update.final_code,
                explanation: update.final_explanation,
                fileName: activeFile.name
              });
              setShowDiff(true);
            }
          } else if (mode === 'chat') {
            // Update chat history
            setChatHistory(prev => {
              const newHistory = [...prev];
              const lastMessage = newHistory[newHistory.length - 1];
              if (lastMessage?.isThinking) {
                newHistory[newHistory.length - 1] = {
                  role: 'assistant',
                  content: update.final_explanation,
                  code: update.final_code,
                  timestamp: Date.now()
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
        if (mode === 'chat') {
          setChatHistory(prev => {
            const newHistory = [...prev];
            const lastMessage = newHistory[newHistory.length - 1];
            if (lastMessage?.isThinking) {
              newHistory[newHistory.length - 1] = {
                role: 'assistant',
                content: `❌ Sorry, I encountered an error: ${error.message}`,
                timestamp: Date.now()
              };
            }
            return newHistory;
          });
        } else {
          setAiExplanation(`❌ Agent Error: ${error.message}`);
          setShowExplanation(true);
        }
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
    const newMessage = {
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    setChatHistory(prev => [...prev, newMessage]);

    const lowerMessage = message.toLowerCase();

    const intents = [
      {
        name: 'code_fix',
        keywords: ['fix', 'error', 'bug', 'issue', 'problem', 'debug', 'crash', 'broken', 'not working', 'why doesn\'t'],
        shouldIncludeCode: true,
        systemPrompt: (file, message) =>
          `The user is reporting a problem with their code and asking for help fixing it.\n\nCurrent code:\n\`\`\`python\n${file.content}\n\`\`\`\n\nUser's message: "${message}"`
      },
      {
        name: 'code_explanation',
        keywords: ['explain', 'how does', 'what does', 'understand', 'meaning', 'clarify', 'why'],
        shouldIncludeCode: true,
        systemPrompt: (file, message) =>
          `The user wants an explanation of the following code:\n\`\`\`python\n${file.content}\n\`\`\`\n\nUser's message: "${message}"`
      },
      {
        name: 'feature_request',
        keywords: ['add', 'create', 'implement', 'build', 'enhance', 'support', 'make it do'],
        shouldIncludeCode: true,
        systemPrompt: (file, message) =>
          `The user wants to add or build a feature in their current codebase.\n\nCode:\n\`\`\`python\n${file.content}\n\`\`\`\n\nUser's message: "${message}"`
      },
      {
        name: 'code_review',
        keywords: ['review', 'feedback', 'evaluate', 'assess'],
        shouldIncludeCode: true,
        systemPrompt: (file, message) =>
          `The user is asking for feedback on their code.\n\nPlease review the following code and provide constructive suggestions:\n\`\`\`python\n${file.content}\n\`\`\`\n\nUser's message: "${message}"`
      },
      {
        name: 'general_greeting',
        keywords: ['hi', 'hello', 'hey', 'good morning', 'good evening'],
        shouldIncludeCode: false,
        systemPrompt: (_, message) =>
          `The user is greeting you. Respond in a friendly and conversational manner.\n\nUser's message: "${message}"`
      },
      {
        name: 'general_question',
        keywords: [],
        shouldIncludeCode: true,
        systemPrompt: (file, message) =>
          `The user has a general programming-related question. Provide helpful assistance.\n\nContext:\n\`\`\`python\n${file.content}\n\`\`\`\n\nUser's message: "${message}"`
      }
    ];

    const detectIntent = () => {
      for (let intent of intents) {
        for (let keyword of intent.keywords) {
          if (lowerMessage.includes(keyword)) {
            return intent;
          }
        }
      }
      return intents.find(i => i.name === 'general_question'); // fallback
    };

    const intent = detectIntent();
    const systemPrompt = intent.systemPrompt(activeFile, message);

    const chatInstruction = `
  You are a helpful AI assistant integrated into a developer's IDE.
  Your job is to assist with code-related questions, provide fixes, explain functionality, and help build features.

  ${systemPrompt}

  Please respond naturally and intelligently. If you include code in your response, ensure it's accurate, minimal, and tailored to their message.
  `.trim();

    executeAgentAction(chatInstruction, 'chat');
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

  const closeExplanation = () => {
    setShowExplanation(false);
    setAiExplanation('');
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
              {/* AI Explanation Section */}
              {showExplanation && (
                <ExplanationPane 
                  explanation={aiExplanation}
                  onClose={closeExplanation}
                  isLoading={isAgentRunning && (agentMode === 'explain' || agentMode === 'fix')}
                />
              )}
              
              {/* Output Section */}
              <div style={{ 
                padding: '8px 16px', 
                borderBottom: '1px solid #333', 
                background: '#252526', 
                fontSize: '14px', 
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>📟</span>
                Code Output
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <OutputPane 
                  output={output}
                />
              </div>
            </div>
          </div>
          
          <div style={{ flex: 1, borderLeft: '1px solid #333', backgroundColor: '#252526' }}>
            <ChatPanel 
              chatHistory={chatHistory}
              onSendMessage={handleChatMessage}
              isAgentRunning={isAgentRunning && agentMode === 'chat'}
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