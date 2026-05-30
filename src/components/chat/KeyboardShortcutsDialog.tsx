import { useEffect, useRef } from 'react';
import { useI18n } from '../../i18n';

interface KeyboardShortcutsDialogProps {
  onClose: () => void;
}

export function KeyboardShortcutsDialog({ onClose }: KeyboardShortcutsDialogProps) {
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
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            {t('shortcuts.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700"
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
                <tr key={idx} className="border-b border-gray-700/50 last:border-0">
                  <td className="py-2.5 pr-4">
                    <span className="text-sm text-gray-300">{shortcut.label}</span>
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <span key={keyIdx}>
                          <kbd className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded font-mono">
                            {key}
                          </kbd>
                          {keyIdx < shortcut.keys.length - 1 && (
                            <span className="text-gray-500 mx-0.5">+</span>
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
