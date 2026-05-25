import { Router, Request, Response } from 'express';
import { fileService } from '../services/file-service';

const router = Router();

// List directory
router.get('/tree', async (req: Request, res: Response) => {
  try {
    const path = (req.query.path as string) || process.cwd();
    const entries = await fileService.listDirectory(path);
    res.json(entries);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Read file
router.get('/content', async (req: Request, res: Response) => {
  try {
    const filePath = req.query.path as string;
    const startLine = req.query.start ? parseInt(req.query.start as string) : undefined;
    const count = req.query.count ? parseInt(req.query.count as string) : undefined;

    if (!filePath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const content = await fileService.readFile(filePath, startLine, count);
    res.json(content);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Write file
router.put('/content', async (req: Request, res: Response) => {
  try {
    const { path: filePath, content } = req.body;

    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'Path and content are required' });
    }

    await fileService.writeFile(filePath, content);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Search files
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const searchPath = (req.query.path as string) || process.cwd();

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await fileService.searchFiles(query, searchPath);
    res.json(results);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
