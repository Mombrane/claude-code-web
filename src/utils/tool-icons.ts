/**
 * Shared tool icon mapping used by ToolExecutionCard, ToolGroupCard, and ChatPanel.
 */
export const TOOL_ICONS: Record<string, string> = {
  bash: '💻', read: '📖', edit: '✏️', write: '📝', grep: '🔍',
  glob: '📂', webfetch: '🌐', websearch: '🔎', todowrite: '📋',
  task: '📋', skill: '🛠️', mcp: '🔌', file: '📄', patch: '🩹',
  ls: '📁', notebook: '📓', agent: '🤖', think: '💭',
};

/**
 * Get the icon for a given tool name.
 * Normalises the tool name to lowercase before lookup.
 * Falls back to a generic wrench icon when unknown.
 */
export function getToolIcon(toolName: string): string {
  return TOOL_ICONS[toolName.toLowerCase()] || '🔧';
}
