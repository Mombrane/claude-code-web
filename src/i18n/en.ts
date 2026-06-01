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
  'sidebar.duplicate': 'Duplicate',
  'sidebar.pin': 'Pin',
  'sidebar.unpin': 'Unpin',
  'sidebar.refresh': 'Refresh',
  'sidebar.title': 'Sidebar',
  'sidebar.newSessionTooltip': 'New Session (Ctrl+N)',
  'sidebar.lastMessage': 'Last message',
  'sidebar.clearSearch': 'Clear search',

  // Time groups
  'time.today': 'Today',
  'time.yesterday': 'Yesterday',
  'time.thisWeek': 'This Week',
  'time.thisMonth': 'This Month',
  'time.older': 'Older',
  'time.justNow': 'just now',
  'time.minutesAgo': '{n}m ago',
  'time.hoursAgo': '{n}h ago',
  'time.minutesShort': 'm',
  'time.hoursShort': 'h',
  'time.daysShort': 'd',

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
  'chat.ariaMessages': 'Chat messages',

  // Input
  'input.placeholder': 'Type a message... (Shift+Enter for new line)',
  'input.placeholderStreaming': 'Claude is responding...',
  'input.send': 'Send',
  'input.stop': 'Stop',
  'input.chars': '{count} chars',
  'input.hint.enter': 'Send',
  'input.hint.shiftEnter': 'New line',
  'input.hint.esc': 'Clear',
  'input.hint.escStop': 'Stop generation',
  'input.hint.history': 'History',

  // Messages
  'message.toolCall': 'tool call',
  'message.toolResult': 'Tool Result',
  'message.thinking': 'Thinking',
  'message.error': 'Error',
  'message.copy': 'Copy',
  'message.copied': 'Copied!',
  'message.copyFailed': 'Copy failed',
  'message.delete': 'Delete',
  'message.startConversation': 'Start a conversation to begin coding',
  'message.retry': 'Retry',
  'message.scrollToBottom': 'Scroll to bottom',
  'message.streaming': 'streaming...',
  'message.pin': 'Pin message',
  'message.unpin': 'Unpin message',
  'message.pinned': 'Pinned',
  'message.pinnedMessages': 'Pinned Messages',
  'message.pinnedEmpty': 'No pinned messages',
  'message.pinnedCount': '{count} pinned',

  // Chat cost/tokens
  'chat.cost': '${amount}',
  'chat.tokens': 'tokens',
  'chat.lastMessageCost': 'Last message cost',
  'chat.inputTokens': 'input',
  'chat.outputTokens': 'output',
  'chat.tokenBreakdown': 'Input / Output tokens (last message)',

  // Layout tooltips
  'layout.gitTooltip': 'Git Panel (Ctrl+G)',
  'layout.terminalTooltip': 'Terminal (Ctrl+`)',
  'layout.settingsTooltip': 'Settings (Ctrl+,)',
  'layout.timelineTooltip': 'Activity Timeline (Ctrl+T)',

  // Timeline
  'timeline.title': 'Timeline',
  'timeline.userMessage': 'User message',
  'timeline.assistantMessage': 'Assistant message',
  'timeline.toolCall': 'Tool call',
  'timeline.toolResult': 'Tool result',
  'timeline.thinking': 'Thinking',
  'timeline.error': 'Error',

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
  'tool.noResults': 'No results',

  // Tool status
  'tool.status.pending': 'Pending',
  'tool.status.running': 'Running',
  'tool.status.completed': 'Done',
  'tool.status.error': 'Error',
  // File Explorer
  'fileExplorer.search': 'Search files...',
  'fileExplorer.loading': 'Loading...',
  'fileExplorer.attachFiles': 'Attach Files',


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
  'editor.loading': 'Loading editor...',
  'editor.saveFailed': 'Failed to save file',

  // Git Panel
  'git.title': 'Git',
  'git.status': 'Status',
  'git.diff': 'Diff',
  'git.log': 'Log',
  'git.branch': 'Branch',
  'git.staged': 'Staged',
  'git.changes': 'Changes',
  'git.unstaged': 'Modified',
  'git.untracked': 'Untracked',
  'git.stage': 'Stage',
  'git.unstage': 'Unstage',
  'git.commit': 'Commit',
  'git.commitMessage': 'Commit message...',
  'git.noChanges': 'No changes',
  'git.noHistory': 'No commit history',
  'git.noProject': 'No project selected',
  'fileExplorer.noProject': 'No project selected',

  // Terminal
  'terminal.title': 'Terminal',
  'terminal.clear': 'Clear',
  'terminal.expand': 'Expand',
  'terminal.collapse': 'Collapse',
  'terminal.placeholder': 'Type a command...',

  // Settings
  'settings.title': 'Settings',
  'settings.theme': 'Theme',
  'settings.theme.dark': 'Dark',
  'settings.theme.light': 'Light',
  'settings.model': 'Model',
  'settings.modelDefault': 'Default (mimo-v2.5-pro)',
  'settings.fontSize': 'Font Size',
  'settings.tabSize': 'Tab Size',
  'settings.spaces': '{count} spaces',
  'settings.wordWrap': 'Word Wrap',
  'settings.on': 'On',
  'settings.off': 'Off',
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
  'command.duplicateSession': 'Duplicate Session',
  'command.toggleTimeline': 'Toggle Activity Timeline',

  // Status bar
  'status.connected': 'Connected',
  'status.disconnected': 'Disconnected',
  'status.reconnecting': 'Reconnecting...',
  'status.reconnect': 'Reconnect',
  'status.defaultModel': 'Default Model',
  'status.messages': '{count} messages',
  'status.streaming': 'Streaming',
  'status.error': 'Error',
  'status.active': 'Active',

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
  'tool.fileWritten': 'File written successfully',
  'tool.input': 'Input',
  'tool.groupSummary': '{count} tools executed',
  'tool.groupExpanded': 'expanded',
  'tool.groupCollapsed': 'collapsed',
  'tool.showMore': 'Show more',
  'tool.showLess': 'Show less',
  'tool.terminal': 'terminal',
  'tool.exitCode': 'exit {code}',

  // Step labels
  'step.label': 'Step',
  'step.complete': 'Step Complete',

  // Chat extra
  'chat.generationStopped': '[Generation stopped]',
  'chat.copyMessage': 'Copy message',
  'chat.scrollToBottom': 'Scroll to bottom',

  // Input extra
  'input.attachFile': 'Attach file',
  'input.processing': '⏳ Processing...',
  'input.modelLabel': 'Claude Code',
  'input.imageAttach': 'Image attached',
  'input.dropImage': 'Drop image here',
  'input.imageTooLarge': 'Image too large (max 5MB)',
  'input.imageReadError': 'Failed to read image',

  // Render errors
  'error.renderMessage': 'This message could not be rendered',

  // Search
  'search.placeholder': 'Search messages...',
  'search.matches': '{current} of {total}',
  'search.noResults': 'No results',
  'search.close': 'Close',
  'search.previous': 'Previous (Shift+Enter)',
  'search.next': 'Next (Enter)',
  'search.filterAll': 'All',
  'search.filterText': 'Text',
  'search.filterTools': 'Tools',
  'search.filterThinking': 'Thinking',
  'search.filterErrors': 'Errors',

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
  'shortcuts.toggleTheme': 'Toggle theme',
  'shortcuts.prevSession': 'Previous session',
  'shortcuts.nextSession': 'Next session',
  'shortcuts.focusInput': 'Focus input',
  'shortcuts.retry': 'Retry last message',
  'shortcuts.scrollToBottom': 'Scroll to bottom',
  'shortcuts.toggleTimeline': 'Toggle activity timeline',

  'shortcuts.toggleSidebar': 'Toggle sidebar',
  'shortcuts.duplicateSession': 'Duplicate current session',
  'diff.stagedChanges': 'Staged Changes',
  'diff.branchDiff': 'Branch Diff',
  'diff.workingChanges': 'Working Changes',
  'diff.fileCount': '{count} file{{s}}',

  // Toast notifications
  'toast.copied': 'Copied!',
  'toast.copyFailed': 'Copy failed',
  'toast.exportSuccess': 'Exported!',
  'toast.exportFailed': 'Export failed',
  'toast.sessionCreated': 'Session created',
  'toast.sessionDeleted': 'Session deleted',
  'toast.sessionDuplicated': 'Session duplicated',
  'toast.batchDeleteSuccess': '{count} sessions deleted',
  'toast.batchDeleteFailed': 'Failed to delete some sessions',

  // Session rename
  'session.rename': 'Rename',
  'session.renameHint': 'Double-click to rename',

  // Common
  'common.cancel': 'Cancel',

  // Home page
  'home.projects': 'Projects',
  'home.addProject': 'Add Project',
  'home.newSession': 'New Session',
  'home.selectProject': 'Select a project',
  'home.searchSessions': 'Search sessions...',
  'home.statistics': 'Statistics',
  'home.sessions': 'Sessions',
  'home.totalCost': 'Total Cost',
  'home.totalTokens': 'Total Tokens',
  'home.avgCost': 'Avg Cost',
  'home.mostExpensive': 'Most expensive:',
  'home.noSessionsMatch': 'No sessions matching "{query}"',
  'home.noSessions': 'No sessions yet',
  'home.createFirst': 'Create your first session',
  'home.projectPath': 'Project Directory Path',
  'home.projectPathPlaceholder': '/home/user/my-project',
  'home.confirmRemove': 'Remove this project from the list?',
  'home.today': 'Today',
  'home.yesterday': 'Yesterday',
  'home.older': 'Older',
  'home.removeProject': 'Remove project',

  // Common refresh
  'common.refresh': 'Refresh',

  // Sidebar extra
  'sidebar.sessionCount': '{count} sessions',

  // Sidebar select mode
  'sidebar.selectMode': 'Select',
  'sidebar.exitSelect': 'Exit Select',
  'sidebar.selectedCount': '{count} selected',
  'sidebar.selectAll': 'Select All',
  'sidebar.batchDelete': 'Delete Selected',
  'sidebar.batchDeleteConfirm': 'Are you sure you want to delete {count} sessions?',
  'sidebar.batchTag': 'Tag Selected',

  // Sidebar status filter
  'sidebar.filter.all': 'All',
  'sidebar.filter.active': 'Active',
  'sidebar.filter.idle': 'Idle',
  'sidebar.filter.closed': 'Closed',
  'sidebar.statusFilter': 'Filter by status',
  'sidebar.noFilterResults': 'No {filter} sessions',
  'sidebar.deepSearch': 'Search in messages',
  'sidebar.clearFilter': 'Clear filter',
  'sidebar.sortBy': 'Sort by',
  'sidebar.sortDate': 'Last active',
  'sidebar.sortCost': 'Cost',
  'sidebar.sortTokens': 'Tokens',
  'sidebar.sortCreated': 'Created',
  'sidebar.sortName': 'Name',

  // Tags
  'tags.label': 'Tags',
  'tags.add': 'Add tag',
  'tags.filter': 'Filter by tag',
  'tags.all': 'All tags',
  'tags.none': 'No tags',
  'tags.edit': 'Edit tags',
  'tags.placeholder': 'Enter tag name...',

  // Common loading
  'common.loading': 'Loading...',

  // Session tooltip
  'session.tooltip.name': 'Name',
  'session.tooltip.created': 'Created',
  'session.tooltip.lastActive': 'Last active',
  'session.tooltip.cost': 'Cost',
  'session.tooltip.tokens': 'Tokens',
  'session.tooltip.model': 'Model',
  'session.tooltip.status': 'Status',

  // Session notes
  'session.notes': 'Notes',
  'session.notes.edit': 'Edit Notes',
  'session.notes.placeholder': 'Add notes...',
  'session.notes.hasNotes': 'Has notes',
  'session.notes.updated': 'Notes updated',

  // Session context info
  'chat.sessionModel': 'Model',
  'chat.sessionPath': 'Path',
  'chat.sessionAge': 'Session age',

  // File change tracker
  'chat.filesModified': 'Files Modified',

  // Transcript viewer
  'transcript.title': 'Session Transcript',
  'transcript.view': 'View Transcript',
  'transcript.lines': 'lines',
  'transcript.copy': 'Copy',
  'transcript.copied': 'Copied!',
  'transcript.empty': 'No transcript available',
  'transcript.loadFailed': 'Failed to load transcript',

  // Tool usage stats
  'chat.toolStats': 'Tool Usage',
  'chat.toolStats.expand': 'Show tool usage',
  'chat.toolStats.collapse': 'Hide tool usage',
} as const;
