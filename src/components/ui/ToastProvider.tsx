import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Toast, type ToastData } from './Toast';

interface ToastContextType {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastIdCounter = 0;

const MAX_TOASTS = 5;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((message: string, type: ToastData['type']) => {
    const id = `toast-${++toastIdCounter}`;
    setToasts(prev => {
      const next = [...prev, { id, message, type }];
      // Keep only the last MAX_TOASTS
      if (next.length > MAX_TOASTS) {
        return next.slice(next.length - MAX_TOASTS);
      }
      return next;
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: useCallback((message: string) => addToast(message, 'success'), [addToast]),
    error: useCallback((message: string) => addToast(message, 'error'), [addToast]),
    info: useCallback((message: string) => addToast(message, 'info'), [addToast]),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container - fixed bottom-right */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
          {toasts.map(t => (
            <Toast
              key={t.id}
              id={t.id}
              message={t.message}
              type={t.type}
              onDismiss={dismissToast}
            />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
}
