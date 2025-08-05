import React, { useState, useEffect, useRef } from 'react';
import CodeEditor from './components/CodeEditor';
import Toolbar from './components/Toolbar';
import AgentPanel from './components/AgentPanel';
import OutputPane from './components/OutputPane';
import ActivityBar from './components/ActivityBar';
import FileExplorer from './components/FileExplorer';
import { runPython } from './utils/pyodideRunner';
import { streamAgentExecution } from './utils/agentClient';

export default function App() {
  const [activeView, setActiveView] = useState('explorer');
  const [files, setFiles] = useState([
    { id: 1, name: 'main.py', content: 'priint("adfd")' },
    { id: 2, name: 'utils.py', content: '# Utility functions' },
  ]);
  const [activeFileId, setActiveFileId] = useState(1);
  const [output, setOutput] = useState('Output will appear here...');
  const [isStreaming, setIsStreaming] = useState(false);
  
  // This state will hold the entire agent object from the backend
  const [agentState, setAgentState] = useState(null);
  const agentStreamRef = useRef(null);

  const activeFile = files.find(file => file.id === activeFileId) || files[0];

  const handleCodeChange = (newCode) => {
    setFiles(files.map(file => 
      file.id === activeFileId ? { ...file, content: newCode } : file
    ));
  };

  const handleRunCode = async () => {
    setOutput('Running Python code...');
    const result = await runPython(activeFile.content);
    setOutput(result);
  };

  const handleExplainAndImprove = () => {
    if (isStreaming) {
      agentStreamRef.current?.close();
      setIsStreaming(false);
      return;
    }

    setIsStreaming(true);
    setAgentState(null); // Reset previous state
    setOutput(''); // Clear old output

    agentStreamRef.current = streamAgentExecution(
      "Explain and improve this code",
      activeFile.content,
      (update) => {
        // This is called for every update from the agent
        setAgentState(update);
        
        // If the agent provides a final explanation, show it in the output pane
        if (update.final_explanation) {
            setOutput(update.final_explanation);
        }

        // **CODE REPLACEMENT LOGIC**
        // If the task is complete and there's final code, update the editor immediately.
        if (update.task_complete && update.final_code) {
          handleCodeChange(update.final_code);
          setIsStreaming(false); // Stop streaming visuals once complete
        }
      },
      (error) => {
        // This is called if an error occurs
        console.error("Agent stream error:", error);
        setOutput(`Agent Error: ${error.message}`);
        setIsStreaming(false);
      },
      () => {
        // This is called when the stream connection itself closes.
        setIsStreaming(false);
      }
    );
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#1e1e1e', color: '#d4d4d4' }}>
      <ActivityBar activeView={activeView} setActiveView={setActiveView} />
      {activeView === 'explorer' && <FileExplorer files={files} activeFileId={activeFileId} setActiveFileId={setActiveFileId} />}
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Toolbar onRun={handleRunCode} />
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 3, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1 }}>
              <CodeEditor code={activeFile.content} onChange={handleCodeChange} />
            </div>
            <div style={{
              height: '40%',
              borderTop: '1px solid #333',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#181818'
            }}>
               <div style={{ padding: '8px', borderBottom: '1px solid #333', background: '#252526' }}>
                Output
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px', fontFamily: 'monospace' }}>
                <OutputPane output={output} agentState={agentState} />
              </div>
            </div>
          </div>
          <div style={{ flex: 1, borderLeft: '1px solid #333', backgroundColor: '#252526' }}>
            <AgentPanel 
              onExplain={handleExplainAndImprove} 
              loading={isStreaming}
              agentState={agentState}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
