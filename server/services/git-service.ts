import simpleGit, { SimpleGit, StatusResult, LogResult } from 'simple-git';

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export interface CommitInfo {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export class GitService {
  private git: SimpleGit;

  constructor() {
    this.git = simpleGit();
  }

  async getStatus(cwd: string): Promise<GitStatus> {
    try {
      const git = simpleGit(cwd);
      const status: StatusResult = await git.status();

      return {
        branch: status.current || 'unknown',
        ahead: status.ahead,
        behind: status.behind,
        staged: status.staged,
        unstaged: status.modified.concat(status.deleted),
        untracked: status.not_added,
      };
    } catch (e) {
      throw new Error(`Failed to get git status: ${e}`);
    }
  }

  async getDiff(cwd: string, staged: boolean = false): Promise<string> {
    try {
      const git = simpleGit(cwd);
      if (staged) {
        return await git.diff(['--staged']);
      }
      return await git.diff();
    } catch (e) {
      throw new Error(`Failed to get git diff: ${e}`);
    }
  }

  async getBranchDiff(cwd: string, baseBranch?: string): Promise<string> {
    try {
      const git = simpleGit(cwd);
      const branch = baseBranch || 'main';
      return await git.diff([branch]);
    } catch (e) {
      throw new Error(`Failed to get branch diff: ${e}`);
    }
  }

  async getFileDiff(cwd: string, filePath: string): Promise<string> {
    try {
      const git = simpleGit(cwd);
      return await git.diff(['--', filePath]);
    } catch (e) {
      throw new Error(`Failed to get file diff: ${e}`);
    }
  }

  async getDiffStat(cwd: string): Promise<{ file: string; additions: number; deletions: number }[]> {
    try {
      const git = simpleGit(cwd);
      const diffStat = await git.diff(['--stat']);
      const lines = diffStat.split('\n').filter(l => l.includes('|'));
      return lines.map(line => {
        const parts = line.split('|');
        const file = parts[0].trim();
        const changes = parts[1].trim();
        const additions = (changes.match(/\+/g) || []).length;
        const deletions = (changes.match(/-/g) || []).length;
        return { file, additions, deletions };
      });
    } catch (e) {
      throw new Error(`Failed to get diff stat: ${e}`);
    }
  }

  async getLog(cwd: string, count: number = 20): Promise<CommitInfo[]> {
    try {
      const git = simpleGit(cwd);
      const log: LogResult = await git.log({ maxCount: count });

      return log.all.map(commit => ({
        hash: commit.hash.substring(0, 7),
        author: commit.author_name,
        date: commit.date,
        message: commit.message,
      }));
    } catch (e) {
      throw new Error(`Failed to get git log: ${e}`);
    }
  }

  async getBranches(cwd: string): Promise<string[]> {
    try {
      const git = simpleGit(cwd);
      const branches = await git.branchLocal();
      return branches.all;
    } catch (e) {
      throw new Error(`Failed to get branches: ${e}`);
    }
  }

  async stage(cwd: string, files: string[]): Promise<void> {
    try {
      const git = simpleGit(cwd);
      await git.add(files);
    } catch (e) {
      throw new Error(`Failed to stage files: ${e}`);
    }
  }

  async unstage(cwd: string, files: string[]): Promise<void> {
    try {
      const git = simpleGit(cwd);
      await git.reset(['HEAD', ...files]);
    } catch (e) {
      throw new Error(`Failed to unstage files: ${e}`);
    }
  }

  async commit(cwd: string, message: string): Promise<string> {
    try {
      const git = simpleGit(cwd);
      const result = await git.commit(message);
      return result.commit;
    } catch (e) {
      throw new Error(`Failed to commit: ${e}`);
    }
  }
}

export const gitService = new GitService();
