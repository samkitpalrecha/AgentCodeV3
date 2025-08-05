import os
import re
import ast
import json
import asyncio
import aiohttp
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass, field
from datetime import datetime
import logging
from difflib import unified_diff
import subprocess

# External API imports
from tavily import TavilyClient
import google.generativeai as genai

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
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
    timestamp: datetime = field(default_factory=datetime.now)

class ToolManager:
    """Advanced tool manager for AgentCodeV2"""

    def __init__(self):
        self.setup_apis()
        self.workspace_path = Path("./workspace")
        self.workspace_path.mkdir(exist_ok=True)
        self.code_history: List[CodeChange] = []

    def setup_apis(self):
        """Initialize API clients"""
        self.tavily_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        logger.info("API clients initialized with gemini-2.5-flash")

    async def search_internal(self, query: str, file_types: List[str] = None) -> List[SearchResult]:
        """Search for files and content within the local workspace using ripgrep."""
        if file_types is None:
            file_types = [".py", ".js", ".jsx", ".md", ".html", ".css"]
        
        logger.info(f"Initiating internal search for: '{query}'")
        try:
            cmd = ['rg', '--json', query, str(self.workspace_path)]
            
            # Use asyncio.to_thread to run the synchronous subprocess in a non-blocking way
            def run_subprocess():
                return subprocess.run(cmd, capture_output=True, text=True, check=False)

            process = await asyncio.to_thread(run_subprocess)

            if process.returncode != 0 and not process.stdout:
                if process.stderr:
                    logger.error(f"ripgrep error: {process.stderr}")
                return []

            results = []
            for line in process.stdout.strip().split('\n'):
                if line:
                    try:
                        data = json.loads(line)
                        if data['type'] == 'match':
                            file_path = data['data']['path']['text']
                            content = data['data']['lines']['text']
                            results.append(SearchResult(
                                title=file_path,
                                content=content,
                                source_type='internal'
                            ))
                    except json.JSONDecodeError:
                        logger.warning(f"Failed to parse ripgrep output line: {line}")
            
            logger.info(f"Internal search found {len(results)} results.")
            return results

        except FileNotFoundError:
            logger.error("ripgrep (rg) is not installed or not in PATH. Internal search is unavailable.")
            return []
        except Exception as e:
            logger.error(f"An unexpected error occurred during internal search: {e}", exc_info=True)
            return []

    async def search_external(self, query: str, max_results: int = 5) -> List[SearchResult]:
        """Search external sources using Tavily."""
        logger.info(f"Initiating external search for: '{query}'")
        try:
            response = await asyncio.to_thread(
                self.tavily_client.search,
                query=query,
                search_depth="advanced",
                max_results=max_results
            )
            results = [
                SearchResult(
                    title=res['title'],
                    content=res['content'],
                    url=res['url'],
                    relevance_score=res['score'],
                    source_type='external'
                ) for res in response['results']
            ]
            logger.info(f"External search found {len(results)} results.")
            return results
        except Exception as e:
            logger.error(f"An error occurred during external search: {e}", exc_info=True)
            return []

    async def scraper(self, url: str) -> Optional[str]:
        """Scrape content from a given URL."""
        logger.info(f"Scraping URL: {url}")
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=10) as response:
                    response.raise_for_status()
                    if "text/html" in response.headers.get("Content-Type", ""):
                        return await response.text()
                    else:
                        logger.warning(f"Skipping non-HTML content at {url}")
                        return None
        except Exception as e:
            logger.error(f"Error scraping {url}: {e}", exc_info=True)
            return None

    async def internal_write(self, file_path: str, content: str, change_description: str = "") -> bool:
        """Write content to a file in the workspace, with backup and history."""
        full_path = self.workspace_path / Path(file_path)
        logger.info(f"Writing to file: {full_path}")
        try:
            original_content = ""
            if full_path.exists():
                # Create a backup
                backup_path = full_path.with_suffix(f"{full_path.suffix}.bak")
                full_path.rename(backup_path)
                logger.info(f"Backup created at: {backup_path}")
                original_content = backup_path.read_text()

            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(content)

            # Record the change
            change = CodeChange(
                file_path=file_path,
                original_content=original_content,
                modified_content=content,
                change_description=change_description
            )
            self.code_history.append(change)
            
            logger.info(f"Successfully wrote to {full_path}")
            return True
        except Exception as e:
            logger.error(f"Error writing to file {full_path}: {e}", exc_info=True)
            return False

    async def analyze_code_with_llm(self, code: str, instruction: str) -> str:
        """Analyze a code snippet with an instruction using an LLM."""
        logger.info("Analyzing code with LLM.")
        prompt = f"""
        Analyze the following code based on the user's instruction.

        Instruction: {instruction}

        Code:
        ```
        {code}
        ```

        Provide a concise analysis.
        """
        try:
            response = await self.model.generate_content_async(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Error during code analysis with LLM: {e}", exc_info=True)
            return "Error: Could not analyze the code."

    def get_code_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get the history of code changes."""
        logger.info(f"Retrieving last {limit} code changes.")
        return [
            {
                "file_path": change.file_path,
                "description": change.change_description,
                "timestamp": change.timestamp.isoformat()
            }
            for change in self.code_history[-limit:]
        ]

# Global tool manager instance
tool_manager = ToolManager()

# Exported functions for use in agent nodes
async def search_internal(query: str, file_types: List[str] = None) -> List[SearchResult]:
    return await tool_manager.search_internal(query, file_types)

async def search_external(query: str, max_results: int = 5) -> List[SearchResult]:
    return await tool_manager.search_external(query, max_results)

async def scraper(url: str) -> Optional[str]:
    return await tool_manager.scraper(url)

async def internal_write(file_path: str, content: str, change_description: str = "") -> bool:
    return await tool_manager.internal_write(file_path, content, change_description)

async def analyze_code_with_llm(code: str, instruction: str) -> str:
    return await tool_manager.analyze_code_with_llm(code, instruction)

def get_code_history(limit: int = 10) -> List[Dict[str, Any]]:
    return tool_manager.get_code_history(limit)