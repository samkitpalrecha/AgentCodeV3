import re
import ast
import keyword
import builtins
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import json

from groq import Groq
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Pydantic models
class CompletionRequest(BaseModel):
    context: str
    prefix: str
    line: int
    column: int
    language: str = "python"
    max_completions: int = 10

class CompletionSuggestion(BaseModel):
    label: str
    kind: str
    insertText: str
    documentation: Optional[str] = None
    detail: Optional[str] = None
    sortText: Optional[str] = None
    isSnippet: bool = False

class CompletionResponse(BaseModel):
    suggestions: List[CompletionSuggestion]
    cached: bool = False
    provider: str = "groq-llama"

class CodeCompletionService:
    def __init__(self, groq_api_key: str = None):
        self.cache = {}
        self.cache_timeout = timedelta(minutes=5)
        
        # Initialize Groq
        if groq_api_key:
            self.client = Groq(api_key=groq_api_key)
            self.model_name = "llama-3.1-8b-instant"
        else:
            self.client = None
            logger.warning("No Groq API key provided, using built-in completions only")
        
        # Python built-ins
        self.python_builtins = set(dir(builtins)) | set(keyword.kwlist)
        
        # Common patterns
        self.code_snippets = {
            'main': {
                'label': 'if __name__ == "__main__":',
                'insertText': 'if __name__ == "__main__":\n    ${1:pass}',
                'kind': 'Snippet',
                'documentation': 'Main execution guard'
            },
            'class': {
                'label': 'class',
                'insertText': 'class ${1:ClassName}:\n    def __init__(self):\n        ${2:pass}',
                'kind': 'Snippet',
                'documentation': 'Class definition with constructor'
            },
            'function': {
                'label': 'def',
                'insertText': 'def ${1:function_name}(${2:args}):\n    """${3:Description}"""\n    ${4:pass}',
                'kind': 'Snippet',
                'documentation': 'Function definition with docstring'
            },
            'try': {
                'label': 'try',
                'insertText': 'try:\n    ${1:pass}\nexcept ${2:Exception} as e:\n    ${3:print(f"Error: {e}")}',
                'kind': 'Snippet',
                'documentation': 'Try-except block'
            },
            'for': {
                'label': 'for',
                'insertText': 'for ${1:item} in ${2:iterable}:\n    ${3:pass}',
                'kind': 'Snippet',
                'documentation': 'For loop'
            },
            'while': {
                'label': 'while',
                'insertText': 'while ${1:condition}:\n    ${2:pass}',
                'kind': 'Snippet',
                'documentation': 'While loop'
            },
            'with': {
                'label': 'with',
                'insertText': 'with open(${1:"filename"}, ${2:"r"}) as f:\n    ${3:content = f.read()}',
                'kind': 'Snippet',
                'documentation': 'File handling with context manager'
            }
        }
        
        # Common imports
        self.common_imports = [
            {'label': 'import os', 'kind': 'Module', 'documentation': 'Operating system interface'},
            {'label': 'import sys', 'kind': 'Module', 'documentation': 'System parameters'},
            {'label': 'import json', 'kind': 'Module', 'documentation': 'JSON encoder/decoder'},
            {'label': 'import requests', 'kind': 'Module', 'documentation': 'HTTP library'},
            {'label': 'import datetime', 'kind': 'Module', 'documentation': 'Date and time utilities'},
            {'label': 'import numpy as np', 'kind': 'Module', 'documentation': 'NumPy library'},
            {'label': 'import pandas as pd', 'kind': 'Module', 'documentation': 'Pandas data analysis'},
            {'label': 'from typing import List, Dict, Optional', 'kind': 'Module', 'documentation': 'Type hints'},
        ]
        
        # Built-in functions with snippets
        self.builtin_functions = [
            {'label': 'print', 'insertText': 'print(${1:value})', 'kind': 'Function', 'documentation': 'Print to stdout'},
            {'label': 'len', 'insertText': 'len(${1:obj})', 'kind': 'Function', 'documentation': 'Get length of object'},
            {'label': 'range', 'insertText': 'range(${1:stop})', 'kind': 'Function', 'documentation': 'Generate sequence of numbers'},
            {'label': 'enumerate', 'insertText': 'enumerate(${1:iterable})', 'kind': 'Function', 'documentation': 'Add counter to iterable'},
            {'label': 'zip', 'insertText': 'zip(${1:iter1}, ${2:iter2})', 'kind': 'Function', 'documentation': 'Combine iterables'},
            {'label': 'map', 'insertText': 'map(${1:function}, ${2:iterable})', 'kind': 'Function', 'documentation': 'Apply function to iterable'},
            {'label': 'filter', 'insertText': 'filter(${1:function}, ${2:iterable})', 'kind': 'Function', 'documentation': 'Filter iterable'},
            {'label': 'sorted', 'insertText': 'sorted(${1:iterable})', 'kind': 'Function', 'documentation': 'Return sorted list'},
            {'label': 'open', 'insertText': 'open(${1:"filename"}, ${2:"r"})', 'kind': 'Function', 'documentation': 'Open file'},
        ]

    async def get_completions(self, request: CompletionRequest) -> CompletionResponse:
        # Check cache
        cache_key = f"{hash(request.context[-200:])}-{request.prefix}-{request.line}"
        if cache_key in self.cache:
            cached_result, timestamp = self.cache[cache_key]
            if datetime.now() - timestamp < self.cache_timeout:
                return CompletionResponse(suggestions=cached_result, cached=True)

        suggestions = []
        
        # Get different types of completions
        suggestions.extend(self._get_builtin_completions(request.prefix))
        suggestions.extend(self._get_snippet_completions(request.prefix))
        suggestions.extend(self._get_import_completions(request.context, request.prefix))
        suggestions.extend(self._get_context_completions(request.context, request.prefix))
        
        # Get AI completions if available
        if self.client and len(suggestions) < 5:
            ai_suggestions = await self._get_ai_completions(request)
            suggestions.extend(ai_suggestions)
        
        # Remove duplicates and sort
        unique_suggestions = self._deduplicate_suggestions(suggestions)
        final_suggestions = sorted(unique_suggestions, key=lambda x: (x.sortText or x.label))[:request.max_completions]
        
        # Cache result
        self.cache[cache_key] = (final_suggestions, datetime.now())
        
        return CompletionResponse(suggestions=final_suggestions)

    def _get_builtin_completions(self, prefix: str) -> List[CompletionSuggestion]:
        """Get built-in function completions"""
        if not prefix:
            return []
        
        completions = []
        for func in self.builtin_functions:
            if func['label'].startswith(prefix.lower()):
                completions.append(CompletionSuggestion(
                    label=func['label'],
                    kind=func['kind'],
                    insertText=func['insertText'],
                    documentation=func['documentation'],
                    detail='Built-in',
                    isSnippet=True,
                    sortText=f"0_{func['label']}"
                ))
        
        return completions

    def _get_snippet_completions(self, prefix: str) -> List[CompletionSuggestion]:
        """Get code snippet completions"""
        if not prefix:
            return []
        
        completions = []
        for key, snippet in self.code_snippets.items():
            if snippet['label'].startswith(prefix.lower()):
                completions.append(CompletionSuggestion(
                    label=snippet['label'],
                    kind=snippet['kind'],
                    insertText=snippet['insertText'],
                    documentation=snippet['documentation'],
                    detail='Snippet',
                    isSnippet=True,
                    sortText=f"1_{snippet['label']}"
                ))
        
        return completions

    def _get_import_completions(self, context: str, prefix: str) -> List[CompletionSuggestion]:
        """Get import statement completions"""
        current_line = context.split('\n')[-1].strip()
        
        # Check if we're in an import statement
        if 'import' in current_line and prefix:
            completions = []
            for imp in self.common_imports:
                if prefix.lower() in imp['label'].lower():
                    completions.append(CompletionSuggestion(
                        label=imp['label'],
                        kind=imp['kind'],
                        insertText=imp['label'],
                        documentation=imp['documentation'],
                        detail='Import',
                        sortText=f"2_{imp['label']}"
                    ))
            return completions
        
        return []

    def _get_context_completions(self, context: str, prefix: str) -> List[CompletionSuggestion]:
        """Get completions based on context (variables, functions defined in code)"""
        if not prefix:
            return []
        
        completions = []
        
        # Extract variable names and function names from context
        try:
            # Simple regex to find variable assignments and function definitions
            variables = re.findall(r'(\w+)\s*=', context)
            functions = re.findall(r'def\s+(\w+)', context)
            classes = re.findall(r'class\s+(\w+)', context)
            
            # Add variable completions
            for var in set(variables):
                if var.startswith(prefix.lower()):
                    completions.append(CompletionSuggestion(
                        label=var,
                        kind='Variable',
                        insertText=var,
                        documentation=f'Variable defined in context',
                        detail='Variable',
                        sortText=f"3_{var}"
                    ))
            
            # Add function completions
            for func in set(functions):
                if func.startswith(prefix.lower()):
                    completions.append(CompletionSuggestion(
                        label=func,
                        kind='Function',
                        insertText=f"{func}(${{1:args}})",
                        documentation=f'Function defined in context',
                        detail='Function',
                        isSnippet=True,
                        sortText=f"3_{func}"
                    ))
            
            # Add class completions
            for cls in set(classes):
                if cls.startswith(prefix.lower()):
                    completions.append(CompletionSuggestion(
                        label=cls,
                        kind='Class',
                        insertText=f"{cls}(${{1:args}})",
                        documentation=f'Class defined in context',
                        detail='Class',
                        isSnippet=True,
                        sortText=f"3_{cls}"
                    ))
                    
        except Exception as e:
            logger.warning(f"Error parsing context for completions: {e}")
        
        return completions

    async def _get_ai_completions(self, request: CompletionRequest) -> List[CompletionSuggestion]:
        """Get AI-powered completions using Groq's Llama-3.1-8b-instant"""
        if not self.client:
            return []
        
        try:
            # Create a focused prompt for completions
            prompt = f"""You are a Python code completion assistant. Given the context and current prefix, provide 3-5 relevant code completions.

Context:
```python
{request.context}
```

Current prefix: "{request.prefix}"
Line: {request.line}, Column: {request.column}

Provide completions in this exact JSON format:
{{
  "completions": [
    {{
      "label": "completion_text",
      "insertText": "text_to_insert", 
      "kind": "Function|Variable|Keyword|Class|Method|Snippet",
      "documentation": "brief description"
    }}
  ]
}}

Focus on:
- Relevant Python syntax and keywords
- Context-appropriate variable/function names
- Common patterns and idioms
- Built-in functions and methods

Only return the JSON, no other text."""

            # Use Groq API with Llama-3.1-8b-instant
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                model=self.model_name,
                temperature=0.3,
                max_tokens=500,
                top_p=0.9,
                stop=None,
                stream=False,
            )
            
            response_text = chat_completion.choices[0].message.content
            
            if response_text:
                # Parse JSON response
                try:
                    # Clean the response to extract JSON
                    json_start = response_text.find('{')
                    json_end = response_text.rfind('}') + 1
                    if json_start != -1 and json_end > json_start:
                        json_str = response_text[json_start:json_end]
                        data = json.loads(json_str)
                    else:
                        data = json.loads(response_text.strip())
                    
                    completions = []
                    
                    for idx, comp in enumerate(data.get('completions', [])[:5]):
                        completions.append(CompletionSuggestion(
                            label=comp.get('label', ''),
                            kind=comp.get('kind', 'Text'),
                            insertText=comp.get('insertText', comp.get('label', '')),
                            documentation=comp.get('documentation', 'AI suggestion'),
                            detail='Llama-3.1-8b',
                            sortText=f"4_{idx:02d}_{comp.get('label', '')}"
                        ))
                    
                    return completions
                    
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse Groq JSON response: {e}")
                    logger.debug(f"Raw response: {response_text}")
                    
        except Exception as e:
            logger.warning(f"Groq completion failed: {e}")
        
        return []

    def _deduplicate_suggestions(self, suggestions: List[CompletionSuggestion]) -> List[CompletionSuggestion]:
        """Remove duplicate suggestions"""
        seen = set()
        unique = []
        
        for suggestion in suggestions:
            key = (suggestion.label, suggestion.kind)
            if key not in seen:
                seen.add(key)
                unique.append(suggestion)
        
        return unique