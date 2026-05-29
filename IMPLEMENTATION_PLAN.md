# Claude Code Web - 功能完善实施计划

## 现状分析

### 当前架构
- **前端**: React 19 + TypeScript + Vite + Tailwind CSS 4 + Zustand
- **后端**: Express 5 + WebSocket (ws)
- **已有功能**: 基础会话管理、聊天面板、文件浏览器、Git 面板、终端、设置

### 对标 OpenCode 需要补充的功能
1. **工作区/项目选择** - 首页项目列表、目录选择器
2. **对话历史管理** - 按时间分组、搜索、分页
3. **对话展示优化** - 工具调用展示、流式输出、消息类型丰富化
4. **审查/Diff 功能** - Git diff 查看器、文件变更审查

---

## 功能点分解

### Feature 1: 工作区选择 (Workspace Selection)
**目标**: 实现类似 OpenCode 首页的项目选择界面

#### 1.1 后端 - 项目管理 API
- `GET /api/projects` - 列出所有项目
- `POST /api/projects` - 添加项目（传入目录路径）
- `DELETE /api/projects/:id` - 删除项目
- `GET /api/projects/current` - 获取当前项目

#### 1.2 前端 - 首页组件
- 项目列表侧边栏（左侧 280px）
- 项目头像/图标
- 目录选择对话框
- 项目切换后跳转到会话页

#### 1.3 路由改造
- `/` - 首页（项目选择 + 会话列表）
- `/:dir/session/:id?` - 会话页（dir 为 base64 编码的项目路径）

---

### Feature 2: 对话历史管理 (Session History)
**目标**: 会话列表按时间分组，支持搜索和分页

#### 2.1 后端增强
- `GET /api/sessions` 增加参数: `projectPath`, `search`, `limit`, `offset`
- 会话数据增加 `projectPath` 字段

#### 2.2 前端 - 会话列表改造
- 按时间分组: Today / Yesterday / Older
- 搜索过滤
- 状态指示器（工作中、权限警告、错误）
- 会话卡片显示: 标题、项目名、时间、消息数

---

### Feature 3: 对话展示优化 (Message Display)
**目标**: 丰富消息类型展示，优化流式输出体验

#### 3.1 消息类型增强
- ToolPart: 工具调用卡片（折叠/展开、输入/输出）
- ReasoningPart: 思考过程块
- FilePart: 文件引用卡片
- StepStart/StepFinish: 步骤标记
- PatchPart: 代码变更块

#### 3.2 流式输出优化
- 打字机效果
- 实时 Markdown 渲染
- 流式状态指示器

#### 3.3 消息操作
- 复制消息
- 重新生成
- 删除消息

---

### Feature 4: 审查/Diff 功能 (Review)
**目标**: 实现 Git diff 查看和文件变更审查

#### 4.1 后端 - Diff API
- `GET /api/git/diff` - 获取 diff（已实现）
- `GET /api/git/diff/branch` - 分支 diff
- `GET /api/session/:id/changes` - 会话产生的变更

#### 4.2 前端 - Diff 查看器组件
- 并排 diff 视图
- 行内 diff 高亮
- 文件变更列表
- 审查模式切换（git diff / branch diff / turn diff）

---

## 实施顺序

```
Phase 1: 工作区选择 (Workspace)
  ├─ 1.1 后端项目管理 API
  ├─ 1.2 前端首页组件
  └─ 1.3 路由改造

Phase 2: 对话历史管理 (History)
  ├─ 2.1 后端 API 增强
  └─ 2.2 前端会话列表改造

Phase 3: 对话展示优化 (Display)
  ├─ 3.1 消息类型增强
  ├─ 3.2 流式输出优化
  └─ 3.3 消息操作

Phase 4: 审查/Diff 功能 (Review)
  ├─ 4.1 Diff API
  └─ 4.2 Diff 查看器组件
```

---

## 测试流程

### 每个功能点的验证步骤
1. **单元测试**: 组件渲染、API 响应
2. **集成测试**: 前后端联调
3. **手动测试**: 浏览器验证 UI 交互
4. **回归测试**: 确保已有功能不受影响

### 验证命令
```bash
# 启动开发服务器
cd /home/huguangyao/mimo-workspace/claude-code-web
npm run dev

# 类型检查
npx tsc --noEmit

# 构建验证
npm run build
```
