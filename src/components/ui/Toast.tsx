import { useEffect } from 'react';

export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps extends ToastData {
  onDismiss: (id: string) => void;
  theme?: 'dark' | 'light';
}

const iconMap = {
  success: (
    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const borderMap = {
  success: 'border-l-4 border-green-500',
  error: 'border-l-4 border-red-500',
  info: 'border-l-4 border-blue-500',
};

export function Toast({ id, message, type, onDismiss, theme = 'dark' }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), 3000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg animate-slide-in-right ${borderMap[type]} ${
        theme === 'dark'
          ? 'bg-gray-800 border border-gray-700'
          : 'bg-white border border-gray-200'
      }`}
      role="alert"
    >
      {iconMap[type]}
      <span className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>{message}</span>
      <button
        onClick={() => onDismiss(id)}
        className={`ml-auto p-1 transition-colors ${
          theme === 'dark'
            ? 'text-gray-500 hover:text-gray-300'
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
