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
export declare class FileService {
    listDirectory(dirPath: string): Promise<FileEntry[]>;
    readFile(filePath: string, startLine?: number, count?: number): Promise<FileContent>;
    writeFile(filePath: string, content: string): Promise<void>;
    searchFiles(pattern: string, searchPath: string): Promise<FileEntry[]>;
    private isBlockedPath;
}
export declare const fileService: FileService;
//# sourceMappingURL=file-service.d.ts.map