import { Router } from 'express';
import { fileService } from '../services/file-service';
const router = Router();
// List directory
router.get('/tree', async (req, res) => {
    try {
        const path = req.query.path || process.cwd();
        const entries = await fileService.listDirectory(path);
        res.json(entries);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
});
// Read file
router.get('/content', async (req, res) => {
    try {
        const filePath = req.query.path;
        const startLine = req.query.start ? parseInt(req.query.start) : undefined;
        const count = req.query.count ? parseInt(req.query.count) : undefined;
        if (!filePath) {
            return res.status(400).json({ error: 'Path is required' });
        }
        const content = await fileService.readFile(filePath, startLine, count);
        res.json(content);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
});
// Write file
router.put('/content', async (req, res) => {
    try {
        const { path: filePath, content } = req.body;
        if (!filePath || content === undefined) {
            return res.status(400).json({ error: 'Path and content are required' });
        }
        await fileService.writeFile(filePath, content);
        res.json({ success: true });
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
});
// Search files
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q;
        const searchPath = req.query.path || process.cwd();
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }
        const results = await fileService.searchFiles(query, searchPath);
        res.json(results);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
});
export default router;
//# sourceMappingURL=files.js.map