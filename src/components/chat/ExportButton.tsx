import type { Message, ToolExecutionContent, ToolCallContent, ToolResultContent, FileContent, PatchContent } from '../../types';
import { useI18n } from '../../i18n';
import { useToast } from '../ui/ToastProvider';

interface ExportButtonProps {
  messages: Message[];
  sessionTitle?: string;
  theme?: 'dark' | 'light';
}

/** Escape triple backticks by wrapping in 4 backticks */
function codeBlock(content: string, lang?: string): string {
  const hasTripleBackticks = content.includes('```');
  const delimiter = hasTripleBackticks ? '````' : '```';
  const langTag = lang || '';
  if (hasTripleBackticks) {
    return `${delimiter}${langTag}\n${content}\n${delimiter}`;
  }
  return `${delimiter}${langTag}\n${content}\n${delimiter}`;
}

function getContentString(content: unknown): string {
  return typeof content === 'string' ? content : JSON.stringify(content);
}

function generateMarkdown(messages: Message[], sessionTitle?: string): string {
  const title = sessionTitle || 'Untitled Session';
  const date = new Date().toISOString().split('T')[0];

  let md = `---
title: "${title}"
exported: "${date}"
---

# ${title}

`;

  for (const msg of messages) {
    switch (msg.type) {
      case 'text': {
        const textContent = getContentString(msg.content);
        if (msg.role === 'user') {
          md += `## 👤 User\n\n${textContent}\n\n`;
        } else if (msg.role === 'assistant') {
          md += `## 🤖 Assistant\n\n${textContent}\n\n`;
        }
        break;
      }

      case 'thinking': {
        const thinkingContent = getContentString(msg.content);
        md += `<details><summary>💭 Thinking</summary>\n\n${thinkingContent}\n</details>\n\n`;
        break;
      }

      case 'tool_execution': {
        const toolContent = msg.content as ToolExecutionContent;
        md += `### 🔧 Tool: ${toolContent.toolName}\n\n`;
        md += codeBlock(JSON.stringify(toolContent.input, null, 2), 'json');
        md += '\n\n';
        if (toolContent.output) {
          md += `${toolContent.output}\n\n`;
        }
        break;
      }

      case 'tool_use': {
        const callContent = msg.content as ToolCallContent;
        md += `### 🔧 Tool Call: ${callContent.toolName}\n\n`;
        md += codeBlock(JSON.stringify(callContent.input, null, 2), 'json');
        md += '\n\n';
        break;
      }

      case 'tool_result': {
        const resultContent = msg.content as ToolResultContent;
        md += `### 📋 Tool Result\n\n${resultContent.output}\n\n`;
        break;
      }

      case 'file': {
        const fileContent = msg.content as FileContent;
        const fileBody = fileContent.content || '';
        md += `### 📄 File\n\n`;
        if (fileContent.path) {
          md += `**${fileContent.path}**\n\n`;
        }
        md += `${fileBody}\n\n`;
        break;
      }

      case 'patch': {
        const patchContent = msg.content as PatchContent;
        md += `### 🔀 Patch\n\n`;
        md += codeBlock(patchContent.diff, 'diff');
        md += '\n\n';
        break;
      }

      case 'step_start':
      case 'step_finish': {
        const stepContent = getContentString(msg.content);
        md += `### ⚡ Step\n\n${stepContent}\n\n`;
        break;
      }

      case 'error': {
        const errorContent = getContentString(msg.content);
        md += `## ❌ Error\n\n${errorContent}\n\n`;
        break;
      }

      default: {
        const fallbackContent = getContentString(msg.content);
        md += `### 📝 Message\n\n${fallbackContent}\n\n`;
        break;
      }
    }
  }

  return md;
}

function downloadMarkdown(content: string, filename: string): void {
  try {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to download markdown:', err);
  }
}

export function ExportButton({ messages, sessionTitle, theme = 'dark' }: ExportButtonProps) {
  const { t } = useI18n();
  const toast = useToast();
  const handleExport = () => {
    try {
      const markdown = generateMarkdown(messages, sessionTitle);
      const safeTitle = (sessionTitle || 'session')
        .replace(/[^a-zA-Z0-9\-_ ]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase()
        .slice(0, 50);
      const date = new Date().toISOString().split('T')[0];
      const filename = `session-${safeTitle}-${date}.md`;
      downloadMarkdown(markdown, filename);
      toast.success(t('toast.exportSuccess'));
    } catch (err) {
      toast.error(t('toast.exportFailed'));
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={messages.length === 0}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
        theme === 'dark'
          ? 'text-gray-400 hover:text-white bg-gray-700/30 hover:bg-gray-700/50'
          : 'text-gray-500 hover:text-gray-700 bg-gray-200/50 hover:bg-gray-200'
      }`}
      title={t('export.markdown')}
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span>{t('export.button')}</span>
    </button>
  );
}
