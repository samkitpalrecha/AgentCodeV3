# AgentCodeV3

AgentCodeV3 is an AI-powered coding environment that combines a modern browser-based IDE with agent-driven code triage, planning, and improvement features. This project is designed to streamline the development workflow by integrating powerful large language model (LLM) capabilities directly into the developer experience.

![IDE Preview](image.png)

## Features

### 1. Modern Browser IDE (Frontend)
- **Multi-file Editing:** Edit multiple files simultaneously in a familiar, responsive layout.
- **Immediate Python Execution:** Run Python code instantly in the browser using Pyodide.
- **Real-time AI Assistance:** Integrated chatbot and agent communication for code suggestions, explanations, and triage.
- **File Management:** Create, delete, and manage project files and directories.
- **Streaming Results:** See agent and code output as it is generated.

### 2. Agent-Powered Backend
- **TriageAgent:** Automatically analyzes code changes, routes tasks, and suggests improvements.
- **PlanStep Architecture:** Decomposes complex tasks into actionable steps for agents.
- **LLM Integration:** Utilizes Gemini (and potentially other LLMs) for code completion, explanation, and triage.
- **Workflow Automation:** Supports agent-powered refactoring, bug-fixing, and code review.

### 3. Unified User Experience
- **Frontend-Backend Communication:** Seamless WebSocket and REST API integration between React frontend and Python backend.
- **Chatbot Interface:** Natural-language communication with AI agents for code help, planning, and debugging.
- **Extensible Design:** Modular codebase for easy addition of new agent types, language support, or IDE features.

## Getting Started

### Prerequisites
- Node.js (for frontend)
- Python 3.10+ (for backend)
- Recommended: Docker (for simplified setup)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/samkitpalrecha/AgentCodeV3.git
cd AgentCodeV3
```

#### 2. Start the Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```

#### 3. Start the Frontend
```bash
cd ../frontend
npm install
npm start
```

Or use provided Docker configurations for one-click startup.

## Project Structure

- `frontend/` - React-based browser IDE with agent/chat integration.
- `backend/` - Python FastAPI server with agent logic, LLM integration, and workflow management.
- `README.md` - Project overview and setup instructions.
- `image.png` - Screenshot/diagram of the IDE.

## Contributing

Contributions are welcome! Please open issues or submit pull requests for any improvements or bug fixes.

## License

[MIT License](LICENSE)

---

*This project leverages state-of-the-art AI to redefine how developers interact with their code. Happy coding!*