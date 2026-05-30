import { create } from 'zustand';
import type { Session, Message, ToolExecutionContent } from '../types';
import { api } from '../api/client';

interface SessionState {
  sessions: Session[];
  currentSessionId: string | null;
  currentMessages: Message[];
  isLoading: boolean;
  isLoadingMessages: boolean;
  error: string | null;
  streamingSessions: Set<string>;
  errorSessions: Set<string>;
  cancelLoadMessages: (() => void) | null;

  // Session management
  setSessions: (sessions: Session[]) => void;
  addSession: (session: Session) => void;
  updateSession: (sessionId: string, updates: Partial<Session>) => void;
  removeSession: (sessionId: string) => void;
  setCurrentSession: (sessionId: string | null) => Promise<void>;

  // Message management (fetched from Claude Code's .jsonl transcripts)
  loadMessages: (sessionId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  clearMessages: () => void;

  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  markSessionStreaming: (sessionId: string) => void;
  markSessionIdle: (sessionId: string) => void;
  markSessionError: (sessionId: string) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  currentMessages: [],
  isLoading: false,
  isLoadingMessages: false,
  error: null,
  streamingSessions: new Set(),
  errorSessions: new Set(),
  cancelLoadMessages: null,

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) =>
    set((state) => ({ sessions: [session, ...state.sessions] })),

  updateSession: (sessionId, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, ...updates } : s
      ),
    })),

  removeSession: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== sessionId),
      currentSessionId:
        state.currentSessionId === sessionId ? null : state.currentSessionId,
      currentMessages:
        state.currentSessionId === sessionId ? [] : state.currentMessages,
    })),

  setCurrentSession: async (sessionId) => {
    // Cancel any in-flight message loading
    const prevCancel = get().cancelLoadMessages;
    if (prevCancel) prevCancel();

    set({
      currentSessionId: sessionId,
      currentMessages: [],
      isLoadingMessages: true,
    });

    if (sessionId) {
      let cancelled = false;
      set({ cancelLoadMessages: () => { cancelled = true; } });

      try {
        const messages = await api.getSessionMessages(sessionId);
        if (!cancelled && get().currentSessionId === sessionId) {
          set({ currentMessages: messages, isLoadingMessages: false, cancelLoadMessages: null });
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Failed to load messages:', e);
          set({ isLoadingMessages: false, cancelLoadMessages: null });
        }
      }
    } else {
      set({ isLoadingMessages: false });
    }
  },

  loadMessages: async (sessionId) => {
    set({ isLoadingMessages: true });
    try {
      const messages = await api.getSessionMessages(sessionId);
      set({ currentMessages: messages, isLoadingMessages: false });
    } catch (e) {
      console.error('Failed to load messages:', e);
      set({ isLoadingMessages: false });
    }
  },

  addMessage: (message) =>
    set((state) => {
      // Dedup: skip if message already exists by id or content similarity
      const isDuplicate = state.currentMessages.some(m => {
        if (m.id === message.id) return true;
        // Only dedup non-user messages by content
        if (message.role === 'user') return false;
        if (m.role === message.role && m.type === message.type) {
          // For text messages, compare content string
          if (m.type === 'text' && typeof m.content === 'string' && typeof message.content === 'string') {
            if (m.content === message.content) {
              const timeDiff = Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime());
              if (timeDiff < 10000) return true; // 10 second window
            }
          }
          // For tool_execution, compare toolUseId
          if (m.type === 'tool_execution' && typeof m.content === 'object' && typeof message.content === 'object') {
            const mExec = m.content as ToolExecutionContent;
            const msgExec = message.content as ToolExecutionContent;
            if (mExec.toolUseId === msgExec.toolUseId) return true;
          }
        }
        return false;
      });
      if (isDuplicate) return state;
      return { currentMessages: [...state.currentMessages, message] };
    }),

  updateMessage: (messageId, updates) =>
    set((state) => ({
      currentMessages: state.currentMessages.map((m) =>
        m.id === messageId ? { ...m, ...updates } : m
      ),
    })),

  clearMessages: () => set({ currentMessages: [] }),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  markSessionStreaming: (sessionId) =>
    set((state) => {
      const newSet = new Set(state.streamingSessions);
      newSet.add(sessionId);
      const newErrorSet = new Set(state.errorSessions);
      newErrorSet.delete(sessionId);
      return { streamingSessions: newSet, errorSessions: newErrorSet };
    }),

  markSessionIdle: (sessionId) =>
    set((state) => {
      const newSet = new Set(state.streamingSessions);
      newSet.delete(sessionId);
      const newErrorSet = new Set(state.errorSessions);
      newErrorSet.delete(sessionId);
      return { streamingSessions: newSet, errorSessions: newErrorSet };
    }),

  markSessionError: (sessionId) =>
    set((state) => {
      const newSet = new Set(state.streamingSessions);
      newSet.delete(sessionId);
      const newErrorSet = new Set(state.errorSessions);
      newErrorSet.add(sessionId);
      return { streamingSessions: newSet, errorSessions: newErrorSet };
    }),
}));
