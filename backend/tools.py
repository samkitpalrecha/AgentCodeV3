import os
import re
import ast
import json
import asyncio
import aiohttp
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass
from datetime import datetime
import logging
from difflib import unified_diff
import subprocess

# External API imports
import requests
from tavily import TavilyClient
import google.generativeai as genai

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from dotenv import load_dotenv

load_dotenv()

@dataclass
class SearchResult:
    """Standardized search result structure"""
    title: str
    content: str
    url: Optional[str] = None
    relevance_score: float = 0.0
    source_type: str = "unknown"  # internal, external, scraped
    
@dataclass
class CodeChange:
    """Represents a single code change/diff"""
    file_path: str
    original_content: str
    modified_content: str
    change_description: str
    line_start: int
    line_end: int
    timestamp: datetime

class ToolManager:
    """Advanced tool manager for AgentCodeV2"""
    
    def __init__(self):
        self.setup_apis()
        self.workspace_path = Path("./")  # Current working directory
        self.code_history: List[CodeChange] = []
        
    def setup_apis(self):
        """Initialize external API clients"""
        try:
            # Gemini setup
            genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
            self.gemini_model = genai.GenerativeModel('gemini-2.5-flash')
            
            # Tavily setup for external search
            self.tavily_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
            
            # Firecrawl setup
            self.firecrawl_api_key = os.getenv("FIRECRAWL_API_KEY")
            self.firecrawl_base_url = "https://api.firecrawl.dev/v0"
            
            logger.info("All API clients initialized successfully")
            
        except Exception as e:
            logger.error(f"Error setting up APIs: {e}")
            raise

    async def search_internal(self, query: str, file_types: List[str] = [".py", ".js", ".jsx", ".md"]) -> List[SearchResult]:
        """
        Search internal workspace/repository for relevant code and files
        
        Args:
            query: Search query
            file_types: File extensions to search in
            
        Returns:
            List of SearchResult objects
        """
        logger.info(f"Internal search for: {query}")
        results = []
        
        try:
            # Search in current workspace
            for file_path in self.workspace_path.rglob("*"):
                if file_path.is_file() and file_path.suffix in file_types:
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            
                        # Simple text search (can be enhanced with fuzzy matching)
                        if query.lower() in content.lower():
                            # Calculate relevance score
                            query_count = content.lower().count(query.lower())
                            relevance_score = min(query_count / 10.0, 1.0)
                            
                            # Extract relevant snippet
                            lines = content.split('\n')
                            relevant_lines = []
                            for i, line in enumerate(lines):
                                if query.lower() in line.lower():
                                    start = max(0, i-2)
                                    end = min(len(lines), i+3)
                                    relevant_lines.extend(lines[start:end])
                                    break
                            
                            snippet = '\n'.join(relevant_lines)
                            
                            results.append(SearchResult(
                                title=f"Code in {file_path.name}",
                                content=snippet,
                                url=str(file_path),
                                relevance_score=relevance_score,
                                source_type="internal"
                            ))
                            
                    except Exception as e:
                        logger.warning(f"Error reading {file_path}: {e}")
                        continue
            
            # Also search in code history
            for change in self.code_history:
                if query.lower() in change.change_description.lower() or \
                   query.lower() in change.modified_content.lower():
                    results.append(SearchResult(
                        title=f"Previous change in {change.file_path}",
                        content=change.change_description + "\n" + change.modified_content[:500],
                        relevance_score=0.8,
                        source_type="internal_history"
                    ))
            
            # Sort by relevance
            results.sort(key=lambda x: x.relevance_score, reverse=True)
            logger.info(f"Found {len(results)} internal results")
            
            return results[:10]  # Return top 10 results
            
        except Exception as e:
            logger.error(f"Error in internal search: {e}")
            return []

    async def search_external(self, query: str, max_results: int = 5) -> List[SearchResult]:
        """
        Search external sources using Tavily API
        
        Args:
            query: Search query
            max_results: Maximum number of results to return
            
        Returns:
            List of SearchResult objects
        """
        logger.info(f"External search for: {query}")
        
        try:
            # Use Tavily for external search
            search_result = self.tavily_client.search(
                query=query,
                search_depth="advanced",
                max_results=max_results,
                include_domains=["github.com", "stackoverflow.com", "docs.python.org", "pypi.org"]
            )
            
            results = []
            for item in search_result.get('results', []):
                results.append(SearchResult(
                    title=item.get('title', 'No title'),
                    content=item.get('content', '')[:1000],  # Truncate content
                    url=item.get('url', ''),
                    relevance_score=item.get('score', 0.5),
                    source_type="external"
                ))
            
            logger.info(f"Found {len(results)} external results")
            return results
            
        except Exception as e:
            logger.error(f"Error in external search: {e}")
            return []

    async def scraper(self, url: str) -> Optional[str]:
        """
        Scrape full content from a URL using Firecrawl API
        
        Args:
            url: URL to scrape
            
        Returns:
            Scraped content as string or None if failed
        """
        logger.info(f"Scraping URL: {url}")
        
        try:
            headers = {
                'Authorization': f'Bearer {self.firecrawl_api_key}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                'url': url,
                'formats': ['markdown'],
                'onlyMainContent': True
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.firecrawl_base_url}/scrape",
                    headers=headers,
                    json=payload
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        content = data.get('data', {}).get('markdown', '') or \
                                data.get('data', {}).get('content', '')
                        logger.info(f"Successfully scraped {len(content)} characters")
                        return content
                    else:
                        logger.error(f"Scraping failed with status {response.status}")
                        return None
                        
        except Exception as e:
            logger.error(f"Error scraping {url}: {e}")
            return None

    async def internal_write(self, file_path: str, content: str, change_description: str = "") -> bool:
        """
        Write/update code files with change tracking
        
        Args:
            file_path: Path to the file to write
            content: New content to write
            change_description: Description of the change
            
        Returns:
            True if successful, False otherwise
        """
        logger.info(f"Writing to file: {file_path}")
        
        try:
            file_path_obj = Path(file_path)
            
            # Read original content if file exists
            original_content = ""
            if file_path_obj.exists():
                with open(file_path_obj, 'r', encoding='utf-8') as f:
                    original_content = f.read()
            
            # Create directory if it doesn't exist
            file_path_obj.parent.mkdir(parents=True, exist_ok=True)
            
            # Write new content
            with open(file_path_obj, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # Track the change
            change = CodeChange(
                file_path=file_path,
                original_content=original_content,
                modified_content=content,
                change_description=change_description,
                line_start=1,
                line_end=len(content.split('\n')),
                timestamp=datetime.now()
            )
            
            self.code_history.append(change)
            logger.info(f"Successfully wrote {len(content)} characters to {file_path}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error writing to {file_path}: {e}")
            return False

    def generate_diff(self, original: str, modified: str, filename: str = "file") -> str:
        """Generate a unified diff between original and modified content"""
        diff = list(unified_diff(
            original.splitlines(keepends=True),
            modified.splitlines(keepends=True),
            fromfile=f"a/{filename}",
            tofile=f"b/{filename}",
            lineterm=""
        ))
        return ''.join(diff)

    async def analyze_code_with_llm(self, code: str, instruction: str) -> str:
        """
        Use Gemini to analyze code and provide insights
        
        Args:
            code: Code to analyze
            instruction: Analysis instruction
            
        Returns:
            Analysis result as string
        """
        try:
            prompt = f"""
            You are an expert code analyst. Analyze the following code based on the instruction.
            
            Instruction: {instruction}
            
            Code:
            ```
            {code}
            ```
            
            Provide a detailed analysis including:
            1. Code structure and patterns
            2. Potential improvements
            3. Issues or bugs
            4. Suggestions for the given instruction
            
            Analysis:
            """
            
            response = self.gemini_model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            logger.error(f"Error in LLM analysis: {e}")
            return "Analysis failed"

    def get_code_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent code change history"""
        recent_changes = sorted(self.code_history, key=lambda x: x.timestamp, reverse=True)[:limit]
        
        return [
            {
                "file_path": change.file_path,
                "change_description": change.change_description,
                "timestamp": change.timestamp.isoformat(),
                "diff": self.generate_diff(change.original_content, change.modified_content, change.file_path)
            }
            for change in recent_changes
        ]

    async def search_and_scrape(self, query: str) -> List[SearchResult]:
        """
        Combined search and scrape operation
        Search externally, then scrape the most relevant results
        """
        logger.info(f"Combined search and scrape for: {query}")
        
        # First, search externally
        search_results = await self.search_external(query)
        
        # Then scrape the top results for more detailed content
        enhanced_results = []
        for result in search_results[:3]:  # Scrape top 3 results
            if result.url:
                scraped_content = await self.scraper(result.url)
                if scraped_content:
                    result.content = scraped_content[:2000]  # Limit content size
                    result.source_type = "scraped"
            enhanced_results.append(result)
        
        return enhanced_results

# Global tool manager instance
tool_manager = ToolManager()

# Exported functions for use in agent nodes
async def search_internal(query: str, file_types: List[str] = [".py", ".js", ".jsx", ".md"]) -> List[SearchResult]:
    """Search internal workspace"""
    return await tool_manager.search_internal(query, file_types)

async def search_external(query: str, max_results: int = 5) -> List[SearchResult]:
    """Search external sources"""
    return await tool_manager.search_external(query, max_results)

async def scraper(url: str) -> Optional[str]:
    """Scrape content from URL"""
    return await tool_manager.scraper(url)

async def internal_write(file_path: str, content: str, change_description: str = "") -> bool:
    """Write to internal files"""
    return await tool_manager.internal_write(file_path, content, change_description)

async def search_and_scrape(query: str) -> List[SearchResult]:
    """Combined search and scrape"""
    return await tool_manager.search_and_scrape(query)

def get_code_history(limit: int = 10) -> List[Dict[str, Any]]:
    """Get code change history"""
    return tool_manager.get_code_history(limit)

async def analyze_code_with_llm(code: str, instruction: str) -> str:
    """Analyze code with LLM"""
    return await tool_manager.analyze_code_with_llm(code, instruction)