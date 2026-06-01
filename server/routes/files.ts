import { Router, Request, Response } from 'express';
import { fileService } from '../services/file-service';
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

// List directory
router.get('/tree', async (req: Request, res: Response) => {
  try {
    const dirPath = validatePath((req.query.path as string) || process.cwd(), 'path');
    const entries = await fileService.listDirectory(dirPath);
    res.json(entries);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// Read file
router.get('/content', async (req: Request, res: Response) => {
  try {
    const rawPath = req.query.path as string;
    const startLine = req.query.start ? parseInt(req.query.start as string) : undefined;
    const count = req.query.count ? parseInt(req.query.count as string) : undefined;

    if (!rawPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const filePath = validatePath(rawPath, 'path');
    const content = await fileService.readFile(filePath, startLine, count);
    res.json(content);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// Write file
router.put('/content', async (req: Request, res: Response) => {
  try {
    const { path: rawPath, content } = req.body;

    if (!rawPath || content === undefined) {
      return res.status(400).json({ error: 'Path and content are required' });
    }

    const filePath = validatePath(rawPath, 'path');
    await fileService.writeFile(filePath, content);
    res.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// Search files
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const searchPath = validatePath((req.query.path as string) || process.cwd(), 'path');

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await fileService.searchFiles(query, searchPath);
    res.json(results);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

export default router;
