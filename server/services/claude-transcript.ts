import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { Message, ToolExecutionContent } from '../types';

/**
 * Reads Claude Code's native .jsonl transcript files.
 * These are the authoritative source for conversation history.
 */

export const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

/** Metadata about a tool_use block collected from assistant messages. */
interface ToolUseInfo {
  toolName: string;
  input: Record<string, unknown>;
}

/**
 * Convert a project path to Claude Code's directory name format.
 * e.g. /home/user/project -> -home-user-project
 */
export function projectPathToDirName(projectPath: string): string {
  return projectPath.replace(/\//g, '-');
}

/**
 * Get the .jsonl file path for a given session.
 */
export function getTranscriptPath(sessionId: string, projectPath: string): string {
  const dirName = projectPathToDirName(projectPath);
  return path.join(CLAUDE_PROJECTS_DIR, dirName, `${sessionId}.jsonl`);
}

/**
 * First pass: extract tool_use metadata from a JSONL line.
 * Returns a map of toolUseId → { toolName, input } for any tool_use blocks found.
 */
function collectToolUseInfo(line: string): Map<string, ToolUseInfo> {
  const map = new Map<string, ToolUseInfo>();
  try {
    const entry = JSON.parse(line);
    if (entry.type === 'assistant' && Array.isArray(entry.message?.content)) {
      for (const block of entry.message.content) {
        if (block.type === 'tool_use' && block.id) {
          map.set(block.id, {
            toolName: block.name,
            input: block.input,
          });
        }
      }
    }
  } catch {
    // Ignore parse errors
  }
  return map;
}

/**
 * Parse a single JSONL line into Messages if it's a user/assistant message.
 * Returns an array to support multiple content blocks (text, thinking, tool_use).
 *
 * toolUseMap provides metadata from earlier tool_use blocks so that tool_result
 * entries can be emitted as complete ToolExecutionContent messages.
 */
function parseLine(
  line: string,
  sessionId: string,
  toolUseMap: Map<string, ToolUseInfo>
): Message[] {
  try {
    const entry = JSON.parse(line);
    const messages: Message[] = [];

    if (entry.type === 'user' && entry.message?.content) {
      const content = entry.message.content;

      if (Array.isArray(content)) {
        // Check for tool_result blocks in array content
        const hasToolResults = content.some(
          (block: any) => block.type === 'tool_result'
        );

        if (hasToolResults) {
          // Emit tool_result blocks as tool_execution messages
          let resultIndex = 0;
          for (const block of content) {
            if (block.type === 'tool_result') {
              const toolInfo = toolUseMap.get(block.tool_use_id);
              const toolExecutionContent: ToolExecutionContent = {
                toolName: toolInfo?.toolName || 'unknown',
                toolUseId: block.tool_use_id,
                input: toolInfo?.input || {},
                output: typeof block.content === 'string'
                  ? block.content
                  : JSON.stringify(block.content),
                isError: block.is_error || false,
                status: block.is_error ? 'error' : 'completed',
              };
              messages.push({
                id: `tool-exec-${entry.uuid || entry.timestamp}-${resultIndex}`,
                role: 'assistant',
                type: 'tool_execution',
                content: toolExecutionContent,
                timestamp: entry.timestamp,
                sessionId,
              });
              resultIndex++;
            }
          }

          // Also emit any text blocks in the same array as user text messages
          let textIndex = 0;
          for (const block of content) {
            if (block.type === 'text' && block.text) {
              messages.push({
                id: `user-text-${entry.uuid || entry.timestamp}-${textIndex}`,
                role: 'user',
                type: 'text',
                content: block.text,
                timestamp: entry.timestamp,
                sessionId,
              });
              textIndex++;
            }
          }
        } else {
          // Array content without tool_results — stringify as before
          messages.push({
            id: entry.uuid || `user-${entry.timestamp}`,
            role: 'user',
            type: 'text',
            content: JSON.stringify(content),
            timestamp: entry.timestamp,
            sessionId,
          });
        }
      } else {
        // Plain string content — regular user text message
        messages.push({
          id: entry.uuid || `user-${entry.timestamp}`,
          role: 'user',
          type: 'text',
          content: typeof content === 'string' ? content : JSON.stringify(content),
          timestamp: entry.timestamp,
          sessionId,
        });
      }
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
 *
 * Uses a two-pass approach:
 *   1. Collect tool_use metadata from all assistant messages
 *   2. Parse each line with the full tool_use map so tool_result
 *      entries can reference the corresponding tool name and input
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

    // Pass 1: Build the tool_use info map across all lines
    const toolUseMap = new Map<string, ToolUseInfo>();
    for (const line of lines) {
      const info = collectToolUseInfo(line);
      for (const [id, meta] of info) {
        toolUseMap.set(id, meta);
      }
    }

    // Pass 2: Parse all lines with the complete toolUseMap
    let messages: Message[] = [];
    for (const line of lines) {
      const msgs = parseLine(line, sessionId, toolUseMap);
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
 * Search through a transcript file for matching text.
 * Returns matching snippets with context.
 */
export async function searchTranscript(
  sessionId: string,
  projectPath: string,
  query: string
): Promise<Array<{ text: string; role: string; timestamp: string }>> {
  const filePath = getTranscriptPath(sessionId, projectPath);
  const queryLower = query.toLowerCase();
  const matches: Array<{ text: string; role: string; timestamp: string }> = [];

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        let textContent = '';

        // Extract text content from different entry types
        if (entry.type === 'user' && entry.message?.content) {
          if (typeof entry.message.content === 'string') {
            textContent = entry.message.content;
          } else if (Array.isArray(entry.message.content)) {
            textContent = entry.message.content
              .filter((block: any) => block.type === 'text')
              .map((block: any) => block.text)
              .join(' ');
          }
        } else if (entry.type === 'assistant' && entry.message?.content) {
          if (Array.isArray(entry.message.content)) {
            textContent = entry.message.content
              .filter((block: any) => block.type === 'text')
              .map((block: any) => block.text)
              .join(' ');
          }
        }

        // Check if query matches
        if (textContent && textContent.toLowerCase().includes(queryLower)) {
          // Extract a snippet around the match
          const idx = textContent.toLowerCase().indexOf(queryLower);
          const start = Math.max(0, idx - 50);
          const end = Math.min(textContent.length, idx + query.length + 50);
          const snippet = (start > 0 ? '...' : '') + 
                         textContent.slice(start, end) + 
                         (end < textContent.length ? '...' : '');

          matches.push({
            text: snippet,
            role: entry.type === 'user' ? 'user' : 'assistant',
            timestamp: entry.timestamp || '',
          });

          // Limit to 3 matches per session
          if (matches.length >= 3) break;
        }
      } catch {
        // Skip invalid JSON lines
      }
    }
  } catch {
    // File doesn't exist or can't be read
  }

  return matches;
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
