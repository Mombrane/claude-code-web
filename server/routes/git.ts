import { Router, Request, Response } from 'express';
import { gitService } from '../services/git-service';
import path from 'path';

const router = Router();

function validatePath(inputPath: string, paramName: string): string {
  const resolved = path.resolve(inputPath);
  const blocked = ['/etc', '/root', '/proc', '/sys', '/dev', '/boot', '/usr/bin', '/usr/sbin'];
  if (blocked.some(b => resolved.startsWith(b + '/') || resolved === b)) {
    throw new Error(`Access denied: ${paramName} points to a blocked directory`);
  }
  return resolved;
}

// Get git status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const cwd = validatePath((req.query.cwd as string) || process.cwd(), 'cwd');
    const status = await gitService.getStatus(cwd);
    res.json(status);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// Get git diff
router.get('/diff', async (req: Request, res: Response) => {
  try {
    const cwd = validatePath((req.query.cwd as string) || process.cwd(), 'cwd');
    const staged = req.query.staged === 'true';
    const diff = await gitService.getDiff(cwd, staged);
    res.json({ diff });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// Get branch diff
router.get('/diff/branch', async (req: Request, res: Response) => {
  try {
    const cwd = validatePath((req.query.cwd as string) || process.cwd(), 'cwd');
    const baseBranch = req.query.base as string;
    const diff = await gitService.getBranchDiff(cwd, baseBranch);
    res.json({ diff });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// Get file diff
router.get('/diff/file', async (req: Request, res: Response) => {
  try {
    const cwd = validatePath((req.query.cwd as string) || process.cwd(), 'cwd');
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: 'path is required' });
    }
    const diff = await gitService.getFileDiff(cwd, filePath);
    res.json({ diff });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// Get diff stat
router.get('/diff/stat', async (req: Request, res: Response) => {
  try {
    const cwd = validatePath((req.query.cwd as string) || process.cwd(), 'cwd');
    const stat = await gitService.getDiffStat(cwd);
    res.json(stat);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// Get git log
router.get('/log', async (req: Request, res: Response) => {
  try {
    const cwd = validatePath((req.query.cwd as string) || process.cwd(), 'cwd');
    const count = req.query.count ? parseInt(req.query.count as string) : 20;
    const log = await gitService.getLog(cwd, count);
    res.json(log);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// Get branches
router.get('/branches', async (req: Request, res: Response) => {
  try {
    const cwd = validatePath((req.query.cwd as string) || process.cwd(), 'cwd');
    const branches = await gitService.getBranches(cwd);
    res.json(branches);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// Stage files
router.post('/stage', async (req: Request, res: Response) => {
  try {
    const { cwd, files } = req.body;
    const validatedCwd = validatePath(cwd || process.cwd(), 'cwd');
    await gitService.stage(validatedCwd, files);
    res.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// Unstage files
router.post('/unstage', async (req: Request, res: Response) => {
  try {
    const { cwd, files } = req.body;
    const validatedCwd = validatePath(cwd || process.cwd(), 'cwd');
    await gitService.unstage(validatedCwd, files);
    res.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// Commit
router.post('/commit', async (req: Request, res: Response) => {
  try {
    const { cwd, message } = req.body;
    const validatedCwd = validatePath(cwd || process.cwd(), 'cwd');
    const hash = await gitService.commit(validatedCwd, message);
    res.json({ hash });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

export default router;
