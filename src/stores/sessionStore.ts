import { create } from 'zustand';
import type { Session, Message } from '../types';
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
  
  // Streaming state
  streamingText: string;
  isStreaming: boolean;
  streamingMessageId: string | null;
  // Session management
  setSessions: (sessions: Session[]) => void;
  addSession: (session: Session) => void;
  updateSession: (sessionId: string, updates: Partial<Session>) => void;
  removeSession: (sessionId: string) => void;
  setCurrentSession: (sessionId: string | null) => Promise<void>;

  // Streaming management
  setStreamingText: (text: string) => void;
  appendStreamingText: (text: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  setStreamingMessageId: (id: string | null) => void;
  clearStreamingState: () => void;
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
  
  // Streaming state
  streamingText: '',
  isStreaming: false,
  streamingMessageId: null,

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
    set({ 
      currentSessionId: sessionId, 
      currentMessages: [],
      // 清空流式状态，防止跨会话状态泄漏
      streamingText: '',
      isStreaming: false,
      streamingMessageId: null,
    });
    if (sessionId) {
      await get().loadMessages(sessionId);
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
    set((state) => ({
      currentMessages: [...state.currentMessages, message],
    })),

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

  // Streaming state management
  setStreamingText: (text) => set({ streamingText: text }),
  
  appendStreamingText: (text) =>
    set((state) => ({ streamingText: state.streamingText + text })),
  
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  
  setStreamingMessageId: (id) => set({ streamingMessageId: id }),
  
  clearStreamingState: () =>
    set({
      streamingText: '',
      isStreaming: false,
      streamingMessageId: null,
    }),
}));
