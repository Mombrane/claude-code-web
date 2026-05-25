import fs from 'fs/promises';
import path from 'path';

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink';
  size: number;
  modified: string;
}

export interface FileContent {
  path: string;
  content: string;
  totalLines: number;
  language: string;
}

const BLOCKED_PATHS = ['/etc', '/root', '/proc', '/sys', '/dev'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getLanguage(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const languageMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescriptreact',
    '.js': 'javascript',
    '.jsx': 'javascriptreact',
    '.json': 'json',
    '.md': 'markdown',
    '.css': 'css',
    '.html': 'html',
    '.py': 'python',
    '.go': 'go',
    '.rs': 'rust',
    '.java': 'java',
    '.c': 'c',
    '.cpp': 'cpp',
    '.h': 'c',
    '.sh': 'shell',
    '.yml': 'yaml',
    '.yaml': 'yaml',
    '.xml': 'xml',
    '.sql': 'sql',
    '.rb': 'ruby',
    '.php': 'php',
    '.swift': 'swift',
    '.kt': 'kotlin',
  };
  return languageMap[ext] || 'plaintext';
}

export class FileService {
  async listDirectory(dirPath: string): Promise<FileEntry[]> {
    const resolvedPath = path.resolve(dirPath);

    // Security check
    if (this.isBlockedPath(resolvedPath)) {
      throw new Error('Access denied');
    }

    try {
      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      const result: FileEntry[] = [];

      for (const entry of entries) {
        const fullPath = path.join(resolvedPath, entry.name);
        try {
          const stats = await fs.stat(fullPath);
          result.push({
            name: entry.name,
            path: fullPath,
            type: entry.isDirectory() ? 'dir' : entry.isSymbolicLink() ? 'symlink' : 'file',
            size: stats.size,
            modified: stats.mtime.toISOString(),
          });
        } catch (e) {
          // Skip files we can't stat
        }
      }

      return result.sort((a, b) => {
        // Directories first
        if (a.type === 'dir' && b.type !== 'dir') return -1;
        if (a.type !== 'dir' && b.type === 'dir') return 1;
        return a.name.localeCompare(b.name);
      });
    } catch (e) {
      throw new Error(`Failed to list directory: ${e}`);
    }
  }

  async readFile(filePath: string, startLine?: number, count?: number): Promise<FileContent> {
    const resolvedPath = path.resolve(filePath);

    // Security check
    if (this.isBlockedPath(resolvedPath)) {
      throw new Error('Access denied');
    }

    try {
      const stats = await fs.stat(resolvedPath);
      if (stats.size > MAX_FILE_SIZE) {
        throw new Error('File too large');
      }

      const content = await fs.readFile(resolvedPath, 'utf-8');
      const lines = content.split('\n');

      let selectedLines = lines;
      if (startLine !== undefined) {
        const start = Math.max(0, startLine - 1);
        const end = count ? start + count : lines.length;
        selectedLines = lines.slice(start, end);
      }

      return {
        path: resolvedPath,
        content: selectedLines.join('\n'),
        totalLines: lines.length,
        language: getLanguage(resolvedPath),
      };
    } catch (e) {
      throw new Error(`Failed to read file: ${e}`);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const resolvedPath = path.resolve(filePath);

    // Security check
    if (this.isBlockedPath(resolvedPath)) {
      throw new Error('Access denied');
    }

    try {
      await fs.writeFile(resolvedPath, content, 'utf-8');
    } catch (e) {
      throw new Error(`Failed to write file: ${e}`);
    }
  }

  async searchFiles(pattern: string, searchPath: string): Promise<FileEntry[]> {
    const resolvedPath = path.resolve(searchPath);

    if (this.isBlockedPath(resolvedPath)) {
      throw new Error('Access denied');
    }

    const results: FileEntry[] = [];

    const search = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.name.includes(pattern)) {
            const stats = await fs.stat(fullPath);
            results.push({
              name: entry.name,
              path: fullPath,
              type: entry.isDirectory() ? 'dir' : 'file',
              size: stats.size,
              modified: stats.mtime.toISOString(),
            });
          }

          if (entry.isDirectory() && !entry.name.startsWith('.') && results.length < 100) {
            await search(fullPath);
          }
        }
      } catch (e) {
        // Skip directories we can't read
      }
    };

    await search(resolvedPath);
    return results;
  }

  private isBlockedPath(filePath: string): boolean {
    return BLOCKED_PATHS.some(blocked => filePath.startsWith(blocked));
  }
}

export const fileService = new FileService();
