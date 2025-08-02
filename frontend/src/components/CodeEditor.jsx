import React from 'react';
import Editor from '@monaco-editor/react';

export default function CodeEditor({ code, onChange }) {
  return (
    <div style={{ height: '100%' }}>
      <Editor
        height="100%"
        language="python"
        value={code}
        onChange={(value) => onChange(value || '')}
        theme="vs-dark"
        options={{
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 14,
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          glyphMargin: false,
          folding: true,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          matchBrackets: 'always',
          wordWrap: 'on',
          smoothScrolling: true,
          padding: { top: 10 }
        }}
      />
    </div>
  );
}