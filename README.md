# Claude Code Web Interface

一个基于 Web 的 Claude Code 界面，将 CLI 体验转化为网页端。

## 功能特性

- 🌐 **Web 对话界面** - 通过网页与 Claude Code 交互
- 💬 **流式响应** - 实时显示 Claude 的回复
- 🔧 **工具调用展示** - 可视化展示工具调用过程
- 📁 **会话管理** - 创建、切换、删除会话
- 💾 **历史持久化** - 保存对话历史记录
- ⚡ **WebSocket 通信** - 实时双向通信

## 技术栈

### 前端
- React 19 + TypeScript
- Vite 6
- Tailwind CSS 4
- Zustand (状态管理)
- react-markdown (Markdown 渲染)

### 后端
- Node.js + Express 5
- WebSocket (ws)
- simple-git (Git 集成)

## 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

这将同时启动:
- 前端: http://localhost:5173
- 后端: http://localhost:3001

### 单独启动

**前端:**
```bash
npm run dev:client
```

**后端:**
```bash
npm run dev:server
```

## API 接口

### 会话管理
- `GET /api/sessions` - 获取所有会话
- `POST /api/sessions` - 创建新会话
- `GET /api/sessions/:id` - 获取单个会话
- `PATCH /api/sessions/:id` - 更新会话
- `DELETE /api/sessions/:id` - 删除会话

### 文件管理
- `GET /api/files/tree?path=` - 列出目录
- `GET /api/files/content?path=` - 读取文件
- `PUT /api/files/content` - 写入文件
- `GET /api/files/search?q=&path=` - 搜索文件

### Git 操作
- `GET /api/git/status?cwd=` - Git 状态
- `GET /api/git/diff?cwd=&staged=` - Git Diff
- `GET /api/git/log?cwd=&count=` - 提交历史
- `POST /api/git/stage` - 暂存文件
- `POST /api/git/commit` - 提交

### WebSocket
- `ws://localhost:3001/ws` - 实时通信

## 项目结构

```
claude-code-web/
├── server/                    # 后端
│   ├── index.ts              # Express + WebSocket 入口
│   ├── services/
│   │   ├── claude-process.ts # Claude 子进程管理
│   │   ├── session-store.ts  # 会话持久化
│   │   ├── file-service.ts   # 文件操作
│   │   └── git-service.ts    # Git 操作
│   ├── routes/               # REST API
│   └── websocket/            # WebSocket 处理
├── src/                       # 前端
│   ├── components/
│   │   ├── chat/             # 对话组件
│   │   └── layout/           # 布局组件
│   ├── stores/               # 状态管理
│   └── api/                  # API 客户端
└── data/sessions/            # 会话存储
```

## 环境变量

创建 `.env` 文件:
```env
PORT=3001
DATA_DIR=./data/sessions
DEFAULT_MODEL=claude-sonnet-4-20250514
DEFAULT_CWD=/path/to/your/project
SESSION_TIMEOUT=1800000
```

## 开发进度

- [x] 项目脚手架
- [x] 后端核心服务
- [x] 前端核心组件
- [x] 会话管理功能
- [ ] 文件管理功能
- [ ] Git 集成功能
- [ ] 终端面板

## License

MIT
