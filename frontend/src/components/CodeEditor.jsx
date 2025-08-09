import React, { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

export default function CodeEditor({ code, onChange }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  useEffect(() => {
    if (monacoRef.current && editorRef.current) {
      registerPythonCompletionProvider(monacoRef.current, editorRef.current);
    }
  }, []);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Register the completion provider
    registerPythonCompletionProvider(monaco, editor);
    
    // Configure editor for better autocomplete experience
    editor.updateOptions({
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnCommitCharacter: true,
      acceptSuggestionOnEnter: 'on',
      tabCompletion: 'on',
      wordBasedSuggestions: true,
      quickSuggestions: {
        other: true,
        comments: false,
        strings: true
      },
      suggestSelection: 'first',
      snippetSuggestions: 'inline'
    });
  };

  return (
    <div style={{ height: '100%' }}>
      <Editor
        height="100%"
        language="python"
        value={code}
        onChange={(value) => onChange(value || '')}
        onMount={handleEditorDidMount}
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
          padding: { top: 10 },
          // Enhanced autocomplete settings
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnCommitCharacter: true,
          acceptSuggestionOnEnter: 'on',
          tabCompletion: 'on',
          wordBasedSuggestions: true,
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true
          },
          suggestSelection: 'first',
          snippetSuggestions: 'inline'
        }}
      />
    </div>
  );
}

// Register completion provider
function registerPythonCompletionProvider(monaco, editor) {
  // Dispose any existing providers
  if (window._pythonCompletionDisposable) {
    window._pythonCompletionDisposable.dispose();
  }

  window._pythonCompletionDisposable = monaco.languages.registerCompletionItemProvider('python', {
    triggerCharacters: ['.', '(', '[', '"', "'", ' '],
    
    async provideCompletionItems(model, position) {
      try {
        const lineContent = model.getLineContent(position.lineNumber);
        const wordInfo = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: wordInfo.startColumn,
          endColumn: wordInfo.endColumn
        };

        // Get context (last 10 lines)
        const startLine = Math.max(1, position.lineNumber - 10);
        const contextLines = [];
        for (let i = startLine; i < position.lineNumber; i++) {
          contextLines.push(model.getLineContent(i));
        }
        contextLines.push(lineContent.substring(0, position.column - 1));
        const context = contextLines.join('\n');

        // Call our completion API
        const suggestions = await getCompletionSuggestions(context, wordInfo.word, position);
        
        return {
          suggestions: suggestions.map(suggestion => ({
            label: suggestion.label,
            kind: getMonacoKind(monaco, suggestion.kind),
            insertText: suggestion.insertText || suggestion.label,
            insertTextRules: suggestion.isSnippet ? 
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
            documentation: suggestion.documentation,
            detail: suggestion.detail,
            range: range,
            sortText: suggestion.sortText || suggestion.label
          }))
        };
      } catch (error) {
        console.error('Completion error:', error);
        return { suggestions: [] };
      }
    }
  });
}

// Get suggestions from backend
async function getCompletionSuggestions(context, currentWord, position) {
  try {
    const response = await fetch('http://localhost:8000/completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        context: context,
        prefix: currentWord,
        line: position.lineNumber,
        column: position.column,
        language: 'python'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.suggestions || [];

  } catch (error) {
    console.warn('Completion API failed, using fallback:', error);
    return getFallbackCompletions(currentWord);
  }
}

// Fallback completions when API fails
function getFallbackCompletions(prefix) {
  const fallbacks = [
    // Python keywords
    { label: 'def', kind: 'Keyword', insertText: 'def ${1:function}(${2:args}):\n    ${3:pass}', isSnippet: true },
    { label: 'class', kind: 'Keyword', insertText: 'class ${1:Class}:\n    ${2:pass}', isSnippet: true },
    { label: 'if', kind: 'Keyword', insertText: 'if ${1:condition}:\n    ${2:pass}', isSnippet: true },
    { label: 'for', kind: 'Keyword', insertText: 'for ${1:item} in ${2:items}:\n    ${3:pass}', isSnippet: true },
    { label: 'while', kind: 'Keyword', insertText: 'while ${1:condition}:\n    ${2:pass}', isSnippet: true },
    { label: 'try', kind: 'Keyword', insertText: 'try:\n    ${1:pass}\nexcept Exception as e:\n    ${2:pass}', isSnippet: true },
    
    // Built-in functions
    { label: 'print', kind: 'Function', insertText: 'print(${1:value})' },
    { label: 'len', kind: 'Function', insertText: 'len(${1:obj})' },
    { label: 'range', kind: 'Function', insertText: 'range(${1:stop})' },
    { label: 'open', kind: 'Function', insertText: 'open(${1:file}, ${2:mode})' },
    
    // Common imports
    { label: 'import os', kind: 'Module', insertText: 'import os' },
    { label: 'import sys', kind: 'Module', insertText: 'import sys' },
    { label: 'import json', kind: 'Module', insertText: 'import json' },
  ];

  return fallbacks.filter(item => 
    item.label.toLowerCase().startsWith(prefix.toLowerCase())
  );
}

// Map completion kinds to Monaco kinds
function getMonacoKind(monaco, kind) {
  const kindMap = {
    'Method': monaco.languages.CompletionItemKind.Method,
    'Function': monaco.languages.CompletionItemKind.Function,
    'Constructor': monaco.languages.CompletionItemKind.Constructor,
    'Field': monaco.languages.CompletionItemKind.Field,
    'Variable': monaco.languages.CompletionItemKind.Variable,
    'Class': monaco.languages.CompletionItemKind.Class,
    'Interface': monaco.languages.CompletionItemKind.Interface,
    'Module': monaco.languages.CompletionItemKind.Module,
    'Property': monaco.languages.CompletionItemKind.Property,
    'Unit': monaco.languages.CompletionItemKind.Unit,
    'Value': monaco.languages.CompletionItemKind.Value,
    'Enum': monaco.languages.CompletionItemKind.Enum,
    'Keyword': monaco.languages.CompletionItemKind.Keyword,
    'Snippet': monaco.languages.CompletionItemKind.Snippet,
    'Text': monaco.languages.CompletionItemKind.Text,
    'File': monaco.languages.CompletionItemKind.File,
    'Reference': monaco.languages.CompletionItemKind.Reference,
    'Folder': monaco.languages.CompletionItemKind.Folder,
    'Constant': monaco.languages.CompletionItemKind.Constant,
    'Struct': monaco.languages.CompletionItemKind.Struct,
    'Event': monaco.languages.CompletionItemKind.Event,
    'Operator': monaco.languages.CompletionItemKind.Operator,
  };
  
  return kindMap[kind] || monaco.languages.CompletionItemKind.Text;
}