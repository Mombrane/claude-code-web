export default {
  // Common
  'app.name': 'Claude Code Web',
  'app.version': 'v1.0.0',

  // Sidebar
  'sidebar.sessions': 'Sessions',
  'sidebar.files': 'Files',
  'sidebar.newSession': 'New Session',
  'sidebar.search': 'Search sessions...',
  'sidebar.noSessions': 'No sessions yet',
  'sidebar.noResults': 'No sessions matching "{query}"',
  'sidebar.createFirst': 'Create your first session',
  'sidebar.rename': 'Rename',
  'sidebar.delete': 'Delete',
  'sidebar.refresh': 'Refresh',
  'sidebar.title': 'Sidebar',

  // Time groups
  'time.today': 'Today',
  'time.yesterday': 'Yesterday',
  'time.thisWeek': 'This Week',
  'time.thisMonth': 'This Month',
  'time.older': 'Older',

  // Sidebar groups
  'sidebar.group.today': 'Today',
  'sidebar.group.yesterday': 'Yesterday',
  'sidebar.group.older': 'Older',

  // Chat
  'chat.ready': 'Ready',
  'chat.thinking': 'Claude is thinking...',
  'chat.messages': '{count} messages',
  'chat.welcome.title': 'Claude Code Web',
  'chat.welcome.subtitle': 'Select a session or create a new one to start coding with Claude',
  'chat.welcome.newSession': 'New Session',
  'chat.welcome.commands': 'Commands',

  // Input
  'input.placeholder': 'Type a message... (Shift+Enter for new line)',
  'input.placeholderStreaming': 'Claude is responding...',
  'input.send': 'Send',
  'input.stop': 'Stop',
  'input.chars': '{count} chars',
  'input.hint.enter': 'Send',
  'input.hint.shiftEnter': 'New line',
  'input.hint.esc': 'Clear',

  // Messages
  'message.toolCall': 'tool call',
  'message.toolResult': 'Tool Result',
  'message.thinking': 'Thinking',
  'message.error': 'Error',
  'message.copy': 'Copy',
  'message.copied': 'Copied!',
  'message.startConversation': 'Start a conversation to begin coding',
  'message.retry': 'Retry',
  'message.streaming': 'streaming...',

  // Tools
  'tool.read': 'Read',
  'tool.edit': 'Edit',
  'tool.write': 'Write',
  'tool.bash': 'Bash',
  'tool.grep': 'Grep',
  'tool.glob': 'Glob',
  'tool.agent': 'Agent',
  'tool.webFetch': 'WebFetch',
  'tool.webSearch': 'WebSearch',

  // Tool status
  'tool.status.pending': 'Pending',
  'tool.status.running': 'Running',
  'tool.status.completed': 'Done',
  'tool.status.error': 'Error',
  // File Explorer
  'fileExplorer.search': 'Search files...',
  'fileExplorer.loading': 'Loading...',


  // File Editor
  'editor.save': 'Save',
  'editor.revert': 'Revert',
  'editor.close': 'Close',
  'editor.modified': 'Modified',
  'editor.lines': '{count} lines',
  'editor.saving': 'Saving...',
  'editor.error': 'Failed to load file',
  'editor.retry': 'Try again',
  'editor.language': 'Language',
  'editor.encoding': 'UTF-8',
  'editor.spaces': 'Spaces: 2',

  // Git Panel
  'git.title': 'Git',
  'git.status': 'Status',
  'git.diff': 'Diff',
  'git.log': 'Log',
  'git.branch': 'Branch',
  'git.staged': 'Staged',
  'git.unstaged': 'Modified',
  'git.untracked': 'Untracked',
  'git.stage': 'Stage',
  'git.unstage': 'Unstage',
  'git.commit': 'Commit',
  'git.commitMessage': 'Commit message...',
  'git.noChanges': 'No changes',
  'git.noHistory': 'No commit history',

  // Terminal
  'terminal.title': 'Terminal',
  'terminal.clear': 'Clear',
  'terminal.placeholder': 'Type a command...',

  // Settings
  'settings.title': 'Settings',
  'settings.theme': 'Theme',
  'settings.theme.dark': 'Dark',
  'settings.theme.light': 'Light',
  'settings.model': 'Model',
  'settings.fontSize': 'Font Size',
  'settings.tabSize': 'Tab Size',
  'settings.wordWrap': 'Word Wrap',
  'settings.minimap': 'Minimap',
  'settings.save': 'Save',
  'settings.cancel': 'Cancel',

  // Command Palette
  'command.palette': 'Commands',
  'command.search': 'Search commands...',
  'command.noResults': 'No commands found',

  // Commands
  'command.newSession': 'New Session',
  'command.toggleFiles': 'Toggle Files Panel',
  'command.toggleTerminal': 'Toggle Terminal',
  'command.toggleGit': 'Toggle Git Panel',
  'command.openSettings': 'Open Settings',
  'command.toggleSidebar': 'Toggle Sidebar',

  // Status bar
  'status.connected': 'Connected',
  'status.disconnected': 'Disconnected',
  'status.reconnecting': 'Reconnecting...',
  'status.reconnect': 'Reconnect',
  'status.defaultModel': 'Default Model',

  // Confirmations
  'confirm.deleteSession': 'Are you sure you want to delete this session?',
  'confirm.revertChanges': 'Are you sure you want to revert changes?',

  // Errors
  'error.loadSessions': 'Failed to load sessions',
  'error.createSession': 'Failed to create session',
  'error.deleteSession': 'Failed to delete session',
  'error.renameSession': 'Failed to rename session',
  'error.loadFile': 'Failed to load file',
  'error.saveFile': 'Failed to save file',
  'error.connection': 'Connection error',

  // Diff Viewer
  'diff.expandAll': 'Expand All',
  'diff.collapseAll': 'Collapse All',
  'diff.noChanges': 'No changes detected',

  // Export
  'export.markdown': 'Export as Markdown',
  'export.button': 'Export',

  // Tool execution UI
  'tool.error': 'Error',
  'tool.executing': 'Executing...',
  'tool.running': 'Running',
  'tool.completed': 'Completed',
  'tool.noOutput': '(no output)',
  'tool.input': 'Input',

  // Step labels
  'step.label': 'Step',
  'step.complete': 'Step Complete',

  // Chat extra
  'chat.generationStopped': '[Generation stopped]',
  'chat.copyMessage': 'Copy message',

  // Input extra
  'input.attachFile': 'Attach file',
  'input.processing': '⏳ Processing...',
  'input.modelLabel': 'Claude Code',

  // Render errors
  'error.renderMessage': 'This message could not be rendered',

  // Search
  'search.placeholder': 'Search messages...',
  'search.matches': '{current} of {total}',
  'search.noResults': 'No results',
  'search.close': 'Close',

  // Keyboard shortcuts
  'shortcuts.title': 'Keyboard Shortcuts',
  'shortcuts.newSession': 'New Session',
  'shortcuts.commandPalette': 'Command Palette',
  'shortcuts.search': 'Search in conversation',
  'shortcuts.showShortcuts': 'Show keyboard shortcuts',
  'shortcuts.settings': 'Settings',
  'shortcuts.sendMessage': 'Send message',
  'shortcuts.newLine': 'New line in input',
  'shortcuts.close': 'Close search / Cancel',

  // Toast notifications
  'toast.copied': 'Copied!',
  'toast.copyFailed': 'Copy failed',
  'toast.exportSuccess': 'Exported!',
  'toast.exportFailed': 'Export failed',

  // Session rename
  'session.rename': 'Rename',
  'session.renameHint': 'Double-click to rename',
} as const;
