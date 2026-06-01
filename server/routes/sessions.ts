import { Router, Request, Response } from 'express';
import { sessionStore } from '../services/session-store';
import { claudeProcessManager } from '../services/claude-process';
import { readTranscript, getTranscriptPath } from '../services/claude-transcript';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// Get all tags (must be before /:id to avoid being caught by the parameter route)
router.get('/tags', async (req: Request, res: Response) => {
  try {
    const tags = await sessionStore.getAllTags();
    res.json(tags);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get tags' });
  }
});

// Get all sessions
router.get('/', async (req: Request, res: Response) => {
  try {
    const { projectPath, search, searchContent, tag, limit, offset } = req.query;
    const sessions = await sessionStore.getAllSessions({
      projectPath: projectPath as string,
      search: search as string,
      searchContent: searchContent === 'true',
      tag: tag as string,
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

// Export session as JSON (must be before /:id to avoid route conflicts)
router.get('/:id/export', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const session = await sessionStore.getSession(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const projectPath = session.projectPath || session.cwd;
    const messages = await readTranscript(id, projectPath);

    // Also include raw JSONL for lossless round-trip import
    let rawJsonl: string | undefined;
    try {
      const transcriptPath = getTranscriptPath(id, projectPath);
      rawJsonl = await fs.readFile(transcriptPath, 'utf-8');
    } catch {
      // Transcript file may not exist for empty sessions
    }

    res.json({
      version: 1,
      exportedAt: new Date().toISOString(),
      session,
      messages,
      rawJsonl,
    });
  } catch (e) {
    console.error('Failed to export session:', e);
    res.status(500).json({ error: 'Failed to export session' });
  }
});

// Import session from exported JSON (must be before /:id to avoid route conflicts)
router.post('/import', async (req: Request, res: Response) => {
  try {
    const { version, session: sourceSession, messages, rawJsonl } = req.body;

    if (!version || !sourceSession) {
      return res.status(400).json({ error: 'Invalid import format: missing version or session data' });
    }

    const now = new Date().toISOString();
    const newId = crypto.randomUUID();

    const newSession = {
      ...sourceSession,
      id: newId,
      name: `${sourceSession.name || 'Imported Session'} (imported)`,
      createdAt: now,
      updatedAt: now,
      status: 'idle' as const,
    };

    await sessionStore.saveSession(newSession);

    // Write transcript — prefer raw JSONL for lossless round-trip
    const projectPath = newSession.projectPath || newSession.cwd;
    if (!projectPath) {
      return res.status(400).json({ error: 'Cannot determine project path for import' });
    }

    const transcriptPath = getTranscriptPath(newId, projectPath);
    const dir = path.dirname(transcriptPath);
    await fs.mkdir(dir, { recursive: true });

    if (rawJsonl && typeof rawJsonl === 'string') {
      // Lossless: write the original raw JSONL content
      await fs.writeFile(transcriptPath, rawJsonl, 'utf-8');
    } else if (Array.isArray(messages) && messages.length > 0) {
      // Fallback: write parsed messages as JSONL (lossy but functional)
      const jsonlContent = messages.map((msg: unknown) => JSON.stringify(msg)).join('\n') + '\n';
      await fs.writeFile(transcriptPath, jsonlContent, 'utf-8');
    }

    res.status(201).json(newSession);
  } catch (e) {
    console.error('Failed to import session:', e);
    res.status(500).json({ error: 'Failed to import session' });
  }
});

// Duplicate a session (must be before /:id to avoid route conflicts)
router.post('/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const source = await sessionStore.getSession(id);
    if (!source) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const now = new Date().toISOString();
    const newSession = {
      id: crypto.randomUUID(),
      name: `${source.name} (copy)`,
      cwd: source.cwd,
      projectPath: source.projectPath,
      model: source.model,
      createdAt: now,
      updatedAt: now,
      status: 'idle' as const,
      totalCostUsd: 0,
      totalTokens: 0,
      pinned: false,
      tags: source.tags ? [...source.tags] : undefined,
      notes: source.notes ? source.notes : undefined,
    };
    await sessionStore.saveSession(newSession);
    res.status(201).json(newSession);
  } catch (e) {
    console.error('Failed to duplicate session:', e);
    res.status(500).json({ error: 'Failed to duplicate session' });
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
    const allowedFields = ['name', 'notes', 'model', 'cwd', 'status', 'lastUserMessage', 'pinned', 'tags'] as const;
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    if (Object.keys(updates).length > 0) {
      const success = await sessionStore.updateSession(id, updates as Parameters<typeof sessionStore.updateSession>[1]);
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
    await claudeProcessManager.closeSession(id);

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

// Toggle pin on a session
router.patch('/:id/pin', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id as string;
    const { pinned } = req.body;
    const session = await sessionStore.getSession(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    await sessionStore.updateSession(sessionId, { pinned: !!pinned });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to toggle pin' });
  }
});

// Update session tags
router.patch('/:id/tags', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { tags } = req.body;
    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'tags must be an array of strings' });
    }
    const success = await sessionStore.updateSessionTags(id, tags);
    if (!success) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const session = await sessionStore.getSession(id);
    res.json(session);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update tags' });
  }
});

export default router;
