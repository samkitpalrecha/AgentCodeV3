import React, { useState, useEffect, useRef } from 'react';
import CodeEditor from './components/CodeEditor';
import Toolbar from './components/Toolbar';
import AgentPanel from './components/AgentPanel';
import OutputPane from './components/OutputPane';
import ActivityBar from './components/ActivityBar';
import FileExplorer from './components/FileExplorer';
import { runPython } from './utils/pyodideRunner';
import { callAgent, streamAgentExecution } from './utils/agentClient';

export default function App() {
  const [activeView, setActiveView] = useState('explorer');
  const [files, setFiles] = useState([
    { id: 1, name: 'main.py', content: '# Write Python here' },
    { id: 2, name: 'utils.py', content: '# Utility functions' },
    { id: 3, name: 'config.py', content: '# Configuration settings' }
  ]);
  const [activeFileId, setActiveFileId] = useState(1);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  
  const activeFile = files.find(file => file.id === activeFileId) || files[0];
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleRun = async () => {
    setLoading(true);
    setOutput('Running…');
    try {
      const result = await runPython(activeFile.content);
      setOutput(result);
    } catch (err) {
      setOutput(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExplain = async () => {
    if (streaming) return;
    
    setLoading(true);
    setStreaming(true);
    setOutput('Starting agent execution...');
    setProgress(0);
    setCurrentStep('');
    
    try {
      await streamAgentExecution(
        activeFile.content, 
        'Explain and improve this code',
        (update) => {
          if (!isMounted.current) return;
          
          switch (update.status) {
            case 'processing':
              setProgress(update.progress_percentage);
              setCurrentStep(update.current_step || '');
              if (update.logs && update.logs.length > 0) {
                setOutput(update.logs.join('\n'));
              }
              break;
              
            case 'completed':
              updateFileContent(activeFileId, update.final_code);
              setOutput(
                (update.execution_log || []).join('\n') || 
                'Execution completed successfully'
              );
              setProgress(100);
              setCurrentStep('Completed');
              setStreaming(false);
              setLoading(false);
              break;
              
            case 'failed':
            case 'error':
              setOutput(`Error: ${update.error_message || 'Agent execution failed'}`);
              setProgress(0);
              setCurrentStep('Failed');
              setStreaming(false);
              setLoading(false);
              break;
          }
        }
      );
    } catch (err) {
      setOutput(`Error: ${err.message}`);
      setStreaming(false);
      setLoading(false);
    }
  };

  const updateFileContent = (fileId, newContent) => {
    setFiles(files.map(file => 
      file.id === fileId ? {...file, content: newContent} : file
    ));
  };

  const createNewFile = () => {
    const newId = Math.max(0, ...files.map(f => f.id)) + 1;
    const newFile = {
      id: newId,
      name: `new_${newId}.py`,
      content: '# New Python file'
    };
    setFiles([...files, newFile]);
    setActiveFileId(newId);
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      fontFamily: 'Segoe UI, Roboto, monospace',
      backgroundColor: '#1e1e1e',
      color: '#d4d4d4'
    }}>
      {/* Activity Bar */}
      <ActivityBar activeView={activeView} setActiveView={setActiveView} />
      
      {/* File Explorer */}
      {activeView === 'explorer' && (
        <FileExplorer 
          files={files}
          activeFileId={activeFileId}
          setActiveFileId={setActiveFileId}
          onCreateFile={createNewFile}
        />
      )}
      
      {/* Main Content Area */}
      <div style={{ 
        flex: 1, 
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Toolbar */}
        <Toolbar onRun={handleRun} />
        
        {/* Agent Panel with Progress */}
        <div style={{ 
          height: '200px', 
          borderBottom: '1px solid #333',
          padding: '0.5rem'
        }}>
          <AgentPanel 
            code={activeFile.content} 
            onExplain={handleExplain} 
            loading={loading || streaming}
            progress={progress}
            currentStep={currentStep}
          />
        </div>
        
        {/* Editor and Output Container */}
        <div style={{ 
          flex: 1, 
          display: 'flex',
          overflow: 'hidden'
        }}>
          {/* Code Editor */}
          <div style={{ 
            flex: 1, 
            backgroundColor: '#1e1e1e', 
            overflow: 'hidden'
          }}>
            <CodeEditor 
              code={activeFile.content} 
              onChange={(value) => updateFileContent(activeFileId, value)} 
            />
          </div>
          
          {/* Output Panel */}
          <div style={{
            width: '40%',
            minWidth: '300px',
            borderLeft: '1px solid #333',
            backgroundColor: '#1e1e1e',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              margin: '1rem',
              padding: '0.5rem',
              borderBottom: '1px solid #444'
            }}>
              <h3 style={{ 
                color: '#fff',
                margin: 0
              }}>
                Output
              </h3>
              {streaming && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#007acc',
                    animation: 'pulse 1.5s infinite'
                  }} />
                  <span style={{ fontSize: '0.9rem' }}>Agent Running</span>
                </div>
              )}
            </div>
            <div style={{
              padding: '1rem',
              flex: 1,
              overflowY: 'auto',
              backgroundColor: '#000',
              fontFamily: 'monospace',
              fontSize: '0.95rem'
            }}>
              <OutputPane output={output} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Animation styles */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}