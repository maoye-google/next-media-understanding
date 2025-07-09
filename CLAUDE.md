# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a multi-service AI-powered media understanding application that includes image understanding, video understanding, and an MCP (Model Context Protocol) server for AI collaboration. The application leverages Google Gemini AI for various media analysis tasks.

## Architecture Overview

### Core Services
- **Image Understanding** (React + Vite + TypeScript): Interactive frontend for media understanding tasks with drawing interactions
- **Video Understanding** (React + Vite + TypeScript): Video analysis application with AI-powered content understanding
- **MCP Server** (Python): Model Context Protocol server enabling AI collaboration between Claude and multiple AI models (Gemini, O3, OpenRouter, Ollama)

### Technology Stack
- **Frontend Framework**: React 19 with TypeScript, Vite for build tooling
- **Styling**: Tailwind CSS (via @tailwindcss/browser for image-understanding)
- **State Management**: Jotai for reactive state management
- **AI Integration**: 
  - Google Gemini AI (@google/genai and @google/generative-ai)
  - Perfect Freehand for drawing interactions (image-understanding)
- **Data Visualization**: D3 (d3-array, d3-scale, d3-shape) for video-understanding
- **MCP Server**: Python-based with Redis for conversation threading

## Development Commands

### Starting All Services
```bash
docker compose up --build
```
This starts both the image-understanding and video-understanding services.

### Individual Service Development

#### Image Understanding Service
```bash
cd image-understanding
npm install
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
```
- **Local Development**: http://localhost:5173
- **Container**: http://localhost:5173 (or PORT environment variable)

#### Video Understanding Service
```bash
cd video-understanding  
npm install
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
```
- **Local Development**: http://localhost:5173
- **Container**: http://localhost:9003

#### MCP Server (Zen MCP)
```bash
cd mcp-server
pip install -r requirements.txt
python server.py  # Start MCP server

# Or using Docker (recommended)
./run-server.sh   # Automated setup with Redis
```

### Testing Commands

#### MCP Server Testing
```bash
cd mcp-server
pytest                                    # Run all tests
pytest tests/test_providers.py          # Test specific module
pytest -k "test_openrouter"             # Run specific tests
pytest --verbose                        # Detailed output
python communication_simulator_test.py  # Run communication simulator
```

## Service Configuration

### Environment Variables

#### Main Application (.env)
```bash
# Google Cloud Configuration
GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/claude-code-sa-key.json
PROJECT_ID=your-gcp-project-id

# Fallback API Key
GEMINI_API_KEY=your-gemini-api-key

# Service Ports
PORT=5173  # Default port for image-understanding
```

#### Image Understanding (.env.local in image-understanding/)
```bash
# Service Account (Production)
GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account.json
PROJECT_ID=your-gcp-project-id

# API Key (Development)  
GEMINI_API_KEY=your-gemini-api-key
```

#### Video Understanding (.env.local in video-understanding/)
```bash
GEMINI_API_KEY=your-gemini-api-key
```

#### MCP Server (.env in mcp-server/)
```bash
# Workspace Configuration
WORKSPACE_ROOT=/Users/your-username

# API Keys (at least one required)
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key  # For O3 model access
OPENROUTER_API_KEY=your_openrouter_key  # For multiple models via OpenRouter

# Custom API Endpoints (for Ollama, vLLM, etc.)
CUSTOM_API_URL=http://host.docker.internal:11434/v1  # Ollama example
CUSTOM_API_KEY=  # Empty for Ollama
CUSTOM_MODEL_NAME=llama3.2

# Model Configuration
DEFAULT_MODEL=auto  # Claude picks best model automatically
DEFAULT_THINKING_MODE_THINKDEEP=high

# Conversation Settings
CONVERSATION_TIMEOUT_HOURS=3
MAX_CONVERSATION_TURNS=20
LOG_LEVEL=DEBUG
```

### Service Access URLs
- **Image Understanding**: http://localhost:5173 (container: port from PORT env var)
- **Video Understanding**: http://localhost:9003 (container)
- **MCP Server**: Runs as MCP protocol server (not HTTP)
- **Redis** (MCP): localhost:6379 (when running MCP server)

## Key Features by Service

### Image Understanding
- Interactive media understanding with drawing capabilities
- Real-time AI analysis using Google Gemini
- Image upload and analysis with example images
- Drawing tools using Perfect Freehand
- Responsive design with Tailwind CSS

### Video Understanding  
- Video file upload and analysis
- AI-powered content understanding and insights
- Data visualization charts using D3
- Video player with timeline controls
- Function calling integration with Gemini

### MCP Server (Zen MCP)
- **AI Collaboration**: Enables Claude to work with multiple AI models (Gemini Pro/Flash, O3, OpenRouter models, local Ollama models)
- **Available Tools**: chat, thinkdeep, codereview, precommit, debug, analyze, testgen
- **Conversation Threading**: AI-to-AI conversations with Redis persistence
- **Model Selection**: Automatic model selection or manual specification
- **Local Model Support**: Integration with Ollama, vLLM, LM Studio
- **Extended Context**: Leverage models with larger context windows for comprehensive analysis

## Development Notes

### Authentication Methods
1. **Service Account** (Production): Place GCP service account JSON in credentials/ folder
2. **API Key** (Development): Use GEMINI_API_KEY environment variable
3. **Hybrid**: Container uses service account, local development uses API key

### MCP Server Integration
The MCP server enables Claude to:
- Collaborate with multiple AI models in the same conversation
- Access models with larger context windows (Gemini: 1M tokens, O3: 200K tokens)
- Use specialized models for different tasks (Pro for analysis, Flash for speed, O3 for reasoning)
- Work with local models via Ollama for privacy and cost control

### File Structure
```
/
├── image-understanding/     # React media understanding app
├── video-understanding/     # React video analysis app  
├── mcp-server/             # Python MCP server with AI collaboration
├── credentials/            # GCP service account keys
├── docker-compose.yml      # Service orchestration
└── .env                   # Main environment configuration
```

### Important Implementation Details
- All services use containerized deployment with volume mounting for credentials
- MCP server requires Redis for conversation state management
- Both frontend services use modern React 19 with TypeScript
- Video understanding includes D3-based data visualization
- Image understanding supports real-time drawing and media analysis

### Additional Service Commands
Both frontend services also support production server commands:
```bash
# Build and run production server (Node.js/Express)
npm run build:server  # Compile TypeScript server
npm run start:prod     # Run production server

# Development server (Express)
npm run start          # Run dev server with ts-node
```



## Gemini CLI Integration Guide

### Objective
When a user instructs **"Let's consult with Gemini"** (or similar phrasing), Claude will **invoke the Gemini CLI** as needed to facilitate multi-turn collaboration.

---

### Trigger
* **Regular Expression:** `/gemini.*consulting with/`
* Once triggered, **collaboration mode** will be maintained until the user explicitly indicates to stop.

---

### Collaboration Workflow (Loopable)
| # | Process | Details |
|---|---|---|
| 1 | **PROMPT Preparation** | Store the latest user requirements + a summary of the previous discussion in `$PROMPT` |
| 2 | **Gemini Call** | ```bash\ngemini <<EOF\n$PROMPT\nEOF\n```<br>Add `--max_output_tokens`, etc., as needed |
| 3 | **Output Pasting** | Full text in the `Gemini ➜` section; if long, a summary + link to original text |
| 4 | **Claude Comment** | In the `Claude ➜` section, analyze and integrate Gemini's suggestions, then propose the next action |
| 5 | **Continuation Check** | Repeat steps 1-4 based on user input or plan continuation.<br>Return to normal mode with phrases like "End Gemini collaboration" or "Looks good for now" |

---

### Format Template
```md
**Gemini ➜**
<Response from Gemini>
**Claude ➜**
<Integration comment & next action>