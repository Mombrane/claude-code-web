import { useEffect, useRef } from 'react';
import { useI18n } from '../../i18n';

interface KeyboardShortcutsDialogProps {
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export function KeyboardShortcutsDialog({ onClose, theme = 'dark' }: KeyboardShortcutsDialogProps) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const shortcuts = [
    { keys: ['Ctrl', 'N'], label: t('shortcuts.newSession') },
    { keys: ['Ctrl', 'K'], label: t('shortcuts.commandPalette') },
    { keys: ['Ctrl', 'F'], label: t('shortcuts.search') },
    { keys: ['Ctrl', '/'], label: t('shortcuts.showShortcuts') },
    { keys: ['Ctrl', ','], label: t('shortcuts.settings') },
    { keys: ['Ctrl', 'Shift', 'T'], label: t('shortcuts.toggleTheme') },
    { keys: ['Ctrl', '↑'], label: t('shortcuts.prevSession') },
    { keys: ['Ctrl', '↓'], label: t('shortcuts.nextSession') },
    { keys: ['Enter'], label: t('shortcuts.sendMessage') },
    { keys: ['Shift', 'Enter'], label: t('shortcuts.newLine') },
    { keys: ['Escape'], label: t('shortcuts.close') },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className={`border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}
      >
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            {t('shortcuts.title')}
          </h2>
          <button
            onClick={onClose}
            className={`transition-colors p-1 rounded ${
              theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4">
          <table className="w-full">
            <tbody>
              {shortcuts.map((shortcut, idx) => (
                <tr key={idx} className={`border-b last:border-0 ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'}`}>
                  <td className="py-2.5 pr-4">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{shortcut.label}</span>
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <span key={keyIdx}>
                          <kbd className={`px-2 py-1 text-xs rounded font-mono ${
                            theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {key}
                          </kbd>
                          {keyIdx < shortcut.keys.length - 1 && (
                            <span className={`mx-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
