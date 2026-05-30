export default {
  // Common
  'app.name': 'Claude Code Web',
  'app.version': 'v1.0.0',

  // Sidebar
  'sidebar.sessions': '会话',
  'sidebar.files': '文件',
  'sidebar.newSession': '新建会话',
  'sidebar.search': '搜索会话...',
  'sidebar.noSessions': '暂无会话',
  'sidebar.noResults': '没有匹配 "{query}" 的会话',
  'sidebar.createFirst': '创建第一个会话',
  'sidebar.rename': '重命名',
  'sidebar.delete': '删除',
  'sidebar.refresh': '刷新',
  'sidebar.title': '侧边栏',

  // Time groups
  'time.today': '今天',
  'time.yesterday': '昨天',
  'time.thisWeek': '本周',
  'time.thisMonth': '本月',
  'time.older': '更早',

  // Sidebar groups
  'sidebar.group.today': '今天',
  'sidebar.group.yesterday': '昨天',
  'sidebar.group.older': '更早',

  // Chat
  'chat.ready': '就绪',
  'chat.thinking': 'Claude 思考中...',
  'chat.messages': '{count} 条消息',
  'chat.welcome.title': 'Claude Code Web',
  'chat.welcome.subtitle': '选择或创建一个会话，开始与 Claude 一起编程',
  'chat.welcome.newSession': '新建会话',
  'chat.welcome.commands': '命令',

  // Input
  'input.placeholder': '输入消息... (Shift+Enter 换行)',
  'input.placeholderStreaming': 'Claude 正在响应...',
  'input.send': '发送',
  'input.stop': '停止',
  'input.chars': '{count} 字符',
  'input.hint.enter': '发送',
  'input.hint.shiftEnter': '换行',
  'input.hint.esc': '清空',

  // Messages
  'message.toolCall': '工具调用',
  'message.toolResult': '工具结果',
  'message.thinking': '思考',
  'message.error': '错误',
  'message.copy': '复制',
  'message.copied': '已复制!',
  'message.startConversation': '开始对话以开始编程',
  'message.retry': '重试',
  'message.streaming': 'streaming...',

  // Tools
  'tool.read': '读取',
  'tool.edit': '编辑',
  'tool.write': '写入',
  'tool.bash': '命令行',
  'tool.grep': '搜索',
  'tool.glob': '文件匹配',
  'tool.agent': '代理',
  'tool.webFetch': '网页获取',
  'tool.webSearch': '网页搜索',

  // Tool status
  'tool.status.pending': '等待中',
  'tool.status.running': '运行中',
  'tool.status.completed': '完成',
  'tool.status.error': '错误',
  // File Explorer
  'fileExplorer.search': '搜索文件...',
  'fileExplorer.loading': '加载中...',


  // File Editor
  'editor.save': '保存',
  'editor.revert': '撤销',
  'editor.close': '关闭',
  'editor.modified': '已修改',
  'editor.lines': '{count} 行',
  'editor.saving': '保存中...',
  'editor.error': '加载文件失败',
  'editor.retry': '重试',
  'editor.language': '语言',
  'editor.encoding': 'UTF-8',
  'editor.spaces': '空格: 2',

  // Git Panel
  'git.title': 'Git',
  'git.status': '状态',
  'git.diff': '差异',
  'git.log': '日志',
  'git.branch': '分支',
  'git.staged': '已暂存',
  'git.unstaged': '已修改',
  'git.untracked': '未跟踪',
  'git.stage': '暂存',
  'git.unstage': '取消暂存',
  'git.commit': '提交',
  'git.commitMessage': '提交信息...',
  'git.noChanges': '没有更改',
  'git.noHistory': '没有提交历史',

  // Terminal
  'terminal.title': '终端',
  'terminal.clear': '清空',
  'terminal.placeholder': '输入命令...',

  // Settings
  'settings.title': '设置',
  'settings.theme': '主题',
  'settings.theme.dark': '深色',
  'settings.theme.light': '浅色',
  'settings.model': '模型',
  'settings.fontSize': '字体大小',
  'settings.tabSize': '制表符大小',
  'settings.wordWrap': '自动换行',
  'settings.minimap': '小地图',
  'settings.save': '保存',
  'settings.cancel': '取消',

  // Command Palette
  'command.palette': '命令面板',
  'command.search': '搜索命令...',
  'command.noResults': '没有找到命令',

  // Commands
  'command.newSession': '新建会话',
  'command.toggleFiles': '切换文件面板',
  'command.toggleTerminal': '切换终端',
  'command.toggleGit': '切换 Git 面板',
  'command.openSettings': '打开设置',
  'command.toggleSidebar': '切换侧边栏',

  // Status bar
  'status.connected': '已连接',
  'status.disconnected': '未连接',

  // Confirmations
  'confirm.deleteSession': '确定要删除这个会话吗？',
  'confirm.revertChanges': '确定要撤销更改吗？',

  // Errors
  'error.loadSessions': '加载会话失败',
  'error.createSession': '创建会话失败',
  'error.deleteSession': '删除会话失败',
  'error.renameSession': '重命名会话失败',
  'error.loadFile': '加载文件失败',
  'error.saveFile': '保存文件失败',
  'error.connection': '连接错误',

  // Diff Viewer
  'diff.expandAll': '展开全部',
  'diff.collapseAll': '折叠全部',
  'diff.noChanges': '没有检测到更改',

  // Export
  'export.markdown': '导出为 Markdown',
  'export.button': '导出',

  // Tool execution UI
  'tool.error': '错误',
  'tool.executing': '执行中...',
  'tool.running': '运行中',
  'tool.completed': '已完成',
  'tool.noOutput': '（无输出）',
  'tool.input': '输入',

  // Step labels
  'step.label': '步骤',
  'step.complete': '步骤完成',

  // Chat extra
  'chat.generationStopped': '[生成已停止]',
  'chat.copyMessage': '复制消息',

  // Input extra
  'input.attachFile': '附加文件',
  'input.processing': '⏳ 处理中...',
  'input.modelLabel': 'Claude Code',

  // Render errors
  'error.renderMessage': '此消息无法渲染',

  // Search
  'search.placeholder': '搜索消息...',
  'search.matches': '{current} / {total}',
  'search.noResults': '无结果',
  'search.close': '关闭',

  // Keyboard shortcuts
  'shortcuts.title': '键盘快捷键',
  'shortcuts.newSession': '新建会话',
  'shortcuts.commandPalette': '命令面板',
  'shortcuts.search': '搜索对话',
  'shortcuts.showShortcuts': '显示键盘快捷键',
  'shortcuts.settings': '设置',
  'shortcuts.sendMessage': '发送消息',
  'shortcuts.newLine': '输入中换行',
  'shortcuts.close': '关闭搜索 / 取消',

  // Toast notifications
  'toast.copied': '已复制！',
  'toast.copyFailed': '复制失败',
  'toast.exportSuccess': '已导出！',
  'toast.exportFailed': '导出失败',

  // Session rename
  'session.rename': '重命名',
  'session.renameHint': '双击重命名',
} as const;
