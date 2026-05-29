import { Router, Request, Response } from 'express';
import { sessionStore } from '../services/session-store';
import { claudeProcessManager } from '../services/claude-process';
import { readTranscript } from '../services/claude-transcript';

const router = Router();

// Get all sessions
router.get('/', async (req: Request, res: Response) => {
  try {
    const { projectPath, search, limit, offset } = req.query;
    const sessions = await sessionStore.getAllSessions({
      projectPath: projectPath as string,
      search: search as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json(sessions);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Create new session
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, cwd, projectPath } = req.body;
    const session = await sessionStore.createSession(name, cwd, projectPath);

    // Spawn Claude process for this session
    await claudeProcessManager.spawnSession({
      sessionId: session.id,
      cwd: session.cwd,
      model: session.model,
    });

    res.status(201).json(session);
  } catch (e) {
    console.error('Failed to create session:', e);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get single session
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const session = await sessionStore.getSession(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// Get messages for a session (read from Claude Code's .jsonl transcript)
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const session = await sessionStore.getSession(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const projectPath = session.projectPath || session.cwd;
    const messages = await readTranscript(id, projectPath);
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Update session
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name } = req.body;
    if (name) {
      const success = await sessionStore.updateSessionName(id, name);
      if (!success) {
        return res.status(404).json({ error: 'Session not found' });
      }
    }
    const session = await sessionStore.getSession(id);
    res.json(session);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// Delete session
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    // Close Claude process if active
    claudeProcessManager.closeSession(id);

    // Delete session metadata
    const success = await sessionStore.deleteSession(id);
    if (!success) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

export default router;
