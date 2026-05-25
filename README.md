# Claude Code Web Interface

A web-based interface for Claude Code that transforms the CLI experience into a web application.

## Features

- 🌐 **Web Chat Interface** - Interact with Claude Code through a web UI
- 💬 **Streaming Responses** - Real-time display of Claude's responses
- 🔧 **Tool Call Visualization** - Visualize tool calls
- 📁 **File Management** - Browse and edit project files with Monaco Editor
- 🔄 **Git Integration** - View status, diff, and commit history
- 💾 **Session Persistence** - Save conversation history
- ⚡ **WebSocket Communication** - Real-time bidirectional communication
- 🎨 **Modern UI** - Dark theme with Tailwind CSS

## Quick Start

### Prerequisites

- Node.js v18 or higher
- Claude Code CLI installed and configured

### Option 1: Run from source

```bash
git clone https://github.com/Mombrane/claude-code-web.git
cd claude-code-web
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

### Option 2: Install from npm

```bash
npm install -g claude-code-web
claude-code-web
```

Open http://localhost:3001 in your browser.

### Option 3: Download release package

Download the appropriate package for your platform from the releases page:

- `claude-code-web-1.0.0-linux-x64.tar.gz` - Linux x64
- `claude-code-web-1.0.0-darwin-x64.tar.gz` - macOS x64
- `claude-code-web-1.0.0-darwin-arm64.tar.gz` - macOS ARM64 (Apple Silicon)

Extract and run:

```bash
tar -xzf claude-code-web-1.0.0-linux-x64.tar.gz
cd claude-code-web-1.0.0-linux-x64
./start.sh
```

## Keyboard Shortcuts

- `Ctrl+Shift+F` - Toggle files panel
- `Ctrl+`` ` `` - Toggle terminal
- `Ctrl+G` - Toggle git panel
- `Ctrl+,` - Open settings

## API Endpoints

### Sessions
- `GET /api/sessions` - List all sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:id` - Get session
- `DELETE /api/sessions/:id` - Delete session

### Files
- `GET /api/files/tree?path=` - List directory
- `GET /api/files/content?path=` - Read file
- `PUT /api/files/content` - Write file
- `GET /api/files/search?q=&path=` - Search files

### Git
- `GET /api/git/status?cwd=` - Git status
- `GET /api/git/diff?cwd=` - Git diff
- `GET /api/git/log?cwd=` - Git log
- `POST /api/git/commit` - Git commit

### WebSocket
- `ws://localhost:3001/ws` - Real-time communication

## Tech Stack

### Frontend
- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- Zustand (state management)
- Monaco Editor (code editing)
- xterm.js (terminal emulation)
- react-markdown (Markdown rendering)

### Backend
- Node.js + Express 5
- WebSocket (ws)
- simple-git (Git integration)

## Project Structure

```
claude-code-web/
├── server/                    # Backend
│   ├── index.ts              # Express + WebSocket entry
│   ├── services/
│   │   ├── claude-process.ts # Claude subprocess management
│   │   ├── session-store.ts  # Session persistence
│   │   ├── file-service.ts   # File operations
│   │   └── git-service.ts    # Git operations
│   ├── routes/               # REST API
│   └── websocket/            # WebSocket handler
├── src/                       # Frontend
│   ├── components/
│   │   ├── chat/             # Chat components
│   │   ├── files/            # File management
│   │   ├── git/              # Git integration
│   │   ├── terminal/         # Terminal panel
│   │   ├── settings/         # Settings panel
│   │   └── layout/           # Layout components
│   ├── stores/               # State management
│   └── api/                  # API clients
├── bin/                       # CLI entry point
├── scripts/                   # Build and packaging scripts
└── data/sessions/            # Session storage
```

## Configuration

Create a `.env` file:

```env
PORT=3001
DATA_DIR=./data/sessions
DEFAULT_MODEL=claude-sonnet-4-20250514
DEFAULT_CWD=/path/to/your/project
SESSION_TIMEOUT=1800000
```

## Development

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Build for production
npm run build

# Create distribution packages
npm run package

# Run tests
npm run test
```

## License

MIT
