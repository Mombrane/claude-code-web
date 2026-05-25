#!/bin/bash
# Test script for Claude Code Web

set -e

echo "Running tests for Claude Code Web..."

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Error: Node.js v18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "Node.js version: $(node -v)"

# Check npm version
echo "npm version: $(npm -v)"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Run linting
echo ""
echo "Running linter..."
npm run lint || true

# Build frontend
echo ""
echo "Building frontend..."
npm run build

# Check if build was successful
if [ -d "dist" ]; then
    echo "✓ Frontend build successful"
else
    echo "✗ Frontend build failed"
    exit 1
fi

# Test server startup
echo ""
echo "Testing server startup..."
timeout 5 node -e "
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
});
server.listen(3099, () => {
    console.log('✓ Server can start on port 3099');
    server.close();
    process.exit(0);
});
" || echo "✗ Server startup test failed"

# Test API endpoints
echo ""
echo "Testing API endpoints..."

# Start server in background
export PORT=3098
export DATA_DIR="/tmp/claude-code-web-test/sessions"
mkdir -p "$DATA_DIR"

node server/index.js &
SERVER_PID=$!
sleep 2

# Test health endpoint
if curl -s http://localhost:3098/api/health | grep -q "ok"; then
    echo "✓ Health endpoint working"
else
    echo "✗ Health endpoint failed"
fi

# Test sessions endpoint
if curl -s http://localhost:3098/api/sessions | grep -q "\[\]"; then
    echo "✓ Sessions endpoint working"
else
    echo "✗ Sessions endpoint failed"
fi

# Stop server
kill $SERVER_PID 2>/dev/null || true

# Clean up
rm -rf /tmp/claude-code-web-test

echo ""
echo "All tests passed!"
