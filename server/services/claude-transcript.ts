import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { Message } from '../types';

/**
 * Reads Claude Code's native .jsonl transcript files.
 * These are the authoritative source for conversation history.
 */

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

/**
 * Convert a project path to Claude Code's directory name format.
 * e.g. /home/user/project -> -home-user-project
 */
function projectPathToDirName(projectPath: string): string {
  return projectPath.replace(/\//g, '-');
}

/**
 * Get the .jsonl file path for a given session.
 */
function getTranscriptPath(sessionId: string, projectPath: string): string {
  const dirName = projectPathToDirName(projectPath);
  return path.join(CLAUDE_PROJECTS_DIR, dirName, `${sessionId}.jsonl`);
}

/**
 * Parse a single JSONL line into Messages if it's a user/assistant message.
 * Returns an array to support multiple content blocks (text, thinking, tool_use).
 */
function parseLine(line: string, sessionId: string): Message[] {
  try {
    const entry = JSON.parse(line);
    const messages: Message[] = [];

    if (entry.type === 'user' && entry.message?.content) {
      messages.push({
        id: entry.uuid || `user-${entry.timestamp}`,
        role: 'user',
        type: 'text',
        content: typeof entry.message.content === 'string'
          ? entry.message.content
          : JSON.stringify(entry.message.content),
        timestamp: entry.timestamp,
        sessionId,
      });
    }

    if (entry.type === 'assistant' && entry.message?.content) {
      const blocks = entry.message.content;

      for (const block of blocks) {
        switch (block.type) {
          case 'thinking':
            messages.push({
              id: `thinking-${entry.uuid}-${messages.length}`,
              role: 'assistant',
              type: 'thinking',
              content: block.thinking,
              timestamp: entry.timestamp,
              sessionId,
            });
            break;

          case 'text':
            messages.push({
              id: `text-${entry.uuid}-${messages.length}`,
              role: 'assistant',
              type: 'text',
              content: block.text,
              timestamp: entry.timestamp,
              sessionId,
            });
            break;

          case 'tool_use':
            messages.push({
              id: block.id || `tool-${entry.uuid}-${messages.length}`,
              role: 'assistant',
              type: 'tool_use',
              content: {
                toolName: block.name,
                toolUseId: block.id,
                input: block.input,
              },
              timestamp: entry.timestamp,
              sessionId,
            });
            break;
        }
      }
    }

    return messages;
  } catch {
    return [];
  }
}

/**
 * Read messages from a Claude Code transcript file.
 * Supports pagination via offset, limit, and reverse options.
 */
export async function readTranscript(
  sessionId: string,
  projectPath: string,
  options?: {
    offset?: number;  // Skip the first N messages
    limit?: number;   // Return at most N messages
    reverse?: boolean; // Reverse order (newest first)
  }
): Promise<Message[]> {
  const filePath = getTranscriptPath(sessionId, projectPath);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    let messages: Message[] = [];
    for (const line of lines) {
      const msgs = parseLine(line, sessionId);
      messages.push(...msgs);
    }

    // Reverse if requested
    if (options?.reverse) {
      messages.reverse();
    }

    // Apply offset (skip first N messages)
    if (options?.offset !== undefined && options.offset > 0) {
      messages = messages.slice(options.offset);
    }

    // Apply limit (return at most N messages)
    if (options?.limit !== undefined && options.limit > 0) {
      messages = messages.slice(0, options.limit);
    }

    return messages;
  } catch (e) {
    // File doesn't exist or can't be read
    return [];
  }
}

/**
 * Check if a transcript file exists for a session.
 */
export async function transcriptExists(
  sessionId: string,
  projectPath: string
): Promise<boolean> {
  const filePath = getTranscriptPath(sessionId, projectPath);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * List all transcript files for a project.
 * Returns session IDs that have transcripts.
 */
export async function listTranscripts(projectPath: string): Promise<string[]> {
  const dirName = projectPathToDirName(projectPath);
  const dirPath = path.join(CLAUDE_PROJECTS_DIR, dirName);

  try {
    const files = await fs.readdir(dirPath);
    return files
      .filter(f => f.endsWith('.jsonl'))
      .map(f => f.replace('.jsonl', ''));
  } catch {
    return [];
  }
}
