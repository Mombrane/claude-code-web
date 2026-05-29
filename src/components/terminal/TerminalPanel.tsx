import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { wsClient } from '../../api/websocket';
import '@xterm/xterm/css/xterm.css';

interface TerminalPanelProps {
  sessionId: string;
  theme?: 'dark' | 'light';
}

export function TerminalPanel({ sessionId, theme = 'dark' }: TerminalPanelProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalRef2 = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new Terminal({
      theme: {
        background: theme === 'dark' ? '#1a1b26' : '#ffffff',
        foreground: theme === 'dark' ? '#a9b1d6' : '#383a42',
        cursor: theme === 'dark' ? '#c0caf5' : '#526fff',
        selectionBackground: theme === 'dark' ? '#33467c' : '#bfceff',
        black: theme === 'dark' ? '#15161e' : '#383a42',
        red: theme === 'dark' ? '#f7768e' : '#e45649',
        green: theme === 'dark' ? '#9ece6a' : '#50a14f',
        yellow: theme === 'dark' ? '#e0af68' : '#c18401',
        blue: theme === 'dark' ? '#7aa2f7' : '#4078f2',
        magenta: theme === 'dark' ? '#bb9af7' : '#a626a4',
        cyan: theme === 'dark' ? '#7dcfff' : '#0184bc',
        white: theme === 'dark' ? '#a9b1d6' : '#a0a1a7',
        brightBlack: theme === 'dark' ? '#414868' : '#696c77',
        brightRed: theme === 'dark' ? '#f7768e' : '#e06c75',
        brightGreen: theme === 'dark' ? '#9ece6a' : '#98c379',
        brightYellow: theme === 'dark' ? '#e0af68' : '#d19a66',
        brightBlue: theme === 'dark' ? '#7aa2f7' : '#61afef',
        brightMagenta: theme === 'dark' ? '#bb9af7' : '#c678dd',
        brightCyan: theme === 'dark' ? '#7dcfff' : '#56b6c2',
        brightWhite: theme === 'dark' ? '#c0faf5' : '#ffffff',
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      tabStopWidth: 4,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(terminalRef.current);
    fitAddon.fit();

    terminalRef2.current = terminal;
    fitAddonRef.current = fitAddon;

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      // Send resize event to server
      if (terminal.cols && terminal.rows) {
        wsClient.send({
          type: 'terminal:resize',
          payload: {
            sessionId,
            cols: terminal.cols,
            rows: terminal.rows,
          },
        });
      }
    });
    resizeObserver.observe(terminalRef.current);

    // Handle terminal input
    terminal.onData((data) => {
      wsClient.send({
        type: 'terminal:input',
        payload: {
          sessionId,
          data,
        },
      });
    });

    // Start terminal session
    wsClient.send({
      type: 'terminal:start',
      payload: { sessionId },
    });

    // Handle terminal output from server
    const handleTerminalOutput = (message: any) => {
      if (message.payload?.sessionId === sessionId) {
        terminal.write(message.payload.data);
      }
    };

    const unsub = wsClient.on('terminal:output', handleTerminalOutput);
    setIsConnected(true);

    return () => {
      unsub();
      resizeObserver.disconnect();
      terminal.dispose();
      // Kill terminal session
      wsClient.send({
        type: 'terminal:kill',
        payload: { sessionId },
      });
    };
  }, [sessionId, theme]);

  const handleClear = useCallback(() => {
    const terminal = terminalRef2.current;
    if (terminal) {
      terminal.clear();
    }
  }, []);

  return (
    <div className={`flex flex-col ${isCollapsed ? 'h-10' : 'h-64'} ${
      theme === 'dark' ? 'bg-[#1a1b26] border-t border-gray-700' : 'bg-white border-t border-gray-200'
    }`}>
      <div className={`flex items-center justify-between px-4 py-2 border-b ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>Terminal</span>
          {isConnected && (
            <span className={`flex items-center gap-1 text-xs ${
              theme === 'dark' ? 'text-green-400' : 'text-green-600'
            }`}>
              <span className={`w-2 h-2 rounded-full animate-pulse ${
                theme === 'dark' ? 'bg-green-400' : 'bg-green-500'
              }`} />
              Connected
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
            }`}
          >
            Clear
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
            }`}
          >
            {isCollapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
      </div>
      {!isCollapsed && (
        <div ref={terminalRef} className="flex-1 p-2" />
      )}
    </div>
  );
}
