#!/usr/bin/env node

import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { WebSocketHandler } from '../server/websocket/handler.js';
import sessionRoutes from '../server/routes/sessions.js';
import fileRoutes from '../server/routes/files.js';
import gitRoutes from '../server/routes/git.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  port: parseInt(process.env.PORT || '3001'),
  dataDir: process.env.DATA_DIR || path.join(process.cwd(), 'data', 'sessions'),
  defaultModel: process.env.DEFAULT_MODEL || 'claude-sonnet-4-20250514',
  defaultCwd: process.env.DEFAULT_CWD || process.cwd(),
};

// Set environment variables for config
process.env.DATA_DIR = config.dataDir;
process.env.DEFAULT_CWD = config.defaultCwd;
process.env.DEFAULT_MODEL = config.defaultModel;

const app = express();
const server = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the public directory
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// API Routes
app.use('/api/sessions', sessionRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/git', gitRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// WebSocket handler
const wsHandler = new WebSocketHandler(server);

// Start server
server.listen(config.port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    Claude Code Web v1.0.0                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${config.port}                  ║
║  WebSocket:         ws://localhost:${config.port}/ws                ║
║  Working directory: ${config.defaultCwd.padEnd(39)}║
╚═══════════════════════════════════════════════════════════════╝

Keyboard Shortcuts:
  Ctrl+Shift+F  Toggle files panel
  Ctrl+\`         Toggle terminal
  Ctrl+G        Toggle git panel
  Ctrl+,        Open settings

Press Ctrl+C to stop the server
`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  server.close(() => {
    process.exit(0);
  });
});
