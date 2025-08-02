# AgentCodeV2

AgentCodeV2 is an AI-augmented browser-based Python IDE that empowers users to write, analyze, and transform Python code interactively. It integrates modern frontend technologies with an intelligent agent backend, providing not just code execution but also automated code editing, planning, and stepwise modification using large language models and code analysis tools.

---

## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [How It Works](#how-it-works)
- [Folder Structure & Purpose](#folder-structure--purpose)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Future Improvements](#future-improvements)

---

## Features

- Monaco Editor with Python syntax highlighting.
- One-click code execution using Pyodide (Python in WebAssembly).
- AI "Agent" to analyze, plan, and modify code based on user instructions.
- Output console for execution results and errors.
- Toolbar with Run, Debug, Test, and Explain (expanding in future).
- Split-screen layout: Editor on left, output and agent interaction on right.
- Modular backend supporting agentic workflows ("planner" and "developer" nodes).
- Rich logging and error handling for agent processes.

---

## Architecture Overview

AgentCodeV2 consists of two main components:

1. **Frontend (React + Monaco Editor)**  
   - Users write code and interact with the AI agent via the browser.
   - Handles code editing, sending instructions to the agent, and displaying output/results.

2. **Backend (FastAPI + LangChain + Gemini LLM)**  
   - Receives code and natural language instructions.
   - Runs an agentic workflow:
     - **Planner**: Analyzes the instruction, breaks it into executable plan steps.
     - **Developer**: Applies each plan step as a code diff, using LLM-generated patches.
   - Maintains code history and returns the full plan and the modified code.

---

## How It Works

1. **User Interaction**:  
   The user writes Python code in the browser and issues a high-level instruction (e.g., "Add a function to sort a list").
   
2. **Agent Flow**:
   - The instruction and current code are sent to the backend via `callAgent()` in the frontend.
   - The backend agent graph runs:
     - **Planner node**: Uses LLM and code search tools to create a stepwise plan.
     - **Developer node**: For each plan step, generates a code diff via LLM, applies it to the code, and updates history.
   - The result (plan + modified code) is returned to the frontend.

3. **Output**:
   - The user can review the agent plan and the new code, and run it immediately in the browser using Pyodide.
   - Execution output and errors are displayed in the output pane.

---

## Folder Structure & Purpose

```
AgentCodeV2/
├── backend/       # Python backend (FastAPI, LangChain, agent logic)
│   ├── agent_graph.py    # Orchestrates planner/developer flow using a state graph
│   ├── developer.py      # Developer node: applies LLM-generated code diffs
│   ├── planner.py        # Planner node: creates multi-step implementation plans
│   ├── tools.py          # Utilities: code search, diffing, LLM integration
│   ├── server.py         # FastAPI server exposing /agent endpoint
│   └── state.py          # Data models for agent state
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── AgentPanel.jsx   # Main UI for agent interaction
│   │   ├── utils/
│   │   │   └── agentClient.js   # API client for communicating with the backend agent
│   │   └── ...                  # Other React code (App.jsx, etc.)
├── public/            # Static assets
├── package.json       # Frontend dependencies
├── vite.config.js     # Frontend build config
└── README.md
```

### Key File Purposes

- **backend/agent_graph.py**: Defines the agent workflow as a state machine, coordinating planner and developer nodes.
- **backend/developer.py**: Handles the application of each plan step as a code diff, invoking LLMs and maintaining code history.
- **backend/planner.py**: Breaks down user instructions into stepwise plans.
- **backend/tools.py**: Provides code search (internal/external), patching, and LLM orchestration.
- **frontend/src/components/AgentPanel.jsx**: UI for sending code/instructions to the agent and viewing responses.
- **frontend/src/utils/agentClient.js**: Handles HTTP requests to the backend agent API.

---

## Getting Started

### Prerequisites

- Node.js (for frontend)
- Python 3.9+ (for backend)
- Git

### Setup Instructions

**1. Clone the repository:**
```sh
git clone https://github.com/samkitpalrecha/AgentCodeV2.git
cd AgentCodeV2
```

**2. Install frontend dependencies:**
```sh
cd frontend
npm install
```

**3. Install backend dependencies:**
```sh
cd ../backend
pip install -r requirements.txt
```

**4. Start the backend server:**
```sh
uvicorn server:app --reload
```

**5. Start the frontend (in a separate terminal):**
```sh
cd ../frontend
npm run dev
```

**6. Open the app in your browser:**  
Go to [http://localhost:5173](http://localhost:5173)

---

## Usage

- **Write code** in the editor panel.
- **Click "Run"** to execute Python code using Pyodide in your browser.
- **Use the Agent Panel** to give high-level instructions (e.g., "Refactor this code", "Add error handling").
- **Review the agent's plan** and code modifications step by step.
- **Debug, Test, and Explain** features are under development.

---

## Future Improvements

- Implement real logic for Debug, Test, and Explain in the UI.
- Support for multi-file editing and project-level operations.
- Keyboard shortcuts for faster agent/code execution.
- Theme customization and enhanced layout.
- Richer agent output (explanations, suggestions, and auto-rollback).
- Integrate more advanced LLM models and plug in user-specified LLM backends.
- Persistent saving/loading of user code and agent results.

---
