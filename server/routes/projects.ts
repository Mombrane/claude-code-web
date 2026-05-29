import { Router, Request, Response } from 'express';
import { projectStore } from '../services/project-store';
import fs from 'fs/promises';

const router = Router();

// Get all projects
router.get('/', async (_req: Request, res: Response) => {
  try {
    const projects = await projectStore.getAllProjects();
    res.json(projects);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

// Add a new project
router.post('/', async (req: Request, res: Response) => {
  try {
    const { worktree, name } = req.body;
    if (!worktree) {
      return res.status(400).json({ error: 'worktree is required' });
    }

    // Validate directory exists
    try {
      await fs.access(worktree);
    } catch {
      return res.status(400).json({ error: 'Directory does not exist' });
    }

    const project = await projectStore.addProject(worktree, name);
    res.status(201).json(project);
  } catch (e) {
    res.status(500).json({ error: 'Failed to add project' });
  }
});

// Get single project
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const project = await projectStore.getProject(req.params.id as string);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get project' });
  }
});

// Update project
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { name, icon } = req.body;
    const project = await projectStore.updateProject(req.params.id as string, { name, icon });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const success = await projectStore.removeProject(req.params.id as string);
    if (!success) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Touch project (update last accessed time)
router.post('/:id/touch', async (req: Request, res: Response) => {
  try {
    const project = await projectStore.getProject(req.params.id as string);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    await projectStore.touchProject(project.worktree);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to touch project' });
  }
});

export default router;
