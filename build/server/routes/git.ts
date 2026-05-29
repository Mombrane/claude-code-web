import { Router, Request, Response } from 'express';
import { gitService } from '../services/git-service';

const router = Router();

// Get git status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const cwd = (req.query.cwd as string) || process.cwd();
    const status = await gitService.getStatus(cwd);
    res.json(status);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Get git diff
router.get('/diff', async (req: Request, res: Response) => {
  try {
    const cwd = (req.query.cwd as string) || process.cwd();
    const staged = req.query.staged === 'true';
    const diff = await gitService.getDiff(cwd, staged);
    res.json({ diff });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Get git log
router.get('/log', async (req: Request, res: Response) => {
  try {
    const cwd = (req.query.cwd as string) || process.cwd();
    const count = req.query.count ? parseInt(req.query.count as string) : 20;
    const log = await gitService.getLog(cwd, count);
    res.json(log);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Get branches
router.get('/branches', async (req: Request, res: Response) => {
  try {
    const cwd = (req.query.cwd as string) || process.cwd();
    const branches = await gitService.getBranches(cwd);
    res.json(branches);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Stage files
router.post('/stage', async (req: Request, res: Response) => {
  try {
    const { cwd, files } = req.body;
    await gitService.stage(cwd || process.cwd(), files);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Unstage files
router.post('/unstage', async (req: Request, res: Response) => {
  try {
    const { cwd, files } = req.body;
    await gitService.unstage(cwd || process.cwd(), files);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Commit
router.post('/commit', async (req: Request, res: Response) => {
  try {
    const { cwd, message } = req.body;
    const hash = await gitService.commit(cwd || process.cwd(), message);
    res.json({ hash });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
