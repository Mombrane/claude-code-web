# Claude Code Web 错误报告

**测试时间：** 2026-05-29 12:15 UTC  
**测试环境：** Ubuntu 26.04, Chrome 149 (headless), Node.js  
**测试方法：** agent-browser 自动化测试 + API 手动验证  

---

## 测试概览

| 功能模块 | 状态 | 严重程度 |
|----------|------|----------|
| 服务启动 | ✅ 正常 | - |
| 首页加载 | ✅ 正常 | - |
| 会话列表 | ✅ 正常 | - |
| Files 面板 | ✅ 正常 | - |
| Git 面板 | ✅ 正常 | - |
| Terminal 面板 | ✅ 正常 | - |
| WebSocket 连接 | ✅ 正常 | - |
| **消息加载** | ❌ 失败 |   **高** |
| **文件编辑器** | ❌ 失败 |   **高** |
| **HTML 嵌套** | ⚠️ 警告 |   **中** |
| **会话命名** | ⚠️ 体验差 |   **低** |

---

##   Bug #1: 消息加载失败（0 messages）

### 严重程度： 高

### 描述
点击会话后，聊天界面显示 "0 messages"，无法加载历史对话。

### 根因分析
**Session ID 不匹配问题：**

Web UI 创建的 session 使用自生成的 UUID（如 `6c13cfc4-9874-4b19-9912-f3b2ebf64928`），但 Claude Code CLI 生成的 `.jsonl` transcript 文件使用不同的 session ID。

**验证结果：**

```bash
# Session store 中的 session ID
6c13cfc4-9874-4b19-9912-f3b2ebf64928

# 对应的 .jsonl 文件
~/.claude/projects/-home-huguangyao-mimo-workspace-claude-code-web/6c13cfc4-9874-4b19-9912-f3b2ebf64928.jsonl
# 结果：FILE NOT FOUND

# 有 .jsonl 文件的 session
0155de1d-1a02-4e6c-ac11-8c7fe57fbbc0.jsonl  ✅ 存在
# 但在 session store 中查询
GET /api/sessions/0155de1d-1a02-4e6c-ac11-8c7fe57fbbc0
# 结果：Session not found
```

### 影响
- 所有通过 Web UI 创建的会话都无法显示历史消息
- Claude Code CLI 产生的 transcript 数据无法被 Web UI 读取
- 消息存储去重重构（`claude-transcript` 服务）未生效

### 建议修复
1. **方案 A**：Web UI 创建会话时，使用 Claude Code CLI 的 session ID（从 `claude -p --output-format stream-json` 的 init 事件中获取）
2. **方案 B**：建立 session ID 映射表，将 Web UI 的 UUID 映射到 Claude Code 的 session ID
3. **方案 C**：回退到从 session store 的 `messages` 字段读取（当前 API 仍返回 messages 数据）

---

##   Bug #2: 文件编辑器不工作

### 严重程度： 高

### 描述
在 Files 面板点击文件后，Monaco Editor 编辑器没有打开，界面无任何反应。

### 复现步骤
1. 进入会话页面
2. 点击顶部 "Files" 按钮
3. 在文件树中点击任意文件（如 README.md）
4. 预期：右侧打开 Monaco Editor 编辑器
5. 实际：界面无变化，编辑器未显示

### 可能原因
- Monaco Editor 组件可能未正确加载或渲染
- 文件点击事件可能未正确绑定
- 编辑器组件可能被条件渲染阻止

### 建议修复
1. 检查 `FileEditor.tsx` 组件的挂载逻辑
2. 检查文件点击事件处理函数
3. 验证 Monaco Editor 依赖是否正确安装

---

##   Bug #3: HTML Button 嵌套错误

### 严重程度： 中

### 描述
React 控制台报错：`In HTML, <button> cannot be a descendant of <button>`

### 错误位置
```
HomePage > Sidebar > Project List
  <button> (项目按钮)
    <button> (Remove project 按钮)
```

### 影响
- React hydration warning
- 可能导致无障碍性问题
- 不影响功能但不符合 HTML 规范

### 建议修复
将内层 `<button>` 改为 `<span>` 或 `<div role="button">`，或使用事件冒泡处理。

---

##   Bug #4: 会话命名体验差

### 严重程度： 低

### 描述
大部分会话名称为自动生成的时间戳（如 "Session 2026/5/29 16:41:05"），缺乏语义信息。

### 当前状态
- 22 个会话中只有 1 个被手动重命名为 "Renamed Session"
- 其余 21 个都是 "Session + 时间戳" 格式

### 建议改进
1. 自动使用用户的第一条消息作为会话名称（截取前 50 字符）
2. 或使用 Claude 的第一条回复作为摘要
3. 提供批量重命名功能

---

##   测试通过的功能

### ✅ 服务架构
- 后端 API (port 3001) 正常运行
- 前端 Dev Server (port 5173) 正常运行
- WebSocket 连接正常，支持自动重连

### ✅ 会话管理
- 会话列表正确显示 22 个会话
- 按日期分组（TODAY / OLDER）
- 显示费用统计（如 $0.0992）
- 支持搜索、重命名、删除

### ✅ Files 面板
- 文件树正确加载
- 显示文件夹和文件
- 显示文件大小
- 支持搜索

### ✅ Git 面板
- 显示当前分支（main）
- 显示 18 个修改文件
- 显示未跟踪文件
- 支持 Stage/Track 操作
- Status/Diff/Log 切换

### ✅ Terminal 面板
- 显示 "Connected" 状态
- 有输入框
- 支持 Clear/Collapse 操作

### ✅ 国际化
- 搜索框显示中文"搜索会话..."
- 支持中英文切换

---

##   总结

### 关键发现
1. **核心功能缺陷**：消息加载完全失效，这是最严重的问题
2. **文件编辑器不可用**：Monaco Editor 未正确工作
3. **HTML 规范问题**：需要修复 button 嵌套
4. **用户体验问题**：会话命名需要改进

### 优先级建议
1.   **P0 - 立即修复**：消息加载问题（Bug #1）
2.   **P0 - 立即修复**：文件编辑器问题（Bug #2）
3.   **P1 - 尽快修复**：HTML 嵌套问题（Bug #3）
4.   **P2 - 后续改进**：会话命名体验（Bug #4）

### 技术债务
- 消息存储去重重构尚未完成，需要统一 session ID
- WebSocket 在页面切换时会断开重连，需要优化

---

**报告生成者：** 小马珍珠 (Hermes Agent)  
**测试工具：** agent-browser + Chrome CDP  
