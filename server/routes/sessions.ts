import { Router, Request, Response } from 'express';
import { sessionStore } from '../services/session-store';
import { claudeProcessManager } from '../services/claude-process';

const router = Router();

// Get all sessions
router.get('/', async (req: Request, res: Response) => {
  try {
    const sessions = await sessionStore.getAllSessions();
    res.json(sessions);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Create new session
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, cwd } = req.body;
    const session = await sessionStore.createSession(name, cwd);

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
    const session = await sessionStore.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// Update session
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (name) {
      const success = await sessionStore.updateSessionName(req.params.id, name);
      if (!success) {
        return res.status(404).json({ error: 'Session not found' });
      }
    }
    const session = await sessionStore.getSession(req.params.id);
    res.json(session);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// Delete session
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Close Claude process if active
    claudeProcessManager.closeSession(req.params.id);

    // Delete session data
    const success = await sessionStore.deleteSession(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

export default router;
