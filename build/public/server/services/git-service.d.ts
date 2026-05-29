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
export declare class GitService {
    private git;
    constructor();
    getStatus(cwd: string): Promise<GitStatus>;
    getDiff(cwd: string, staged?: boolean): Promise<string>;
    getLog(cwd: string, count?: number): Promise<CommitInfo[]>;
    getBranches(cwd: string): Promise<string[]>;
    stage(cwd: string, files: string[]): Promise<void>;
    unstage(cwd: string, files: string[]): Promise<void>;
    commit(cwd: string, message: string): Promise<string>;
}
export declare const gitService: GitService;
//# sourceMappingURL=git-service.d.ts.map