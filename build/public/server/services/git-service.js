import simpleGit from 'simple-git';
export class GitService {
    constructor() {
        this.git = simpleGit();
    }
    async getStatus(cwd) {
        try {
            const git = simpleGit(cwd);
            const status = await git.status();
            return {
                branch: status.current || 'unknown',
                ahead: status.ahead,
                behind: status.behind,
                staged: status.staged,
                unstaged: status.modified.concat(status.deleted),
                untracked: status.not_added,
            };
        }
        catch (e) {
            throw new Error(`Failed to get git status: ${e}`);
        }
    }
    async getDiff(cwd, staged = false) {
        try {
            const git = simpleGit(cwd);
            if (staged) {
                return await git.diff(['--staged']);
            }
            return await git.diff();
        }
        catch (e) {
            throw new Error(`Failed to get git diff: ${e}`);
        }
    }
    async getLog(cwd, count = 20) {
        try {
            const git = simpleGit(cwd);
            const log = await git.log({ maxCount: count });
            return log.all.map(commit => ({
                hash: commit.hash.substring(0, 7),
                author: commit.author_name,
                date: commit.date,
                message: commit.message,
            }));
        }
        catch (e) {
            throw new Error(`Failed to get git log: ${e}`);
        }
    }
    async getBranches(cwd) {
        try {
            const git = simpleGit(cwd);
            const branches = await git.branchLocal();
            return branches.all;
        }
        catch (e) {
            throw new Error(`Failed to get branches: ${e}`);
        }
    }
    async stage(cwd, files) {
        try {
            const git = simpleGit(cwd);
            await git.add(files);
        }
        catch (e) {
            throw new Error(`Failed to stage files: ${e}`);
        }
    }
    async unstage(cwd, files) {
        try {
            const git = simpleGit(cwd);
            await git.reset(['HEAD', ...files]);
        }
        catch (e) {
            throw new Error(`Failed to unstage files: ${e}`);
        }
    }
    async commit(cwd, message) {
        try {
            const git = simpleGit(cwd);
            const result = await git.commit(message);
            return result.commit;
        }
        catch (e) {
            throw new Error(`Failed to commit: ${e}`);
        }
    }
}
export const gitService = new GitService();
//# sourceMappingURL=git-service.js.map