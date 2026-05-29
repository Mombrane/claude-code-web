import { EventEmitter } from 'events';

// Terminal service that manages PTY processes per session
// Note: This is a simplified implementation using child_process
// For full PTY support, consider using node-pty or @lydell/node-pty

import { spawn, ChildProcess } from 'child_process';

interface TerminalSession {
  process: ChildProcess;
  sessionId: string;
}

export class TerminalService extends EventEmitter {
  private sessions: Map<string, TerminalSession> = new Map();

  startSession(sessionId: string): boolean {
    if (this.sessions.has(sessionId)) {
      return false; // Session already exists
    }

    try {
      // Spawn a shell process
      const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
      const childProcess = spawn(shell, [], {
        cwd: process.env.HOME || '/tmp',
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Handle stdout
      childProcess.stdout?.on('data', (data: Buffer) => {
        this.emit('output', sessionId, data.toString());
      });

      // Handle stderr
      childProcess.stderr?.on('data', (data: Buffer) => {
        this.emit('output', sessionId, data.toString());
      });

      // Handle process exit
      childProcess.on('exit', (code: number | null) => {
        this.emit('output', sessionId, `\r\nProcess exited with code ${code}\r\n`);
        this.sessions.delete(sessionId);
      });

      // Handle process error
      childProcess.on('error', (error: Error) => {
        this.emit('output', sessionId, `\r\nError: ${error.message}\r\n`);
        this.sessions.delete(sessionId);
      });

      this.sessions.set(sessionId, {
        process: childProcess,
        sessionId,
      });

      return true;
    } catch (error) {
      console.error('Failed to start terminal session:', error);
      return false;
    }
  }

  writeToSession(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    try {
      session.process.stdin?.write(data);
      return true;
    } catch (error) {
      console.error('Failed to write to terminal:', error);
      return false;
    }
  }

  resizeSession(sessionId: string, cols: number, rows: number): boolean {
    // Note: Full resize support requires node-pty
    // This is a no-op for the simplified implementation
    return true;
  }

  killSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    try {
      session.process.kill();
      this.sessions.delete(sessionId);
      return true;
    } catch (error) {
      console.error('Failed to kill terminal session:', error);
      return false;
    }
  }

  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  killAllSessions(): void {
    for (const [sessionId, session] of this.sessions) {
      try {
        session.process.kill();
      } catch (error) {
        console.error(`Failed to kill terminal session ${sessionId}:`, error);
      }
    }
    this.sessions.clear();
  }
}

export const terminalService = new TerminalService();
