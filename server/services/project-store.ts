import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import type { Project } from '../types';

export class ProjectStore {
  private dataDir: string;
  private projectsFile: string;

  constructor() {
    this.dataDir = config.dataDir;
    this.projectsFile = path.join(this.dataDir, '..', 'projects.json');
    this.ensureDataDir();
  }

  private async ensureDataDir() {
    try {
      await fs.mkdir(path.dirname(this.projectsFile), { recursive: true });
    } catch (e) {
      console.error('Failed to create data directory:', e);
    }
  }

  async getAllProjects(): Promise<Project[]> {
    try {
      const data = await fs.readFile(this.projectsFile, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  async addProject(worktree: string, name?: string): Promise<Project> {
    const projects = await this.getAllProjects();

    // Check if project already exists
    const existing = projects.find(p => p.worktree === worktree);
    if (existing) return existing;

    const project: Project = {
      id: uuidv4(),
      worktree: path.resolve(worktree),
      name: name || path.basename(worktree),
      time: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    };

    projects.push(project);
    await this.saveProjects(projects);
    return project;
  }

  async removeProject(projectId: string): Promise<boolean> {
    const projects = await this.getAllProjects();
    const filtered = projects.filter(p => p.id !== projectId);

    if (filtered.length === projects.length) return false;

    await this.saveProjects(filtered);
    return true;
  }

  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project | null> {
    const projects = await this.getAllProjects();
    const index = projects.findIndex(p => p.id === projectId);

    if (index === -1) return null;

    projects[index] = {
      ...projects[index],
      ...updates,
      time: {
        ...projects[index].time,
        updated: new Date().toISOString(),
      },
    };

    await this.saveProjects(projects);
    return projects[index];
  }

  async getProject(projectId: string): Promise<Project | null> {
    const projects = await this.getAllProjects();
    return projects.find(p => p.id === projectId) || null;
  }

  async getProjectByPath(worktree: string): Promise<Project | null> {
    const projects = await this.getAllProjects();
    return projects.find(p => p.worktree === path.resolve(worktree)) || null;
  }

  async touchProject(worktree: string): Promise<void> {
    const projects = await this.getAllProjects();
    const index = projects.findIndex(p => p.worktree === path.resolve(worktree));

    if (index !== -1) {
      projects[index].time.updated = new Date().toISOString();
      await this.saveProjects(projects);
    }
  }

  private async saveProjects(projects: Project[]): Promise<void> {
    const tempPath = this.projectsFile + '.tmp';
    try {
      await fs.writeFile(tempPath, JSON.stringify(projects, null, 2));
      await fs.rename(tempPath, this.projectsFile);
    } catch (e) {
      await fs.writeFile(this.projectsFile, JSON.stringify(projects, null, 2));
    }
  }
}

export const projectStore = new ProjectStore();
