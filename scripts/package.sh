#!/bin/bash
# Package script for Claude Code Web
# Supports Linux and macOS

set -e

VERSION=$(node -p "require('./package.json').version")
NAME="claude-code-web"
DIST_DIR="./dist"
BUILD_DIR="./build"

echo "Packaging ${NAME} v${VERSION}..."

# Clean up
rm -rf "${DIST_DIR}" "${BUILD_DIR}"
mkdir -p "${DIST_DIR}" "${BUILD_DIR}"

# Build frontend
echo "Building frontend..."
npm run build

# Build server
echo "Building server..."
npm run build:server

# Copy files to build directory
echo "Copying files..."
cp -r server "${BUILD_DIR}/"
cp -r bin "${BUILD_DIR}/"
cp -r dist "${BUILD_DIR}/public"
cp package.json "${BUILD_DIR}/"
cp package-lock.json "${BUILD_DIR}/"

# Install production dependencies
echo "Installing production dependencies..."
cd "${BUILD_DIR}"
npm install --production
cd ..

# Create platform-specific packages
create_package() {
    local platform=$1
    local arch=$2

    echo "Creating ${platform}-${arch} package..."

    local package_dir="${DIST_DIR}/${NAME}-${VERSION}-${platform}-${arch}"
    mkdir -p "${package_dir}"
    mkdir -p "${package_dir}/data/sessions"

    # Copy build files
    cp -r "${BUILD_DIR}/"* "${package_dir}/"

    # Create start script
    cat > "${package_dir}/start.sh" << 'EOF'
#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${DIR}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required but not installed."
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Error: Node.js v18 or higher is required. Current version: $(node -v)"
    exit 1
fi

# Start server
export PORT=${PORT:-3001}
export DATA_DIR="${DIR}/data/sessions"
export DEFAULT_CWD="${HOME}"

echo "Starting Claude Code Web on http://localhost:${PORT}"
node bin/cli.js
EOF
    chmod +x "${package_dir}/start.sh"

    # Create install script
    cat > "${package_dir}/install.sh" << 'EOF'
#!/bin/bash
# Install Claude Code Web globally

set -e

echo "Installing Claude Code Web..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required but not installed."
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Get the directory of this script
DIR="$(cd "$(dirname "$0")" && pwd)"

# Create symlink in /usr/local/bin
if [ -w /usr/local/bin ]; then
    ln -sf "${DIR}/bin/cli.js" /usr/local/bin/claude-code-web
    echo "Installed claude-code-web to /usr/local/bin/"
else
    echo "Warning: Cannot write to /usr/local/bin. Run with sudo or add ${DIR}/bin to your PATH."
    echo ""
    echo "Add this to your ~/.bashrc or ~/.zshrc:"
    echo "  export PATH=\"${DIR}/bin:\$PATH\""
fi

echo ""
echo "Installation complete!"
echo "Run 'claude-code-web' to start the server."
EOF
    chmod +x "${package_dir}/install.sh"

    # Create README
    cat > "${package_dir}/README.md" << EOF
# Claude Code Web v${VERSION}

A web-based interface for Claude Code that transforms the CLI experience into a web application.

## Features

- 🌐 **Web Chat Interface** - Interact with Claude Code through a web UI
- 💬 **Streaming Responses** - Real-time display of Claude's responses
- 🔧 **Tool Call Visualization** - Visualize tool calls
- 📁 **File Management** - Browse and edit project files
- 🔄 **Git Integration** - View status, diff, and commit history
- 💾 **Session Persistence** - Save conversation history
- ⚡ **WebSocket Communication** - Real-time bidirectional communication

## Quick Start

### Prerequisites

- Node.js v18 or higher
- Claude Code CLI installed and configured

### Option 1: Run directly

\`\`\`bash
./start.sh
\`\`\`

### Option 2: Install globally

\`\`\`bash
./install.sh
claude-code-web
\`\`\`

### Option 3: npm install

\`\`\`bash
npm install -g claude-code-web
claude-code-web
\`\`\`

Open http://localhost:3001 in your browser.

## Configuration

Create a \`.env\` file in the installation directory:

\`\`\`env
PORT=3001
DATA_DIR=./data/sessions
DEFAULT_MODEL=claude-sonnet-4-20250514
DEFAULT_CWD=/path/to/your/project
\`\`\`

## Keyboard Shortcuts

- \`Ctrl+Shift+F\`: Toggle files panel
- \`Ctrl+\`\`: Toggle terminal
- \`Ctrl+G\`: Toggle git panel
- \`Ctrl+,\`: Open settings

## API Endpoints

### Sessions
- \`GET /api/sessions\` - List all sessions
- \`POST /api/sessions\` - Create new session
- \`GET /api/sessions/:id\` - Get session
- \`DELETE /api/sessions/:id\` - Delete session

### Files
- \`GET /api/files/tree?path=\` - List directory
- \`GET /api/files/content?path=\` - Read file
- \`PUT /api/files/content\` - Write file
- \`GET /api/files/search?q=&path=\` - Search files

### Git
- \`GET /api/git/status?cwd=\` - Git status
- \`GET /api/git/diff?cwd=\` - Git diff
- \`GET /api/git/log?cwd=\` - Git log
- \`POST /api/git/commit\` - Git commit

### WebSocket
- \`ws://localhost:3001/ws\` - Real-time communication

## License

MIT
EOF

    # Create archive
    cd "${DIST_DIR}"
    if [ "${platform}" = "win" ]; then
        zip -r "${NAME}-${VERSION}-${platform}-${arch}.zip" "${NAME}-${VERSION}-${platform}-${arch}"
    else
        tar -czf "${NAME}-${VERSION}-${platform}-${arch}.tar.gz" "${NAME}-${VERSION}-${platform}-${arch}"
    fi
    cd ..

    echo "Created ${DIST_DIR}/${NAME}-${VERSION}-${platform}-${arch}.tar.gz"
}

# Create packages for different platforms
create_package "linux" "x64"
create_package "darwin" "x64"
create_package "darwin" "arm64"

# Create npm package
echo "Creating npm package..."
npm pack

echo ""
echo "Packaging complete!"
echo ""
echo "Packages created:"
ls -la "${DIST_DIR}"/*.tar.gz 2>/dev/null || true
ls -la "${DIST_DIR}"/*.tgz 2>/dev/null || true
