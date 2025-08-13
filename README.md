# AgentCodeV3

AgentCodeV3 is an AI-powered coding environment that fuses a real-time browser IDE with autonomous AI agents for code triage, planning, execution, and improvement. Designed for developers and researchers, it offers a seamless, interactive workflow between human creativity and agentic automation.

![IDE Preview](image.png)

---

## Features

### 1. Modern Browser IDE (Frontend)
- **Multi-file Editing:** Edit, create, and delete multiple files in a fast, tabbed interface using React.
- **Live Python Execution:** Instantly run Python code in the browser via Pyodide—get outputs without any backend calls.
- **Integrated AI Chatbot:** Interact with an LLM-powered assistant for explanations, bug fixes, refactoring, and feature implementation.
- **Streaming Results:** Agent output (explanations, code diff, progress updates) is streamed in real time to the UI.
- **Diff & Change Management:** Accept/reject agent-suggested code changes with clear diff visualization.
- **Chat/Command Modes:** Use natural language to instruct the agent, request code improvements, or debug.
- **Customizable File System:** Organize and manage code files and directories within your project.
- **Frontend Tech:** Built in React (Vite), with component-based structure for extensibility.

### 2. Agent-Powered Backend (Python)
- **FastAPI Server:** REST and WebSocket APIs for agent communication, streaming, and code execution.
- **Agent Workflow Orchestration:** 
  - **TriageAgent:** Analyzes and routes code requests by complexity.
  - **Planner Node:** Breaks complex tasks into actionable steps (plan-step architecture).
  - **Developer Node:** Executes plan steps, updating the codebase and state.
  - **LLM Integration:** Leverages Gemini and other LLMs for code completion, explanations, and triage.
- **Agent State Management:** Tracks execution progress, working memory, and logs for each agent task.
- **Streaming Architecture:** Backend streams agent state, progress, and results for responsive UX.
- **Detailed Logging & Metrics:** Execution logs, error handling, and agent performance stats are tracked for each session.

### 3. Unified User Experience
- **WebSocket & REST API:** Bi-directional communication between frontend and backend for live updates and chat.
- **Natural Language Interface:** Type or speak requests (“Fix this bug”, “Refactor for performance”, “Explain this code”) to the agent.
- **Extensible Design:** Easily add new agent nodes, LLM models, or frontend features.
- **Robust Error Handling:** User-friendly error messages and recovery for failed agent operations.

---

## Detailed Architecture

### Frontend

- **App.jsx:** Manages agent execution, code editing, chat, and UI state. Handles agent streaming, code diffs, and chat intent detection (e.g., bug fix, explanation, feature).
- **AiChat.jsx:** Renders conversation history, message formatting, code snippets, and supports common developer queries.
- **index.html:** Loads Pyodide for Python execution and bootstraps the React app.
- **Component Structure:** Modular (editor, sidebar, chat, diff viewer) for easy customization and extension.

### Backend

- **server.py:** FastAPI app entry point; handles CORS, agent requests, and API documentation.
- **agent_graph.py:** Core agent workflow engine using a graph-based state machine:
  - Triage, Planner, Developer nodes coordinate to plan and execute multi-step agent tasks.
  - Streams progress and results to the frontend.
- **state.py:** AgentState dataclass tracks user instruction, plan steps, working memory, execution log, outputs, and metrics. Methods for serialization, logging, and progress reporting.
- **completion.py:** LLM integration and code completion services (Gemini, etc.).
- **planner.py, developer.py, triage.py:** Individual agent nodes for specialized tasks (planning, execution, triage).

---

## Example Use Cases

- **Automated Bug Fixing:** “Fix any bugs in this code” streams a fix plan, applies changes, and explains the solution.
- **Code Explanation:** “Explain what this function does” generates a summary and annotated code.
- **Feature Addition:** “Add a logging feature to this function” plans and implements step-by-step.
- **Live Chat Support:** Ask for best practices, performance tips, or get code reviewed in real time.

---

## Getting Started

### Prerequisites

- Node.js (for frontend)
- Python 3.10+ (for backend)
- Docker (optional, for simplified setup)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/samkitpalrecha/AgentCodeV3.git
   cd AgentCodeV3
   ```
2. **Start the Backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   python main.py
   ```
3. **Start the Frontend**
   ```bash
   cd ../frontend
   npm install
   npm start
   ```
   Or use the provided Docker configuration.

### Project Structure

- `frontend/` — React-based IDE UI and agent chat.
- `backend/` — FastAPI server, agent workflow, LLM integration.
- `README.md` — This documentation.
- `image.png` — IDE screenshot or architecture diagram.

---

## Contributing

Contributions, bug reports, and feature requests are welcome! Please open issues or submit PRs on GitHub.

---

## License

[MIT License](LICENSE)

---

*AgentCodeV3 leverages state-of-the-art AI to redefine the way developers interact with code. Happy coding!*