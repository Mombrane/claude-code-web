import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config';
import { WebSocketHandler } from './websocket/handler';
import sessionRoutes from './routes/sessions';
import fileRoutes from './routes/files';
import gitRoutes from './routes/git';
import projectRoutes from './routes/projects';

const app = express();
const server = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/sessions', sessionRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/git', gitRoutes);
app.use('/api/projects', projectRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket handler
const wsHandler = new WebSocketHandler(server);

// Start server
server.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`WebSocket available at ws://localhost:${config.port}/ws`);
});

export { app, server, wsHandler };
